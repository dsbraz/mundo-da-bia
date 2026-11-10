import type Phaser from 'phaser';
import type { Actor, ActorId, World } from '../domain/types';
import type { Neighborhood } from '../domain/neighborhood-types';
import { animateActor, gazePose, walkPose } from './art';
import { handAnchor } from './pose';
import { expressionOf, type Expression, type faces } from './expression';

type Container = Phaser.GameObjects.Container;
/** What one frame of a figure needs from the scene. */
export interface FrameContext {
  world: World; town: Neighborhood | null; moving: ActorId | null; gaze: Map<ActorId, number>;
  objects: Phaser.GameObjects.Image[]; swingRig: () => Container | null;
  /** Short expressions from events, and the performance clock they are timed by. */
  faces: ReturnType<typeof faces>; now: number;
  walking: (figure: Container, actor: Actor) => boolean;
}
/** Blinks keep their real rhythm also with reduced motion (the only idle motion left there). */
export const blinking = (time: number, index: number) => (time + index * 530) % 3900 < 130;
/** Poses one figure for this frame: face, seat, walk or gaze, the swing and whatever it holds; returns the expression shown. */
export function animateFigure(ctx: FrameContext, figure: Container, actor: Actor, time: number, index: number, reduced: boolean): Expression {
  const seated = [ctx.town?.outdoor.bench, ctx.town?.outdoor.swing].includes(actor.id);
  const walking = ctx.walking(figure, actor);
  const posed = walking ? { ...actor, seat: null, resting: false } : seated ? { ...actor, seat: 'armchair' as const } : actor;
  const expression = expressionOf({ ...posed, show: ctx.world.show }, ctx.faces.of(actor.id, ctx.now));
  animateActor(figure, posed, reduced ? 500 : time, index, !reduced && ctx.world.show, reduced, { expression, blink: blinking(time, index) });
  const pose = figure.getByName<Container>('pose');
  if (walking) walkPose(figure, figure.getData('distance') ?? 0, reduced, figure.getData('direction'));
  else gazePose(figure, ctx.gaze.get(actor.id) ?? 0);
  animateSwing(ctx, pose, actor, time, reduced);
  const hand = handAnchor(posed), p = pose.getWorldTransformMatrix().transformPoint(hand.x, hand.y);
  ctx.world.items.filter(i => i.holder === actor.id).forEach(i => ctx.objects.find(o => o.name === i.id)?.setPosition(p.x, p.y).setRotation(pose.rotation));
  return expression;
}
function animateSwing(ctx: FrameContext, pose: Container, actor: Actor, time: number, reduced: boolean) {
  if (ctx.town?.outdoor.swing !== actor.id || ctx.moving === actor.id) return;
  const angle = reduced ? 0 : Math.sin(time / 600) * .08;
  ctx.swingRig()?.setRotation(angle);
  pose.x = -Math.sin(angle) * 126;
  pose.y += (Math.cos(angle) - 1) * 126;
  pose.rotation = angle;
}
