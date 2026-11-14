import type Phaser from 'phaser';
import { hex } from './palette';
import { reducedMotion } from './motion';

/** The show's sign (lot 6B): two beamed music notes on a small card by the stage, drawn, never written; they bob to the beat (still with
 *  reduced motion). `canvas.dataset.live` (automation) says it is up. */
export function liveNotes(scene: Phaser.Scene, x: number, y: number, show: boolean): Phaser.GameObjects.Container | null {
  if (!show) { if (navigator.webdriver) scene.game.canvas.dataset.live = ''; return null; }
  const card = scene.add.graphics();
  card.fillStyle(hex('signBg')).fillRoundedRect(-38, -32, 76, 64, 16).lineStyle(2, hex('outline'), .5).strokeRoundedRect(-38, -32, 76, 64, 16);
  const notes = scene.add.graphics().setName('notes');
  notes.fillStyle(hex('coral')).fillEllipse(-14, 14, 18, 13).fillEllipse(14, 8, 18, 13);
  notes.lineStyle(4, hex('coral')).lineBetween(-6, 12, -6, -18).lineBetween(22, 6, 22, -24);
  notes.fillStyle(hex('coral')).fillPoints([{ x: -8, y: -20 }, { x: 24, y: -28 }, { x: 24, y: -18 }, { x: -8, y: -10 }], true);
  notes.fillStyle(hex('sun')).fillCircle(-26, -16, 4).fillCircle(30, 18, 3);
  const sign = scene.add.container(x, y, [card, notes]).setDepth(700).setName('live');
  if (!reducedMotion()) scene.tweens.add({ targets: notes, y: -4, angle: 6, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  if (navigator.webdriver) scene.game.canvas.dataset.live = 'notes';
  sign.once('destroy', () => { if (navigator.webdriver) scene.game.canvas.dataset.live = ''; });
  return sign;
}
