import { roomWidth } from '../domain/geometry';
import { fixture } from '../domain/layout';
import type Phaser from 'phaser';
import type { World } from '../domain/types';

export function drawLighting(scene: Phaser.Scene, state: World) {
  if (fixture(state, 'lamp')?.room === state.room && !state.home.lamp) scene.add.rectangle(roomWidth(state) / 2, 300, roomWidth(state), 600, 0x312440, 0.27).setDepth(900);
}
