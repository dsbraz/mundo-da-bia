import type Phaser from 'phaser';
import type { Actor, ActorId, World } from '../domain/types';
import { actorDepth } from './piece-art';
import { favoriteSpot, idleClock, idleMs, wanderAt, type Wander } from './idle-life';

/** The scene's ambient life over repaints: the idle clock, the cat stroll to its favourite piece (drawn only: the save never changes)
 *  and the list of micro behaviours shown this frame, written to `canvas.dataset.idle` when it changes. */
export function ambientLife(canvas: () => HTMLCanvasElement) {
  const clock = idleClock();
  let wander: Wander | null = null, shown = new Set<string>();
  function recall(now: number) { if (wander && !wander.recall) wander = { ...wander, recall: { from: wanderAt(wander, now).point, start: now } }; }
  return {
    /** Any touch or key: the idle time starts over and a strolling cat heads home. */
    input(now: number) { clock.reset(); recall(now); },
    /** A repaint: a cat moved by the child forgets its stroll; otherwise it walks home from where it is drawn. */
    painted(world: World, now: number) {
      clock.reset();
      const home = wander && world.actors.find(a => a.id === wander!.actor);
      if (!home || home.room !== world.room || home.x !== wander!.home.x || home.y !== wander!.home.y) wander = null; else recall(now);
    },
    /** Once 20 s pass without a touch (and nothing else is going on), a cat that is not selected strolls to its favourite piece. */
    tick(world: World, selected: ActorId, now: number, calm: boolean) {
      if (clock.tick(now) < idleMs || wander || !calm || world.streetWidth) return;
      const cat = world.actors.find(a => a.kind === 'cat' && a.room === world.room && a.id !== selected && !a.resting && !a.seat && favoriteSpot(world, a.id));
      if (cat) wander = { actor: cat.id, home: { x: cat.x, y: cat.y }, target: favoriteSpot(world, cat.id)!, start: now };
    },
    /** Draws the strolling cat; true while it walks (the caller poses the steps). */
    step(figure: Phaser.GameObjects.Container, actor: Actor, world: World, now: number): boolean {
      if (wander?.actor !== actor.id) return false;
      const at = wanderAt(wander, now);
      figure.setPosition(at.point.x, at.point.y).setDepth(actorDepth(world, { ...actor, ...at.point, seat: null })).setData('distance', at.walked).setData('direction', at.direction);
      if (at.phase === 'done') { wander = null; clock.reset(); }
      shown.add('wander');
      return at.phase === 'go' || at.phase === 'back';
    },
    mark(names: string[]) { names.forEach(name => shown.add(name)); },
    flush() {
      const list = [...shown].sort().join(' '); shown = new Set();
      if (canvas().dataset.idle !== list) canvas().dataset.idle = list;
    },
  };
}
