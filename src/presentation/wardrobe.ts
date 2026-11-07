import Phaser from 'phaser';
import { looks } from '../content/catalog';
import type { LookId } from '../domain/types';
import { wardrobeSlots } from './targets';

export function drawShirt(g: Phaser.GameObjects.Graphics, look: LookId, x: number, y: number, scale = 1) {
  const color = looks[look].color;
  g.fillStyle(color).fillRoundedRect(x - 20 * scale, y - 24 * scale, 40 * scale, 50 * scale, 8 * scale);
  g.fillTriangle(x - 20 * scale, y - 24 * scale, x - 36 * scale, y - 4 * scale, x - 20 * scale, y + 3 * scale);
  g.fillTriangle(x + 20 * scale, y - 24 * scale, x + 36 * scale, y - 4 * scale, x + 20 * scale, y + 3 * scale);
  g.lineStyle(3 * scale, 0xfffaf0, 0.8).beginPath().arc(x, y - 23 * scale, 8 * scale, 0, Math.PI).strokePath();
  drawPattern(g, look, x, y, scale);
}
export function drawPattern(g: Phaser.GameObjects.Graphics, look: LookId, x: number, y: number, scale = 1) {
  g.fillStyle(0xfffaf0, 0.9).lineStyle(3 * scale, 0xfffaf0, 0.9);
  if (look === 'mar') {
    for (const dy of [-8, 2, 12]) g.lineBetween(x - 17 * scale, y + dy * scale, x + 17 * scale, y + dy * scale);
  } else if (look === 'pijama') {
    for (const dx of [-10, 10]) for (const dy of [-10, 10]) g.fillCircle(x + dx * scale, y + dy * scale, 3 * scale);
  } else if (look === 'festa') {
    g.fillTriangle(x, y - 8 * scale, x - 13 * scale, y + 13 * scale, x + 13 * scale, y + 13 * scale);
    g.fillCircle(x, y - 11 * scale, 3 * scale);
  } else if (look === 'estrela') {
    g.fillTriangle(x, y - 14 * scale, x - 13 * scale, y + 9 * scale, x + 13 * scale, y + 9 * scale);
    g.fillTriangle(x, y + 15 * scale, x - 13 * scale, y - 8 * scale, x + 13 * scale, y - 8 * scale);
  } else if (look === 'jardim') {
    g.fillEllipse(x, y, 12 * scale, 30 * scale).fillEllipse(x, y, 30 * scale, 12 * scale);
    g.fillStyle(0xf4bf54).fillCircle(x, y, 5 * scale);
  } else g.fillCircle(x, y, 10 * scale);
}
export function drawWardrobe(scene: Phaser.Scene, open: boolean) {
  const g = scene.add.graphics();
  g.fillStyle(0x8e614b).fillRoundedRect(280, 80, 300, 182, 14);
  g.fillStyle(0xf4ce97).fillRoundedRect(288, 88, 284, 166, 9);
  scene.add.text(430, 105, open ? 'Escolha e arraste um look' : 'Meu armário', { fontSize: '15px', color: '#634a45' }).setOrigin(0.5);
  if (open) {
    g.fillStyle(0xfff5e4).fillRoundedRect(298, 122, 264, 125, 7);
    wardrobeSlots.forEach(slot => drawShirt(g, slot.id, slot.x, slot.y, 0.7));
  } else {
    g.lineStyle(2, 0xd7a46d).lineBetween(430, 125, 430, 248);
    g.fillStyle(0xa67865).fillCircle(416, 179, 6).fillCircle(444, 179, 6);
    scene.add.text(430, 224, 'Toque para abrir', { fontSize: '13px', color: '#795946' }).setOrigin(0.5);
  }
}
