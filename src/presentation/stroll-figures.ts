import type Phaser from 'phaser';
import type { Actor, ActorId, Point, World } from '../domain/types';
import { actorDepth } from './piece-art';
import { reducedMotion } from './motion';
import { stroll, strollAt, type Stroll } from './stroll';

/** Short walks drawn over repaints (the save already holds where they end), e.g. bystanders stepping off the hopscotch board.
 *  `canvas.dataset.strolling` lists who is still walking. */
export function strollFigures(canvas: () => HTMLCanvasElement) {
  const strolls = new Map<ActorId, Stroll>();
  const mark = () => { canvas().dataset.strolling = [...strolls.keys()].join(' '); };
  return {
    /** From where each figure is drawn now; call it before committing the moves. */
    start(figures: Phaser.GameObjects.Container[], moves: { actor: ActorId; point: Point }[]) {
      const now = performance.now();
      for (const m of moves) { const f = figures.find(f => f.name === m.actor); if (f) strolls.set(m.actor, stroll({ x: f.x, y: f.y }, m.point, now, reducedMotion())); }
      mark();
    },
    /** Draws this frame of the actor's walk, if it has one; true while it walks (the caller poses the legs). */
    step(figure: Phaser.GameObjects.Container, actor: Actor, world: World): boolean {
      const step = strolls.get(actor.id); if (!step) return false;
      const at = strollAt(step, performance.now());
      figure.setPosition(at.point.x, at.point.y).setDepth(actorDepth(world, { ...actor, ...at.point, seat: null })).setAlpha(at.alpha).setData('distance', at.walked).setData('direction', at.direction);
      if (at.done) { strolls.delete(actor.id); mark(); }
      return true;
    },
    /** Walks end when the view goes to another place. */
    leave(from: World, to: World) { if (strolls.size && (from.room !== to.room || !!from.streetWidth !== !!to.streetWidth)) { strolls.clear(); mark(); } },
  };
}
