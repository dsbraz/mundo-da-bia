import type Phaser from 'phaser';
import { contextScale, visualContext } from './pose';
import { speechBubble } from './feedback';
import { showHeart } from './care-heart';
import type { Actor, ActorId, Point, PresentationEvent, World } from '../domain/types';
import { showBook } from './use-effects';
import { handPoint } from './targets';
/** `said[i]` is the line for `events[i]`, already taken from the rotation by whoever announces it (so bubble and announcement agree). */
/** `dance` plays the big reaction of a favourite dish (arms up and confetti; with reduced motion only the arms). */
export function react(scene: Phaser.Scene, state: World, events: PresentationEvent[], said: readonly (string | null)[], selected?: ActorId, dance?: (id: ActorId) => void) {
  for (const [index, event] of events.entries()) {
    if (event.piece !== undefined) { readBook(scene, state, event.piece, selected); continue; }
    const actor = state.actors.find(a => a.id === event.actor);
    if (!actor || actor.room !== state.room) continue;
    const line = said[index] ?? null;
    const scale = contextScale(visualContext(state)), height = (actor.kind === 'cat' ? 100 : 196) * scale;
    if (line) speechBubble(scene, { x: actor.x, y: actor.y - height }, line, actor.id);
    meal(scene, event, actor, { x: actor.x - 46 * scale, y: actor.y - height * .8 }, dance);
  }
}
/** Touching the bookcase on: a book shows in the hand of whoever walked there. */
function readBook(scene: Phaser.Scene, state: World, id: number, selected?: ActorId) {
  const reader = state.actors.find(a => a.id === selected && a.room === state.room);
  if (reader && state.layout.pieces.some(p => p.id === id && p.kind === 'bookcase' && p.active)) showBook(scene, handPoint(reader, visualContext(state)));
}
/** After eating: a heart, and for the favourite dish the dance too. */
function meal(scene: Phaser.Scene, event: PresentationEvent, actor: Actor, head: Point, dance?: (id: ActorId) => void) {
  if (event.type !== 'fed' && event.type !== 'ate') return;
  showHeart(scene, actor.id, head);
  if (event.favorite) { scene.game.canvas.dataset.favorite = actor.id; dance?.(actor.id); }
}
