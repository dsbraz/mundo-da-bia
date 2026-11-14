import { lying, sitting } from './posture';
import type { Actor, Point } from '../domain/types';
import { isAdult } from '../domain/family';
export type VisualContext = 'interior' | 'street';
export const contextScale = (context: VisualContext = 'interior') => context === 'street' ? .6 : 1;
export const visualContext = (world: { streetWidth?: number }): VisualContext => world.streetWidth ? 'street' : 'interior';
export const actorScale = (actor: Actor, context: VisualContext = 'interior') => (actor.kind === 'cat' ? .78 : .86) * contextScale(context);
/** The drawing's height: a cat, a child, a parent 1.3× a child (W3L-24, §3.6; lot 6B: clearly adult-sized) and Laura, 18, 1.2× (lot 8B:
 *  the grown-ups' sheet at its own size). */
export const figureHeight = (actor: Pick<Actor, 'id' | 'kind'>) => actor.kind === 'cat' ? 120 : actor.id === 'laura' ? 264 : isAdult(actor.id) ? 286 : 220;
/** The art's own canvas height (svg units, 140 wide): a grown-up's sheet (`adult.svg`) is 264 tall. */
export const artHeight = (actor: Pick<Actor, 'id' | 'kind'>) => actor.kind === 'cat' ? 120 : isAdult(actor.id) ? 264 : 220;
/** The drawing's width: the art grows whole, never stretched. */
export const figureWidth = (actor: Pick<Actor, 'id' | 'kind'>) => 140 * figureHeight(actor) / artHeight(actor);
/** How far above the feet the action ring starts (scene units before the context scale): above the head, the name tag, the star and the
 *  line said over them (lot 6B). */
export const ringClearance = (actor: Pick<Actor, 'id' | 'kind'>) => actor.kind === 'cat' ? 170 : 104 + figureHeight(actor);
/** How much taller than a child's drawing: every height measured on a child's figure (knees, hand, seat, head) scales by it. */
export const stature = (actor: Pick<Actor, 'id' | 'kind'>) => actor.kind === 'cat' ? 1 : figureHeight(actor) / 220;
/** How far the body sinks into a seat: a grown-up's longer thighs take it lower (in proportion to its height), so the hips rest on the
 *  cushion. */
export const seatDrop = (actor: Pick<Actor, 'id' | 'kind'>) => isAdult(actor.id) ? 22 + 24 * (figureHeight(actor) - 220) / 66 : 22;
/** A grown-up lying in bed is drawn that much toward the foot of the bed, so the head rests on the pillow where a child's does. */
export const lyingShift = (actor: Actor) => lying(actor) ? (figureHeight(actor) - 220) * actorScale(actor) : 0;
export function posePoint(actor: Actor, point: Point, context: VisualContext = 'interior'): Point {
  const scale = actorScale(actor, context), angle = lying(actor) ? -Math.PI / 2 : 0;
  const y = sitting(actor) ? seatDrop(actor) : 0;
  return { x: actor.x + lyingShift(actor) + (point.x * Math.cos(angle) - point.y * Math.sin(angle)) * scale,
    y: actor.y + (point.x * Math.sin(angle) + point.y * Math.cos(angle) + y) * scale };
}
/** Where a held thing is (pose units): on the lap when seated; standing, a child's beside its hand, a grown-up's in its drawn right hand
 *  (lot 8B: column 103, row 182.5 of `adult.svg`). */
export function handAnchor(actor: Actor): Point {
  const scale = actorScale(actor), tall = stature(actor), k = figureHeight(actor) / artHeight(actor);
  if (sitting(actor)) return { x: 0, y: -38 / scale * tall - seatDrop(actor) };
  return isAdult(actor.id) ? { x: (103 - 70) * k, y: -(artHeight(actor) - 182.5) * k } : { x: 28 / scale, y: -55 / scale * tall };
}
/** A grown-up's raised right hand (pose units, column 115, row 51.5 of `adult.svg`): what it holds goes up with it. */
export const raisedHand = (actor: Pick<Actor, 'id' | 'kind'>): Point => {
  const k = figureHeight(actor) / artHeight(actor);
  return { x: (115 - 70) * k, y: -(artHeight(actor) - 51.5) * k };
};
export function settlePose(current: number, target: number, reduced: boolean) {
  return reduced || Math.abs(target - current) < .001 ? target : current + (target - current) * .18;
}
