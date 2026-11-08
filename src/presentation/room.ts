import type Phaser from 'phaser';
import type { World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { palettes } from '../content/furnishings';
export function drawRoom(scene: Phaser.Scene, state: World) {
  const finish = state.layout.rooms[state.room]!; const width = roomWidth(state);
  const wall = palettes[finish.wall]; const floor = palettes[finish.floor];
  const g = scene.add.graphics();
  const wallColor = finish.wall === 'original' ? 0xe8e6dd : Number(wall.light.replace('#', '0x'));
  const tiled = finish.template === 'bathroom' || finish.template === 'kitchen';
  const floorColor = finish.floor === 'original' ? (tiled ? 0xcbd3c0 : 0xc3a284) : Number(floor.base.replace('#', '0x'));
  g.fillStyle(wallColor).fillRect(0, 0, width, 600);
  g.fillStyle(0xffffff, .17).fillRect(0, 0, width, 200);
  g.fillStyle(floorColor).fillRect(0, 390, width, 210);
  g.lineStyle(1, 0x6e655a, .22);
  const step = tiled ? 60 : 35;
  for (let y = 400; y < 600; y += step) {
    g.lineBetween(0, y, width, y);
    for (let x = tiled ? 0 : (y % 2) * 120; x < width; x += tiled ? 80 : 240) g.lineBetween(x, y, x, y + step);
  }
  g.fillStyle(0xf6f4ec).fillRect(0, 382, width, 10);
  scene.add.image(0, 0, `architecture-${finish.template}`).setOrigin(0).setDisplaySize(width, 600);
}
