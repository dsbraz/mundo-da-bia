import type Phaser from 'phaser';
import type { Building, Neighborhood } from '../domain/neighborhood-types';
import { palettes } from '../content/furnishings';
export const plotWidth = 440;
export function drawStreet(scene: Phaser.Scene, town: Neighborhood) {
  const width = town.plots * plotWidth;
  const g = scene.add.graphics();
  g.fillStyle(0xe9f3ef).fillRect(0, 0, width, 600);
  g.fillStyle(0xd7e6c5).fillRect(0, 345, width, 120);
  g.fillStyle(0xf0e3ce).fillRect(0, 455, width, 110);
  g.fillStyle(0x9eaeb0).fillRect(0, 565, width, 35);
  g.lineStyle(2, 0xbcaf9d).lineBetween(0, 455, width, 455).lineBetween(0, 562, width, 562);
  for (let plot = 0; plot < town.plots; plot++) {
    const b = town.buildings.find(b => b.plot === plot);
    if (b) facade(scene, b); else emptyPlot(scene, plot);
    g.lineStyle(1, 0xd2c4b1).lineBetween(plot * plotWidth, 455, plot * plotWidth, 562);
  }
}
function emptyPlot(scene: Phaser.Scene, plot: number) {
  const x = plot * plotWidth + 220;
  const g = scene.add.graphics();
  g.fillStyle(0xe9edcf).fillRoundedRect(x - 170, 270, 340, 180, 16);
  g.lineStyle(2, 0x9aa990).strokeRoundedRect(x - 170, 270, 340, 180, 16);
  g.fillStyle(0xd4bda0).fillRect(x - 5, 340, 10, 100);
  g.fillStyle(0xfff9e7).fillRoundedRect(x - 110, 302, 220, 68, 10);
  scene.add.text(x, 335, '✦ Terreno livre\nDecorar para construir', { resolution: 2, fontSize: '18px', color: '#55635c', align: 'center' }).setOrigin(.5);
}
function facade(scene: Phaser.Scene, b: Building) {
  const x = b.plot * plotWidth + 220, top = b.model === 'apartment' ? 110 : 230;
  const color = Number.parseInt(palettes[b.color].base.slice(1), 16);
  const g = scene.add.graphics();
  g.fillStyle(0x7d8371, .12).fillEllipse(x, 452, 370, 22);
  g.fillStyle(color).fillRoundedRect(x - 165, top, 330, 450 - top, 12);
  g.lineStyle(2, 0x827969).strokeRoundedRect(x - 165, top, 330, 450 - top, 12);
  g.fillStyle(0x718e90).fillTriangle(x - 180, top + 8, x, top - 62, x + 180, top + 8);
  for (const dx of [-105, 105]) windowPane(g, x + dx, top + 65);
  if (b.model === 'apartment') for (const dx of [-105, 105]) windowPane(g, x + dx, 320);
  if (b.model === 'shop') {
    g.fillStyle(0xe1a0a0).fillRect(x - 160, 306, 320, 32);
    for (let n = 0; n < 8; n++) g.fillStyle(0xfff6e3).fillRect(x - 160 + n * 40, 306, 20, 32);
  }
  g.fillStyle(0x657f83).fillRoundedRect(x - 43, 350, 86, 100, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.lineStyle(2, 0x546c70).strokeRoundedRect(x - 43, 350, 86, 100, 8);
  g.fillStyle(0xf5d98d).fillCircle(x + 25, 407, 4);
  scene.add.text(x, top + 18, b.name, { resolution: 2, fontSize: '18px', color: '#4d5d60', backgroundColor: '#fff8e7', padding: { x: 12, y: 6 } }).setOrigin(.5);
}
function windowPane(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  g.fillStyle(0xfaf2d6).fillRoundedRect(x - 30, y - 26, 60, 52, 6);
  g.lineStyle(2, 0x8aa4a3).strokeRoundedRect(x - 30, y - 26, 60, 52, 6).lineBetween(x, y - 26, x, y + 26).lineBetween(x - 30, y, x + 30, y);
}
export function drawExit(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(150);
  g.fillStyle(0x7a9692).fillRoundedRect(510, 260, 80, 150, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.lineStyle(2, 0x596e6a).strokeRoundedRect(510, 260, 80, 150, 12);
  g.fillStyle(0xf7db94).fillCircle(573, 342, 4);
  scene.add.text(550, 285, 'Rua', { resolution: 2, fontSize: '18px', color: '#fff8e7' }).setOrigin(.5).setDepth(151);
}
