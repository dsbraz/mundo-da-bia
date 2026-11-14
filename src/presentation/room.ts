import type Phaser from 'phaser';
import type { World, RoomTemplate, Room } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { palettes } from '../content/furnishings';
import { architectureKey } from './architecture-art';
const outdoorColors: Partial<Record<RoomTemplate, { wall: number; floor: number }>> = {
  garden: { wall: 0xcce7e1, floor: 0xb3bf92 }, playground: { wall: 0xcce7e1, floor: 0xb3bf92 }, sportsfield: { wall: 0xdbece6, floor: 0x87ad7d },
};
export function drawRoom(scene: Phaser.Scene, state: World, extend = true) {
  const finish = state.layout.rooms[state.room]!; const width = roomWidth(state);
  const margin = extend ? 10000 : 0;
  const g = scene.add.graphics();
  const outside = outdoorColors[finish.template];
  const tiled = finish.template === 'bathroom' || finish.template === 'kitchen';
  const { wall: wallColor, floor: floorColor } = roomColors(finish, tiled);
  g.fillStyle(wallColor).fillRect(-margin, -margin, width + margin * 2, 600 + margin * 2);
  g.fillStyle(0xffffff, .17).fillRect(-margin, -margin, width + margin * 2, 200 + margin);
  g.fillStyle(floorColor).fillRect(-margin, 390, width + margin * 2, 210 + margin);
  g.lineStyle(1, 0x6e655a, .22);
  if (!outside) floorLines(g, width, tiled);
  g.fillStyle(0x6e655a, .07).fillRect(-margin, 392, width + margin * 2, 8);
  g.fillStyle(0xf6f4ec).fillRect(-margin, 382, width + margin * 2, 10);
  scene.add.image(0, 0, architectureKey(state).key).setOrigin(0).setDisplaySize(width, 600);
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

export function roomColors(finish: Room, tiled = finish.template === 'bathroom' || finish.template === 'kitchen') {
  const outside = outdoorColors[finish.template];
  if (outside) return outside;
  return {
    wall: finish.wall === 'original' ? 0xe8e6dd : Number(palettes[finish.wall].light.replace('#', '0x')),
    floor: finish.floor === 'original' ? (tiled ? 0xcbd3c0 : 0xc3a284) : Number(palettes[finish.floor].base.replace('#', '0x')),
  };
}
