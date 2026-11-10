import type Phaser from 'phaser';
import { eventLine } from '../content/feedback-text';
import { contextScale, visualContext } from './pose';
import { speechBubble } from './feedback';
import { showHeart } from './care-heart';
import type { PresentationEvent, World } from '../domain/types';
export function react(scene: Phaser.Scene, state: World, events: PresentationEvent[]) {
  for (const event of events) {
    const actor = state.actors.find(a => a.id === event.actor);
    if (!actor || actor.room !== state.room) continue;
    const line = eventLine(event.type, actor, actor.kind === 'cat');
    const scale = contextScale(visualContext(state)), height = (actor.kind === 'cat' ? 100 : 196) * scale;
    if (line) speechBubble(scene, { x: actor.x, y: actor.y - height }, line, actor.id);
    if (event.type === 'fed') showHeart(scene, actor.id, { x: actor.x - 46 * scale, y: actor.y - height * .8 });
  }
}
