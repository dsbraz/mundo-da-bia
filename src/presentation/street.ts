import { doorway } from './door-geometry';
import { textStyle } from './text-style';
import { facadeKey } from './architecture-art';
import { facadeLabel } from './facade-parts';
import { floorCount } from '../domain/modules';
import { drawOutdoorState } from './outdoor-effects';
import { drawPlaza } from './plaza-art';
import { drawPlazaGlow } from './plaza-glow';
import type { ActorId } from '../domain/types';
import { plotStart, streetWidth } from '../domain/neighborhood-geometry';
import type Phaser from 'phaser';
import type { Building, Neighborhood } from '../domain/neighborhood-types';
import { palettes } from '../content/furnishings';
import { hex } from './palette';

export function drawStreet(scene: Phaser.Scene, town: Neighborhood, selected: ActorId) {
  const width = streetWidth(town.plots);
  const g = scene.add.graphics();
  g.fillStyle(0xe9f3ef).fillRect(-10000, -10000, width + 20000, 20600);
  backdrop(g, width);
  g.fillStyle(0xd7e6c5).fillRect(0, 345, width, 120);
  g.fillStyle(0xf0e3ce).fillRect(0, 455, width, 110);
  g.fillStyle(0x9eaeb0).fillRect(-10000, 565, width + 20000, 10000);
  g.lineStyle(2, 0xbcaf9d).lineBetween(0, 455, width, 455).lineBetween(0, 562, width, 562);
  drawPlaza(scene, town);
  drawPlazaGlow(scene, town, selected);
  for (let plot = 0; plot < town.plots; plot++) {
    const b = town.buildings.find(b => b.plot === plot);
    if (b) facade(scene, b); else emptyPlot(scene, plot);
    g.lineStyle(1, 0xd2c4b1).lineBetween(plotStart(plot), 455, plotStart(plot), 562);
  }
  drawOutdoorState(scene, town);
}
/** Free plot: a sign with a big "+" and a few bricks, kept in the left part of the plot so it stays whole on screen. */
function emptyPlot(scene: Phaser.Scene, plot: number) {
  const x = plotStart(plot) + 125;
  const g = scene.add.graphics();
  g.fillStyle(0xe9edcf).fillRoundedRect(plotStart(plot) + 40, 270, 360, 180, 16);
  g.lineStyle(1.5, hex('outline')).strokeRoundedRect(plotStart(plot) + 40, 270, 360, 180, 16);
  g.fillStyle(0xd4bda0).fillRoundedRect(x - 5, 360, 10, 80, 3);
  g.fillStyle(hex('signBg')).fillRoundedRect(x - 85, 292, 170, 84, 12).lineStyle(1.5, hex('outline')).strokeRoundedRect(x - 85, 292, 170, 84, 12);
  g.fillStyle(hex('leaf')).fillCircle(x, 322, 20).lineStyle(1.5, hex('outline')).strokeCircle(x, 322, 20);
  g.fillStyle(0xffffff).fillRoundedRect(x - 11, 319, 22, 6, 3).fillRoundedRect(x - 3, 311, 6, 22, 3);
  for (const [dx, dy] of [[70, 0], [104, 0], [87, -18]]) g.fillStyle(hex('coral')).fillRoundedRect(x + dx!, 418 + dy!, 32, 16, 4).lineStyle(1.5, hex('outline')).strokeRoundedRect(x + dx!, 418 + dy!, 32, 16, 4);
  scene.add.text(x, 360, 'Terreno livre', textStyle('sign', { fontSize: '18px', color: '#55635c', align: 'center' })).setOrigin(.5);
}
function facade(scene: Phaser.Scene, b: Building) {
  const x = plotStart(b.plot);
  const image = scene.add.image(x, 0, facadeKey(b.model, floorCount(b.layout))).setOrigin(0).setDisplaySize(440, 480);
  if (b.color !== 'original') image.setTint(Number.parseInt(palettes[b.color].light.slice(1), 16));
  const label = facadeLabel(b.model, floorCount(b.layout));
  scene.add.text(x + label.x, label.y, b.name, textStyle('sign', { maxLines: 2, align: 'center', wordWrap: { width: label.width }, padding: { x: 5, y: 3 } })).setOrigin(.5);
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
  scene.add.text(d.x + d.width / 2, d.y + 48, 'Rua', textStyle('sign', { fontSize: '18px', color: '#334f49' })).setOrigin(.5).setDepth(151);
}

function backdrop(g: Phaser.GameObjects.Graphics, width: number) {
  for (let x = -240; x < width; x += 480) {
    g.fillStyle(0xffffff, .5).fillEllipse(x + 140, 135, 160, 28).fillEllipse(x + 120, 123, 75, 36);
    g.fillStyle(0xb9cdb3, .4).fillEllipse(x + 240, 348, 500, 130);
    g.lineStyle(3, 0xa6b4a3).lineBetween(x + 410, 315, x + 410, 380);
    g.fillStyle(0xb5c9a4).fillEllipse(x + 410, 305, 75, 60);
  }
}
