import type Phaser from 'phaser';
import { eventLine } from '../content/feedback-text';
import { contextScale, visualContext } from './pose';
import { speechBubble } from './feedback';
import type { PresentationEvent, World } from '../domain/types';
export function react(scene: Phaser.Scene, state: World, events: PresentationEvent[]) {
  for (const event of events) {
    const actor = state.actors.find(a => a.id === event.actor);
    if (!actor || actor.room !== state.room) continue;
    const line = eventLine(event.type, actor, actor.kind === 'cat');
    const height = (actor.kind === 'cat' ? 100 : 196) * contextScale(visualContext(state));
    if (line) speechBubble(scene, { x: actor.x, y: actor.y - height }, line, actor.id);
  }
}
