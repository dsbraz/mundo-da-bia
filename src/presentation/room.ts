import type Phaser from 'phaser';
import type { World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { palettes } from '../content/furnishings';
export function drawRoom(scene: Phaser.Scene, state: World) {
  const finish = state.layout.rooms[state.room]!; const width = roomWidth(state);
  const wall = palettes[finish.wall]; const floor = palettes[finish.floor];
  const g = scene.add.graphics();
  const wallColor = finish.wall === 'original' ? 0xe8e6dd : Number(wall.light.replace('#', '0x'));
  const floorColor = finish.floor === 'original' ? 0xc3a284 : Number(floor.base.replace('#', '0x'));
  g.fillStyle(wallColor).fillRect(0, 0, width, 600);
  g.fillStyle(0xffffff, .17).fillRect(0, 0, width, 200);
  g.fillStyle(floorColor).fillRect(0, 390, width, 210);
  g.lineStyle(1, 0x6e655a, .22);
  for (let y = 400; y < 600; y += 35) {
    g.lineBetween(0, y, width, y);
    for (let x = (y % 2) * 120; x < width; x += 240) g.lineBetween(x, y, x, y + 35);
  }
  g.fillStyle(0xf6f4ec).fillRect(0, 382, width, 10);
  g.fillStyle(0xadbdbb).fillRoundedRect(90, 85, 180, 155, 3);
  g.fillStyle(finish.template === 'studio' ? 0x718497 : 0xb6d2d2).fillRect(98, 93, 164, 139);
  g.fillStyle(0xf6f4ec).fillRect(177, 93, 5, 139).fillRect(98, 157, 164, 5).fillRect(85, 234, 190, 9);
  g.fillStyle(0xffffff, .15).fillTriangle(99, 94, 174, 94, 99, 164);
  if (state.room === 'sala') {
    if (finish.wall === 'original' && finish.floor === 'original') scene.add.image(0, 0, 'atelier-background').setOrigin(0).setDisplaySize(width, 600);
    scene.add.image(0, 0, 'atelier-details').setOrigin(0);
  }
}
