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
  floorLines(g, width, tiled);
  g.fillStyle(0x6e655a, .07).fillRect(0, 392, width, 8);
  g.fillStyle(0xf6f4ec).fillRect(0, 382, width, 10);
  scene.add.image(0, 0, `architecture-${finish.template}`).setOrigin(0).setDisplaySize(width, 600);
}

function floorLines(g: Phaser.GameObjects.Graphics, width: number, tiled: boolean) {
  const horizon = 250, step = tiled ? 60 : 35;
  for (let y = 400; y < 600; y += step) {
    g.lineBetween(0, y, width, y);
    const offset = tiled ? 0 : Math.round(y / step) % 2 * 120;
    for (let x = offset; x < width; x += tiled ? 80 : 240) {
      const nextX = width / 2 + (x - width / 2) * (y + step - horizon) / (y - horizon);
      g.lineBetween(x, y, nextX, y + step);
    }
  }
}
