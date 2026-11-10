import type Phaser from 'phaser';
import type { Actor, ActorId, World } from '../domain/types';
import type { Neighborhood } from '../domain/neighborhood-types';
import { animateActor, gazePose, walkPose } from './art';
import { handAnchor } from './pose';

type Container = Phaser.GameObjects.Container;
/** What one frame of a figure needs from the scene. */
export interface FrameContext {
  world: World; town: Neighborhood | null; moving: ActorId | null; gaze: Map<ActorId, number>;
  objects: Phaser.GameObjects.Image[]; swingRig: () => Container | null;
  walking: (figure: Container, actor: Actor) => boolean;
}
/** Poses one figure for this frame: seat, walk or gaze, the swing and whatever it holds. */
export function animateFigure(ctx: FrameContext, figure: Container, actor: Actor, time: number, index: number, reduced: boolean) {
  const seated = [ctx.town?.outdoor.bench, ctx.town?.outdoor.swing].includes(actor.id);
  const walking = ctx.walking(figure, actor);
  const posed = walking ? { ...actor, seat: null, resting: false } : seated ? { ...actor, seat: 'armchair' as const } : actor;
  animateActor(figure, posed, reduced ? 500 : time, index, !reduced && ctx.world.show, reduced);
  const pose = figure.getByName<Container>('pose');
  if (walking) walkPose(figure, figure.getData('distance') ?? 0, reduced, figure.getData('direction'));
  else gazePose(figure, ctx.gaze.get(actor.id) ?? 0);
  animateSwing(ctx, pose, actor, time, reduced);
  const hand = handAnchor(posed), p = pose.getWorldTransformMatrix().transformPoint(hand.x, hand.y);
  ctx.world.items.filter(i => i.holder === actor.id).forEach(i => ctx.objects.find(o => o.name === i.id)?.setPosition(p.x, p.y).setRotation(pose.rotation));
}
function animateSwing(ctx: FrameContext, pose: Container, actor: Actor, time: number, reduced: boolean) {
  if (ctx.town?.outdoor.swing !== actor.id || ctx.moving === actor.id) return;
  const angle = reduced ? 0 : Math.sin(time / 600) * .08;
  ctx.swingRig()?.setRotation(angle);
  pose.x = -Math.sin(angle) * 126;
  pose.y += (Math.cos(angle) - 1) * 126;
  pose.rotation = angle;
}
