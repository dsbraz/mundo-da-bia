import type Phaser from 'phaser';
import type { World } from '../domain/types';
import { palettes } from '../content/furnishings';

export function drawRoom(scene: Phaser.Scene, state: World) {
  const finish = state.layout.rooms[state.room];
  const wall = palettes[finish.wall]; const floor = palettes[finish.floor];
  const g = scene.add.graphics();
  g.fillStyle(Number(wall.light.replace('#', '0x'))).fillRect(0, 0, 1000, 600);
  g.lineStyle(1, Number(wall.base.replace('#', '0x')), 0.4);
  for (let x = 0; x < 1000; x += 65) g.lineBetween(x, 0, x, 390);
  g.fillStyle(Number(floor.base.replace('#', '0x'))).fillRect(0, 390, 1000, 210);
  g.lineStyle(2, Number(floor.dark.replace('#', '0x')), 0.25);
  for (let y = 400; y < 600; y += 40) g.lineBetween(0, y, 1000, y);
  g.fillStyle(0xfff1d6).fillRect(0, 382, 1000, 10);
  scene.add.image(70, 50, `window-${state.room}`).setOrigin(0);
}
