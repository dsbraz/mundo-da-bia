import type Phaser from 'phaser';
import type { Neighborhood, OutdoorAction } from '../domain/neighborhood-types';
import { plotStart } from '../domain/neighborhood-geometry';
import { reducedMotion } from './motion';
import { speechBubble } from './feedback';
import { nameOf, outdoorLine } from '../content/feedback-text';
export function drawOutdoorState(scene: Phaser.Scene, town: Neighborhood) {
  const g = scene.add.graphics();
  town.buildings.forEach(b => {
    const x = plotStart(b.plot);
    if (town.outdoor.mail.includes(b.id)) {
      g.fillStyle(0xfff6dc).fillRect(x + 306, 389, 28, 23);
      g.lineStyle(1, 0xa9947b).strokeRect(x + 306, 389, 28, 23).lineBetween(x + 306, 389, x + 320, 402).lineBetween(x + 320, 402, x + 334, 389);
      g.fillStyle(0x8caaa0).fillTriangle(x + 303, 410, x + 337, 410, x + 320, 430);
    }
    if (town.outdoor.bells.includes(b.id)) g.lineStyle(2, 0xd4b65d).strokeCircle(x + 280, 400, 17);
  });
}
export function outdoorEffect(scene: Phaser.Scene, town: Neighborhood, action: OutdoorAction) {
  if (action.target === 'leave') return;
  const actor = town.actors.find(a => a.id === action.actor)!;
  speechBubble(scene, { x: actor.x, y: actor.y - 130 }, outdoorLine(action.target, nameOf(actor)), actor.id);
  const reduced = reducedMotion();
  if (action.target === 'water' && !reduced) water(scene, actor);
}
function water(scene: Phaser.Scene, actor: { x: number; y: number }) {
  const can = scene.add.graphics({ x: actor.x - 16.8, y: actor.y - 33 }).setScale(.6).setDepth(actor.y + 5);
  can.fillStyle(0x85a9a0).fillRoundedRect(-16, -13, 30, 23, 5).fillTriangle(10, -8, 33, -19, 16, 4);
  can.lineStyle(3, 0x668c85).strokeCircle(-17, -5, 10);
  scene.tweens.add({ targets: can, angle: 18, duration: 325, yoyo: true, repeat: 1, onComplete: () => can.destroy() });
  const drops = scene.add.graphics().setDepth(600);
  for (let i = 0; i < 9; i++) drops.fillStyle(0x82b3c8, .7).fillEllipse(530 + i * 9, 355 - (i % 3) * 12, 3, 8);
  scene.tweens.add({ targets: drops, y: 55, alpha: 0, duration: 650, repeat: 1, onComplete: () => drops.destroy() });
}
