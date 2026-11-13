import type Phaser from 'phaser';
import { contextScale, stature, visualContext } from './pose';
import { speechBubble, speechTop } from './feedback';
import { selectionLayout } from './selection-art';
import { showHeart } from './care-heart';
import type { Actor, ActorId, Point, PresentationEvent, World } from '../domain/types';
import { showBook } from './use-effects';
import { showFlush } from './flush';
import { handPoint } from './targets';
import { mealDuration, showMeal } from './meal';
import type { ReactionPose } from '../content/personalities';
/** `said[i]` is the line for `events[i]`, already taken from the rotation by whoever announces it (so bubble and announcement agree). */
/** `dance` plays the big reaction of a favourite dish (arms up and confetti; with reduced motion only the arms). */
export function react(scene: Phaser.Scene, state: World, events: PresentationEvent[], said: readonly (string | null)[], selected?: ActorId, dance?: (id: ActorId) => void,
  pose?: (id: ActorId, pose: ReactionPose) => void, embrace?: (a: Actor, b: Actor) => void) {
  hugs(scene, state, events, pose, embrace);
  for (const [index, event] of events.entries()) {
    if (event.piece !== undefined) { readBook(scene, state, event.piece, selected); flushed(scene, state, event, pose); continue; }
    const actor = state.actors.find(a => a.id === event.actor);
    if (!actor || actor.room !== state.room) continue;
    const line = said[index] ?? null;
    const scale = contextScale(visualContext(state)), height = (actor.kind === 'cat' ? 100 : 196 * stature(actor)) * scale;
    const answer = () => {
      if (line) speechBubble(scene, { x: actor.x, y: actor.y + speechTop(-height, actor.id === selected ? selectionLayout(actor, visualContext(state)).star : undefined) }, line, actor.id);
      meal(scene, event, actor, { x: actor.x - 46 * scale, y: actor.y - height * .8 }, dance);
    };
    eatThenAnswer(scene, state, events, event, actor, answer);
  }
}
/** A person eats seated first (W3L-07): three bites, then the line and the heart. A cat eats on the floor at once. A shared dish (lot 6B,
 *  `by` the one who brought it) is the one plate on the table: who shares it answers when it is empty. */
function eatThenAnswer(scene: Phaser.Scene, state: World, events: PresentationEvent[], event: PresentationEvent, actor: Actor, answer: () => void) {
  if (event.type !== 'ate' || !event.recipe || actor.kind !== 'human') answer();
  else if (event.by) scene.time.delayedCall(mealDuration, answer);
  else showMeal(scene, state, actor, event.recipe, answer, mateOf(state, events, actor.id));
}
/** Who shares `id`'s dish (lot 6B): the plate goes between the two. */
const mateOf = (state: World, events: PresentationEvent[], id: ActorId) => state.actors.find(a => events.some(e => e.type === 'ate' && e.by === id && e.actor === a.id));
/** Léo and Rui greet each other with a high five (W3L-14); every other pair hugs. */
const highFivers: readonly ActorId[] = ['leo', 'rui'];
export const hugStyle = (a: ActorId, b: ActorId): 'hug' | 'five' => highFivers.includes(a) && highFivers.includes(b) ? 'five' : 'hug';
/** A hug: both lean in and hold each other, happy (lot 6B: `embrace`; a high five: both clap) and one heart floats over the two heads.
 *  `data-hug` (automation) names `a:b:hug|five`. */
function hugs(scene: Phaser.Scene, state: World, events: PresentationEvent[], pose?: (id: ActorId, pose: ReactionPose) => void, embrace?: (a: Actor, b: Actor) => void) {
  const hug = events.find(e => e.type === 'hugged'), a = state.actors.find(x => x.id === hug?.actor), b = state.actors.find(x => x.id === hug?.by);
  if (!a || !b || a.room !== state.room) return;
  const style = hugStyle(a.id, b.id), scale = contextScale(visualContext(state));
  for (const id of [a.id, b.id]) pose?.(id, style === 'five' ? 'clap' : 'stretch');
  if (style === 'hug') embrace?.(a, b);
  showHeart(scene, a.id, { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 210 * scale });
  if (navigator.webdriver) scene.game.canvas.dataset.hug = `${a.id}:${b.id}:${style}`;
}
/** Touching the bookcase on: a book shows in the hand of whoever walked there. */
function readBook(scene: Phaser.Scene, state: World, id: number, selected?: ActorId) {
  const reader = state.actors.find(a => a.id === selected && a.room === state.room);
  if (reader && state.layout.pieces.some(p => p.id === id && p.kind === 'bookcase' && p.active)) showBook(scene, handPoint(reader, visualContext(state)));
}
/** The toilet's flush: the water swirls in the bowl and whoever sat there hops up happy. */
function flushed(scene: Phaser.Scene, state: World, event: PresentationEvent, pose?: (id: ActorId, pose: ReactionPose) => void) {
  const toilet = state.layout.pieces.find(p => p.id === event.piece && p.kind === 'toilet' && p.room === state.room);
  if (!toilet) return;
  showFlush(scene, toilet);
  if (event.actor) pose?.(event.actor, 'hop');
}
/** After eating: a heart, and for the favourite dish the dance too. */
function meal(scene: Phaser.Scene, event: PresentationEvent, actor: Actor, head: Point, dance?: (id: ActorId) => void) {
  if (event.type !== 'fed' && event.type !== 'ate') return;
  showHeart(scene, actor.id, head);
  if (event.favorite) { scene.game.canvas.dataset.favorite = actor.id; dance?.(actor.id); }
}
