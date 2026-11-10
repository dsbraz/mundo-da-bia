import type Phaser from 'phaser';
import type { ItemId, Point, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { itemKind } from '../domain/item-kind';
import { floorTop } from './floor-band';
import { contextScale, visualContext } from './pose';
import { kick, resting, rollStep, rollToRest, type Ball, type Floor } from './ball-motion';

const floorOf = (world: World): Floor => ({ left: 60, right: roomWidth(world) - 60, top: floorTop(world), bottom: 540 });
/** Rolling balls, kept over repaints and drawn over their saved spot; `rest` commits the one `place` when each stops.
 *  `canvas.dataset.rolling` lists the balls in motion. */
export function ballRolls(canvas: () => HTMLCanvasElement, rest: (id: ItemId, point: Point) => void) {
  const rolls = new Map<ItemId, { ball: Ball; last: number }>();
  const mark = () => { const ids = [...rolls.keys()].join(' '); if (canvas().dataset.rolling !== ids) canvas().dataset.rolling = ids; };
  const stop = (id: ItemId, ball: Ball) => { rolls.delete(id); mark(); rest(id, { x: ball.x, y: ball.y }); };
  return {
    /** Let go with the finger's speed from `from` (the floor point under it); with reduced motion it is placed at once where it would stop. */
    throw(id: ItemId, from: Point, velocity: Point, world: World, now: number, reduced: boolean) {
      const ball = { ...from, vx: velocity.x, vy: velocity.y, spin: 0 };
      if (reduced) { const end = rollToRest(ball, floorOf(world)); rest(id, { x: end.x, y: end.y }); return; }
      rolls.set(id, { ball, last: now }); mark();
    },
    /** One frame: a commanded `walker` close by kicks a resting ball; each ball rolls, is drawn and, once still, placed. */
    step(world: World, objects: Phaser.GameObjects.Image[], walker: { x: number; y: number; direction: number } | null, now: number) {
      const scale = contextScale(visualContext(world)), lift = 28 * scale;
      if (walker) world.items.filter(i => itemKind(i) === 'bola' && !i.holder && i.spot === 'floor' && !rolls.has(i.id) && objects.some(o => o.name === i.id)).forEach(i => {
        const kicked = kick(i, walker, scale); if (kicked) { rolls.set(i.id, { ball: kicked, last: now }); mark(); }
      });
      for (const [id, roll] of rolls) {
        roll.ball = rollStep(roll.ball, Math.min(100, Math.max(0, now - roll.last)), floorOf(world)); roll.last = now;
        objects.find(o => o.name === id)?.setPosition(roll.ball.x, roll.ball.y - lift).setRotation(roll.ball.spin);
        if (resting(roll.ball)) stop(id, roll.ball);
      }
    },
    /** Commits where every rolling ball is now: before leaving the place or the page. */
    settle() { for (const [id, roll] of rolls) stop(id, roll.ball); },
    /** The ball was taken (picked up, given, put away): its roll ends without a place. */
    forget(id: ItemId) { if (rolls.delete(id)) mark(); },
  };
}
