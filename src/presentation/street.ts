import { doorway } from './door-geometry';
import { facadeKey } from './architecture-art';
import { floorCount } from '../domain/modules';
import { drawOutdoorState } from './outdoor-effects';
import { drawPlaza } from './plaza-art';
import { plotStart, streetWidth } from '../domain/neighborhood-geometry';
import type Phaser from 'phaser';
import type { Building, Neighborhood } from '../domain/neighborhood-types';
import { palettes } from '../content/furnishings';

export function drawStreet(scene: Phaser.Scene, town: Neighborhood) {
  const width = streetWidth(town.plots);
  const g = scene.add.graphics();
  g.fillStyle(0xe9f3ef).fillRect(0, 0, width, 600);
  g.fillStyle(0xd7e6c5).fillRect(0, 345, width, 120);
  g.fillStyle(0xf0e3ce).fillRect(0, 455, width, 110);
  g.fillStyle(0x9eaeb0).fillRect(0, 565, width, 35);
  g.lineStyle(2, 0xbcaf9d).lineBetween(0, 455, width, 455).lineBetween(0, 562, width, 562);
  drawPlaza(scene, town);
  for (let plot = 0; plot < town.plots; plot++) {
    const b = town.buildings.find(b => b.plot === plot);
    if (b) facade(scene, b); else emptyPlot(scene, plot);
    g.lineStyle(1, 0xd2c4b1).lineBetween(plotStart(plot), 455, plotStart(plot), 562);
  }
  drawOutdoorState(scene, town);
}
function emptyPlot(scene: Phaser.Scene, plot: number) {
  const x = plotStart(plot) + 220;
  const g = scene.add.graphics();
  g.fillStyle(0xe9edcf).fillRoundedRect(x - 170, 270, 340, 180, 16);
  g.lineStyle(2, 0x9aa990).strokeRoundedRect(x - 170, 270, 340, 180, 16);
  g.fillStyle(0xd4bda0).fillRect(x - 5, 340, 10, 100);
  g.fillStyle(0xfff9e7).fillRoundedRect(x - 110, 302, 220, 68, 10);
  scene.add.text(x, 335, '✦ Terreno livre\nToque em Construir', { resolution: 2, fontSize: '18px', color: '#55635c', align: 'center' }).setOrigin(.5);
}
function facade(scene: Phaser.Scene, b: Building) {
  const x = plotStart(b.plot);
  const image = scene.add.image(x, 0, facadeKey(b.model, floorCount(b.layout))).setOrigin(0).setDisplaySize(440, 480);
  if (b.color !== 'original') image.setTint(Number.parseInt(palettes[b.color].light.slice(1), 16));
  const y = b.model === 'apartment' ? 50 + (3 - floorCount(b.layout)) * 55 : b.model === 'shop' ? 156 : 160 - (floorCount(b.layout) - 1) * 22;
  const institution = ['hospital', 'police', 'office'].includes(b.model);
  scene.add.text(x + (institution ? 239 : 220), institution ? 164 : y, b.name, { resolution: 2, fontSize: '17px', color: '#52665e', backgroundColor: '#fff4df', padding: { x: 10, y: 5 } }).setOrigin(.5);
}
export function drawExit(scene: Phaser.Scene) {
  const d = doorway.interior, g = scene.add.graphics().setDepth(150);
  g.fillStyle(0xf5e8d3).fillRoundedRect(d.x - 9, d.y - 9, d.width + 18, d.height + 9, 8);
  g.lineStyle(2, 0xb9a68c).strokeRoundedRect(d.x - 9, d.y - 9, d.width + 18, d.height + 9, 8);
  g.fillStyle(0x7a9692).fillRoundedRect(d.x, d.y, d.width, d.height, 5);
  g.lineStyle(2, 0x596e6a).strokeRoundedRect(d.x, d.y, d.width, d.height, 5);
  g.fillStyle(0xacc7bf).fillRoundedRect(d.x + 12, d.y + 14, d.width - 24, 86, 5);
  g.fillStyle(0xf7db94).fillCircle(d.x + d.width - 16, d.y + 124, 4);
  g.fillStyle(0xd7c3ab).fillRect(d.x - 12, d.y + d.height - 2, d.width + 24, 9);
  scene.add.text(d.x + d.width / 2, d.y + 48, 'Rua', { resolution: 2, fontSize: '18px', color: '#334f49' }).setOrigin(.5).setDepth(151);
}
