import type Phaser from 'phaser';
import { eventLine } from '../content/feedback-text';
import { contextScale, visualContext } from './pose';
import { speechBubble } from './feedback';
import { showHeart } from './care-heart';
import type { ActorId, PresentationEvent, World } from '../domain/types';
import { showBook } from './use-effects';
import { handPoint } from './targets';
export function react(scene: Phaser.Scene, state: World, events: PresentationEvent[], selected?: ActorId) {
  for (const event of events) {
    if (event.piece !== undefined) { readBook(scene, state, event.piece, selected); continue; }
    const actor = state.actors.find(a => a.id === event.actor);
    if (!actor || actor.room !== state.room) continue;
    const line = eventLine(event.type, actor, actor.kind === 'cat');
    const scale = contextScale(visualContext(state)), height = (actor.kind === 'cat' ? 100 : 196) * scale;
    if (line) speechBubble(scene, { x: actor.x, y: actor.y - height }, line, actor.id);
    if (event.type === 'fed') showHeart(scene, actor.id, { x: actor.x - 46 * scale, y: actor.y - height * .8 });
  }
}
/** Touching the bookcase on: a book shows in the hand of whoever walked there. */
function readBook(scene: Phaser.Scene, state: World, id: number, selected?: ActorId) {
  const reader = state.actors.find(a => a.id === selected && a.room === state.room);
  if (reader && state.layout.pieces.some(p => p.id === id && p.kind === 'bookcase' && p.active)) showBook(scene, handPoint(reader, visualContext(state)));
}
