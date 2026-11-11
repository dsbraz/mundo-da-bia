import type Phaser from 'phaser';
import { textStyle } from './text-style';
import type { Neighborhood } from '../domain/neighborhood-types';
import { drawGarden } from './garden-art';
/** Draws the plaza (its vegetable garden in place of the old flowerbed) and returns its tree crown, which sways with the sky. */
export function drawPlaza(scene: Phaser.Scene, town: Neighborhood): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x779884).fillRoundedRect(26, 130, 15, 290, 6);
  g.fillStyle(0xcbd8ad).fillEllipse(330, 435, 620, 85);
  const crown = scene.add.graphics({ x: 33, y: 250 }).setName('plaza-crown');
  crown.fillStyle(0xa9c39d).fillEllipse(42, -90, 220, 210).fillStyle(0xbfd1a6).fillEllipse(-5, -135, 180, 120);
  const bench = scene.add.graphics({ x: 72, y: 178 }).setScale(.6);
  bench.fillStyle(0x7c7764, .2).fillEllipse(180, 452, 215, 18).fillStyle(0x7c7764, .16).fillEllipse(180, 452, 118, 11);
  bench.lineStyle(7, 0x778979).lineBetween(100, 411, 100, 453).lineBetween(258, 411, 258, 453);
  for (let y = 367; y <= 415; y += 16) { bench.fillStyle(0xcba881).fillRoundedRect(85, y, 190, 12, 3); bench.lineStyle(1, 0x8b7865).strokeRoundedRect(85, y, 190, 12, 3); }
  bench.fillStyle(0xd4b38a).fillRoundedRect(80, 423, 200, 14, 4);
  const frame = scene.add.graphics({ x: 160, y: 178 }).setScale(.6);
  frame.lineStyle(9, 0xb49a78).lineBetween(300, 447, 342, 232).lineBetween(500, 447, 458, 232).lineBetween(335, 230, 465, 230);
  const rig = scene.add.container(400, 319).setName('swing-rig').setScale(.6);
  const seat = scene.add.graphics(); rig.add(seat);
  seat.lineStyle(2, 0x8b8573).lineBetween(-34, 2, -34, 195).lineBetween(34, 2, 34, 195);
  seat.fillStyle(0xa2b8a3).fillRoundedRect(-45, 193, 90, 13, 5);
  seat.lineStyle(1.5, 0x718b78).strokeRoundedRect(-45, 193, 90, 13, 5);
  drawGarden(scene, town);
  scene.add.text(280, 85, 'Pracinha do encontro', textStyle('plaza')).setOrigin(.5);
  return crown;
}
