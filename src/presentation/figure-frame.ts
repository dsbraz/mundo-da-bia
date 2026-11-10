import type Phaser from 'phaser';
import type { Actor, ActorId, World } from '../domain/types';
import type { Neighborhood } from '../domain/neighborhood-types';
import { animateActor, gazePose, walkPose } from './art';
import { contextScale, handAnchor, visualContext } from './pose';
import { glanceDirection, lifePose } from './life-pose';
import { expressionOf, type Expression, type faces } from './expression';
import type { weightFigures } from './weight-figures';

type Container = Phaser.GameObjects.Container;
/** What one frame of a figure needs from the scene. */
export interface FrameContext {
  world: World; town: Neighborhood | null; moving: ActorId | null; gaze: Map<ActorId, number>;
  objects: Phaser.GameObjects.Image[];
  /** The plaza swing this frame (from `swing-motion`): its angle and how the rider's legs stretch (-1..1). */
  swing: { angle: number; legs: number };
  /** Short expressions from events, and the performance clock they are timed by. */
  faces: ReturnType<typeof faces>; now: number;
  walking: (figure: Container, actor: Actor) => boolean;
  /** Collects the ambient behaviours shown this frame. */
  life: { mark: (names: string[]) => void };
  /** Collects `id:gait` for every figure that walks, trots or is carried this frame (the scene's `data-gait`). */
  gaits: string[];
  /** Carried by the finger or just let go. */
  weight: ReturnType<typeof weightFigures>;
}
/** Blinks keep their real rhythm also with reduced motion (the only idle motion left there). */
export const blinking = (time: number, index: number) => (time + index * 530) % 3900 < 130;
/** Poses one figure for this frame: face, seat, walk or gaze, ambient life, the swing and whatever it holds; returns the expression shown. */
export function animateFigure(ctx: FrameContext, figure: Container, actor: Actor, time: number, index: number, reduced: boolean): Expression {
  const { walking, seated, posed } = posture(ctx, figure, actor);
  const face = faceFrame(ctx, actor, posed, walking, time, index, reduced);
  animateActor(figure, posed, reduced ? 500 : time, index, !reduced && ctx.world.show, reduced, face);
  const pose = figure.getByName<Container>('pose');
  if (!walking) gazePose(figure, face.look);
  ctx.life.mark([...(face.blinked ? ['blink'] : []), ...(face.glance ? ['glance'] : []), ...lifePose(pose, posed, time, reduced, !walking && !seated)]);
  moveLayers(ctx, figure, actor, walking, reduced);
  animateSwing(ctx, pose, actor);
  const hand = handAnchor(posed), p = pose.getWorldTransformMatrix().transformPoint(hand.x, hand.y);
  ctx.world.items.filter(i => i.holder === actor.id).forEach(i => ctx.objects.find(o => o.name === i.id)?.setPosition(p.x, p.y).setRotation(pose.rotation));
  return face.expression;
}
/** Carried, just let go, walking or trotting: layers it on the pose and lists it in `ctx.gaits`. */
function moveLayers(ctx: FrameContext, figure: Container, actor: Actor, walking: boolean, reduced: boolean) {
  const scale = contextScale(visualContext(ctx.world)), held = ctx.weight.pose(figure.getByName<Container>('pose'), actor, ctx.now, scale, reduced);
  if (walking) walkPose(figure, actor, scale, reduced);
  if (walking && actor.kind === 'cat') trotFrame(figure, actor.id);
  const gait = held || (walking ? (actor.kind === 'cat' ? 'trot' : 'walk') : '');
  if (gait) ctx.gaits.push(`${actor.id}:${gait}`);
}
/** The trot as drawn this frame, `id:bob:tail base:tail tip` (px and rad), on the canvas's `data-trot`. */
function trotFrame(figure: Container, id: ActorId) {
  const pose = figure.getByName<Container>('pose'), tail = pose.getByName<Container>('tail');
  const tip = tail.getByName<Phaser.GameObjects.Image>('tail-tip');
  figure.scene.game.canvas.dataset.trot = [id, -pose.y, tail.rotation, tip.rotation].map(v => typeof v === 'number' ? (v + 0).toFixed(2) : v).join(':');
}
/** Seated on plaza equipment, walking, carried (drawn standing, never walking) or as saved. */
export function posture(ctx: FrameContext, figure: Container, actor: Actor) {
  const seated = [ctx.town?.outdoor.bench, ctx.town?.outdoor.swing].includes(actor.id), walking = ctx.walking(figure, actor);
  // Carried by the finger (never walking) or walking, the character is drawn standing and awake.
  const standing = walking || ctx.weight.carrying(actor.id);
  const posed: Actor = standing ? { ...actor, seat: null, resting: false } : seated ? { ...actor, seat: 'armchair' } : actor;
  return { walking, seated, posed };
}
/** The expression (events first, a glance makes it curious), the blink and where the eyes look. */
function faceFrame(ctx: FrameContext, actor: Actor, posed: Actor, walking: boolean, time: number, index: number, reduced: boolean) {
  const looked = ctx.gaze.get(actor.id) ?? 0, glance = walking || looked ? 0 : glanceDirection(ctx.world, actor, time, reduced);
  const expression = expressionOf({ ...posed, show: ctx.world.show }, ctx.faces.of(actor.id, ctx.now) ?? (glance ? 'curious' : null));
  const blink = blinking(time, index);
  // Asleep, the eyes stay shut; `blinked` is only the blink itself.
  return { expression, blink: posed.resting || blink, blinked: blink, glance, look: looked || glance };
}
function animateSwing(ctx: FrameContext, pose: Container, actor: Actor) {
  if (ctx.town?.outdoor.swing !== actor.id || ctx.moving === actor.id) return;
  const { angle, legs } = ctx.swing, knees = pose.getByName<Container>('knees');
  knees?.setRotation(knees.rotation - .3 * legs);
  pose.x = -Math.sin(angle) * 126;
  pose.y += (Math.cos(angle) - 1) * 126;
  pose.rotation = angle;
}
