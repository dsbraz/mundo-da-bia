import type Phaser from 'phaser';
import type { Actor, ActorId, Point, World } from '../domain/types';
import { supportedActor } from './furniture-scale';
import { contextScale, visualContext } from './pose';
import { actorLabel, drawActor } from './art';
import { drawSelection } from './selection-art';
import { actorDepth } from './piece-art';
import { handPoint } from './targets';
import { trackSteps } from './scene-life';
import { pokeFigure } from './feedback';
import { pokeFace, type faces } from './expression';
import type { weightFigures } from './weight-figures';
import type { ReactionPose } from '../content/personalities';

type Figure = Phaser.GameObjects.Container;
/** The characters of the current room, the selected one with its ring, each at its depth. */
export function drawFigures(scene: Phaser.Scene, state: World, selected: ActorId): Figure[] {
  return state.actors.filter(a => a.room === state.room).map(a => drawActor(scene, supportedActor(state, a), a.id === selected, visualContext(state)).setDepth(actorDepth(state, a)));
}
export interface FigureState {
  scene: Phaser.Scene; world: World; figures: Figure[]; objects: Phaser.GameObjects.Image[]; gaze: Map<ActorId, number>;
  weight: ReturnType<typeof weightFigures>; moving: ActorId | null;
}
/** Moves `id`'s figure (and what it holds) to `point`, carried by the finger or walking; without `point` it goes back to its place.
 *  Returns who is moving now. */
export function moveFigure(s: FigureState, id: ActorId | null, point: Point | null, carried: boolean): ActorId | null {
  s.weight.follow(id, point, carried, performance.now());
  const active = id ?? s.moving; if (!active) return s.moving;
  const actor = s.world.actors.find(a => a.id === active)!;
  const destination = point ?? supportedActor(s.world, actor);
  const preview = point ? { ...actor, ...point, seat: null } : actor;
  const depth = actorDepth(s.world, preview);
  const figure = s.figures.find(f => f.name === active);
  if (figure) s.scene.tweens.killTweensOf(figure);
  trackSteps(figure, carried ? null : point, s.gaze);
  figure?.setPosition(destination.x, destination.y).setDepth(depth);
  const data = s.scene.game.canvas.dataset;
  data.walking = id ?? ''; data.walkX = String(destination.x); data.walkY = String(destination.y);
  s.world.items.filter(i => i.holder === active).forEach(item => {
    const p = handPoint(preview, visualContext(s.world));
    s.objects.find(o => o.name === item.id)?.setPosition(p.x, p.y).setDepth(depth + 2);
  });
  return id;
}
/** A poke: the face and the hop of `id`, with an optional line. */
export function pokeActor(s: Pick<FigureState, 'scene' | 'world' | 'figures'>, expressions: ReturnType<typeof faces>, id: ActorId, pose: ReactionPose, line: string) {
  expressions.trigger(id, pokeFace(pose), performance.now(), 900);
  const figure = s.figures.find(f => f.name === id), actor = s.world.actors.find(a => a.id === id);
  if (figure && actor) pokeFigure(s.scene, figure, pose, line, (actor.kind === 'cat' ? 100 : 196) * contextScale(visualContext(s.world)));
}
/** Something is missing: `id` shrugs (curious face, palms up) and the point just above its head is returned for the bubble. */
export function shrugActor(s: Pick<FigureState, 'scene' | 'world' | 'figures'>, expressions: ReturnType<typeof faces>, id: ActorId): Point | null {
  pokeActor(s, expressions, id, 'shrug', '');
  const figure = s.figures.find(f => f.name === id); if (!figure) return null;
  const head = figure.getBounds(); return { x: head.centerX, y: head.top - 6 };
}
/** The ring under the character a drag would reach. */
export function ringTarget(hint: Phaser.GameObjects.Graphics, target: Actor | undefined) {
  hint.clear();
  if (target) hint.lineStyle(3, 0x477e86).strokeEllipse(target.x, target.y + 3, 76, 22);
}
/** Moves the selection (halo, name and star) to `id`'s figure without repainting anyone. */
export function chooseFigure(scene: Phaser.Scene, figures: Figure[], world: World, id: ActorId) {
  figures.forEach(f => ['selection-halo', 'selection-label', 'selection-star'].forEach(name => f.getByName(name)?.destroy()));
  const figure = figures.find(f => f.name === id), actor = world.actors.find(a => a.id === id);
  if (figure && actor) drawSelection(scene, figure, supportedActor(world, actor), actorLabel(actor), visualContext(world));
  if (navigator.webdriver) scene.game.canvas.dataset.chosen = id;
}
