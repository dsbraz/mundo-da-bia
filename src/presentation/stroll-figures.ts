import type Phaser from 'phaser';
import type { Actor, ActorId, Point, World } from '../domain/types';
import { actorDepth } from './piece-art';
import { reducedMotion } from './motion';
import { climb, stroll, strollAt, type Stroll } from './stroll';

/** Short walks drawn over repaints (the save already holds where they end), e.g. bystanders stepping off the hopscotch board.
 *  `canvas.dataset.strolling` lists who is still walking; `strolled`, who set off in the latest call. */
export function strollFigures(canvas: () => HTMLCanvasElement) {
  const strolls = new Map<ActorId, Stroll>();
  let last = new Map<ActorId, Point>();
  const mark = () => { canvas().dataset.strolling = [...strolls.keys()].join(' '); };
  return {
    /** From where each figure is drawn now; call it before committing the moves. */
    start(figures: Phaser.GameObjects.Container[], moves: { actor: ActorId; point: Point }[]) {
      const now = performance.now();
      for (const m of moves) { const f = figures.find(f => f.name === m.actor); if (f) strolls.set(m.actor, stroll({ x: f.x, y: f.y }, m.point, now, reducedMotion())); }
      canvas().dataset.strolled = moves.filter(m => strolls.has(m.actor)).map(m => m.actor).join(' '); mark();
    },
    /** Someone who just came through a door walks out of its doorway `from` to where they are drawn (the save already holds it). */
    emerge(figures: Phaser.GameObjects.Container[], id: ActorId, from: Point) {
      const f = figures.find(f => f.name === id); if (!f) return;
      strolls.set(id, stroll(from, { x: f.x, y: f.y }, performance.now(), reducedMotion())); canvas().dataset.strolled = id; mark();
    },
    /** Getting on plaza equipment: a 260 ms hop from where they stood before the latest repaint to `to`.
     *  `canvas.dataset.climb` names who is in the air. */
    climb(id: ActorId, to: Point) {
      const from = last.get(id); if (!from || (from.x === to.x && from.y === to.y)) return;
      strolls.set(id, climb(from, to, performance.now(), reducedMotion())); canvas().dataset.climb = id; mark();
    },
    /** Draws this frame of the actor's walk, if it has one; true while it walks (the caller poses the legs). */
    step(figure: Phaser.GameObjects.Container, actor: Actor, world: World): boolean {
      const step = strolls.get(actor.id); if (!step) return false;
      const at = strollAt(step, performance.now());
      figure.setPosition(at.point.x, at.point.y).setDepth(actorDepth(world, { ...actor, ...at.point, seat: null })).setAlpha(at.alpha).setData('distance', at.walked).setData('direction', at.direction);
      if (at.done) { strolls.delete(actor.id); mark(); if (canvas().dataset.climb === actor.id) canvas().dataset.climb = ''; }
      return true;
    },
    /** Walks end when the view goes to another place; where everyone stood is kept for a climb. */
    leave(from: World, to: World) { last = new Map(from.actors.map(a => [a.id, { x: a.x, y: a.y }])); if (strolls.size && (from.room !== to.room || !!from.streetWidth !== !!to.streetWidth)) { strolls.clear(); mark(); } },
  };
}
