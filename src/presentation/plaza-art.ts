import type Phaser from 'phaser';
import { textStyle } from './text-style';
import type { Neighborhood } from '../domain/neighborhood-types';
export function drawPlaza(scene: Phaser.Scene, town: Neighborhood) {
  const g = scene.add.graphics();
  g.fillStyle(0x779884).fillRoundedRect(26, 130, 15, 290, 6);
  g.fillStyle(0xa9c39d).fillEllipse(75, 160, 220, 210); g.fillStyle(0xbfd1a6).fillEllipse(28, 115, 180, 120);
  g.fillStyle(0xcbd8ad).fillEllipse(330, 435, 620, 85);
  const bench = scene.add.graphics({ x: 72, y: 178 }).setScale(.6);
  bench.fillStyle(0x7c7764, .1).fillEllipse(180, 452, 215, 18);
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
  g.fillStyle(0xbe9c79).fillRoundedRect(518, 432, 110, 41, 8);
  for (const x of [535, 565, 600]) {
    g.lineStyle(3, 0x7c9a75).lineBetween(x, 440, x, 390);
    g.fillStyle(town.outdoor.watered ? 0x92ba87 : 0xb2bd91).fillEllipse(x - 9, 417, 24, 12).fillEllipse(x + 8, 401, 25, 12);
    g.fillStyle(0xe5b2a3).fillCircle(x, 385, 10); g.fillStyle(0xf6d68d).fillCircle(x, 385, 4);
  }
  scene.add.text(280, 85, 'Pracinha do encontro', textStyle('plaza')).setOrigin(.5);
}
