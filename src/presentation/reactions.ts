import type Phaser from 'phaser';
import { bubbleExit } from './motion';
import type { PresentationEvent, World } from '../domain/types';
export function react(scene: Phaser.Scene, state: World, events: PresentationEvent[]) {
  for (const event of events) {
    const actor = state.actors.find(a => a.id === event.actor);
    if (!actor || actor.room !== state.room || !['fed', 'dressed', 'picked'].includes(event.type)) continue;
    const label = event.type === 'fed' ? 'Nhac! ♥' : event.type === 'dressed' ? 'Uau! ✧' : 'Oba!';
    const bubble = scene.add.text(actor.x, actor.y - 150, label, { resolution: 2, fontSize: '21px', color: '#79507c', backgroundColor: '#fff9dd', padding: { x: 12, y: 8 } }).setOrigin(0.5);
    scene.tweens.add({ targets: bubble, ...bubbleExit(bubble.y, 24, 1300), onComplete: () => bubble.destroy() });
  }
}
