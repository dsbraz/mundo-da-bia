import type Phaser from 'phaser';
import type { Neighborhood, OutdoorAction } from '../domain/neighborhood-types';
import { plotStart } from '../domain/neighborhood-geometry';
import { reducedFadeMs, reducedMotion } from './motion';
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
  if (action.target === 'water') water(scene, actor, reducedMotion());
}
/** The tip of the watering can's spout held by someone standing at `actor` (the can is drawn at 60% beside the hip). */
export const spoutPoint = (actor: { x: number; y: number }) => ({ x: actor.x + 3, y: actor.y - 44 });
/** The can tilts and the drops come out of its spout toward the flowers; with reduced motion the can only fades, without drops. */
function water(scene: Phaser.Scene, actor: { x: number; y: number }, reduced: boolean) {
  const can = scene.add.graphics({ x: actor.x - 16.8, y: actor.y - 33 }).setScale(.6).setDepth(actor.y + 5);
  can.fillStyle(0x85a9a0).fillRoundedRect(-16, -13, 30, 23, 5).fillTriangle(10, -8, 33, -19, 16, 4);
  can.lineStyle(3, 0x668c85).strokeCircle(-17, -5, 10);
  const dataset = scene.game.canvas.dataset;
  if (reduced) {
    dataset.water = 'can';
    scene.tweens.add({ targets: can, alpha: 0, delay: 650, duration: reducedFadeMs, onComplete: () => { can.destroy(); dataset.water = ''; } });
    return;
  }
  scene.tweens.add({ targets: can, angle: 18, duration: 325, yoyo: true, repeat: 1, onComplete: () => can.destroy() });
  const spout = spoutPoint(actor), drops = scene.add.graphics({ x: spout.x, y: spout.y }).setDepth(actor.y + 6);
  for (let i = 0; i < 6; i++) drops.fillStyle(0x82b3c8, .8).fillEllipse(2 + i * 3, i * 6, 3, 7);
  dataset.water = 'drops'; dataset.waterX = String(spout.x); dataset.waterY = String(spout.y);
  scene.tweens.add({ targets: drops, x: spout.x + 12, y: spout.y + 30, alpha: 0, duration: 420, delay: 120, repeat: 1, onComplete: () => { drops.destroy(); dataset.water = ''; } });
}
