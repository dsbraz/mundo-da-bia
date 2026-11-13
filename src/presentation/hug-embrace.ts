import type Phaser from 'phaser';
import type { Actor, Point } from '../domain/types';
import { actors } from '../content/catalog';
import { actorScale, artHeight, figureHeight } from './pose';
import { hex } from './palette';
import { reducedMotion } from './motion';

/** How close the two drawn bodies come in a hug (scene units between the feet): close enough to overlap. */
export const hugGap = 34;
/** How long the two hold the hug (ms). */
export const hugMs = 1300;
/** How far `a` leans toward `b` (signed, scene units): half of what separates them from `hugGap`, so both meet in the middle. */
export function hugLean(a: Point, b: Point): number {
  return Math.max(0, (Math.abs(b.x - a.x) - hugGap) / 2) * Math.sign(b.x - a.x);
}
/** The shoulder line of `actor` above its feet (scene units): the arms start at row 102 of a person's sheet; a cat's back is 60 up. */
export const shoulder = (actor: Actor) => (actor.kind === 'cat' ? 60 : (artHeight(actor) - 102) * figureHeight(actor) / artHeight(actor)) * actorScale(actor);
/** The arm `from` puts around `to` (both already leaning in): from its near shoulder over the other's shoulders to a hand on the far side. */
export function armAround(from: Actor, to: Actor, leanFrom: number, leanTo: number) {
  const side = Math.sign(to.x - from.x) || 1, start = { x: from.x + leanFrom + side * 16, y: from.y - shoulder(from) + 6 };
  const hand = { x: to.x + leanTo + side * 26, y: to.y - shoulder(to) + 14 };
  return { start, bend: { x: (start.x + hand.x) / 2, y: Math.min(start.y, hand.y) - 14 }, hand };
}
type Figure = Phaser.GameObjects.Container;
const skin = (actor: Actor) => actors[actor.id].skin;
/** The arm's curve as points (a quadratic from the shoulder over the bend to the hand). */
export function armPoints(arm: ReturnType<typeof armAround>, steps = 12): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, u = 1 - t;
    return { x: u * u * arm.start.x + 2 * u * t * arm.bend.x + t * t * arm.hand.x, y: u * u * arm.start.y + 2 * u * t * arm.bend.y + t * t * arm.hand.y };
  });
}
/** Draws one arm: the outline under the skin, then the hand. */
function drawArm(g: Phaser.GameObjects.Graphics, arm: ReturnType<typeof armAround>, color: number, scale: number) {
  const points = armPoints(arm);
  g.lineStyle(15 * scale, hex('actorOutline')).strokePoints(points);
  g.lineStyle(12 * scale, color).strokePoints(points);
  g.fillStyle(color).fillCircle(arm.hand.x, arm.hand.y, 8 * scale).lineStyle(1.5, hex('actorOutline')).strokeCircle(arm.hand.x, arm.hand.y, 8 * scale);
}
/** A real hug (lot 6B): `a` (who came) and `b` lean in until their bodies overlap, `a` in front with an arm around `b`'s shoulders and
 *  `b`'s hand showing on `a`'s far side; the arms that hug are not left hanging. Held `hugMs`, then both step back to where they stand.
 *  With reduced motion they meet and part without sliding. `canvas.dataset.embrace` (automation) names `a:b:gap` while it lasts. */
export function embrace(scene: Phaser.Scene, figures: readonly Figure[], a: Actor, b: Actor) {
  const fa = figures.find(f => f.name === a.id), fb = figures.find(f => f.name === b.id);
  if (!fa || !fb) return;
  const lean = { a: hugLean(a, b), b: hugLean(b, a) }, reduced = reducedMotion(), depth = fa.depth;
  fa.setDepth(Math.max(fa.depth, fb.depth) + .5).setData('hugSide', Math.sign(b.x - a.x) || 1);
  fb.setData('hugSide', Math.sign(a.x - b.x) || -1);
  const arms = scene.add.graphics().setDepth(fa.depth + .1).setVisible(false), scale = actorScale(a) / .86;
  // A cat hugs without arms: only a person's arm or hand is drawn.
  if (a.kind === 'human') drawArm(arms, armAround(a, b, lean.a, lean.b), skin(a), scale);
  const back = { x: a.x + lean.a + Math.sign(a.x - b.x) * 30, y: a.y - shoulder(a) + 54 * scale };
  if (b.kind === 'human' && a.kind === 'human') arms.fillStyle(skin(b)).fillCircle(back.x, back.y, 8 * scale).lineStyle(1.5, hex('actorOutline')).strokeCircle(back.x, back.y, 8 * scale);
  const set = (t: number) => { fa.setData('lean', lean.a * t); fb.setData('lean', lean.b * t); arms.setVisible(t > .7); };
  const done = () => { set(0); fa.setDepth(depth).setData('hugSide', 0); fb.setData('hugSide', 0); arms.destroy(); if (navigator.webdriver) scene.game.canvas.dataset.embrace = ''; };
  if (navigator.webdriver) scene.game.canvas.dataset.embrace = `${a.id}:${b.id}:${Math.round(Math.abs(b.x + lean.b - a.x - lean.a))}`;
  if (reduced) { set(1); scene.time.delayedCall(hugMs, done); return; }
  const step = { t: 0 };
  scene.tweens.add({ targets: step, t: 1, duration: 200, ease: 'Sine.Out', onUpdate: () => set(step.t), onComplete: () => {
    scene.tweens.add({ targets: step, t: 0, delay: hugMs - 400, duration: 200, ease: 'Sine.In', onUpdate: () => set(step.t), onComplete: done });
  } });
}
