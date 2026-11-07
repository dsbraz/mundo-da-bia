import type Phaser from 'phaser';
import type { World } from '../domain/types';

export function drawFurniture(scene: Phaser.Scene, state: World) {
  if (state.room !== 'sala') return;
  for (const part of ['fridge', 'drawer'] as const) {
    scene.add.image(500, 300, `${part}-${state.home[part] ? 'open' : 'closed'}`);
  }
  scene.add.image(500, 300, `lamp-${state.home.lamp ? 'on' : 'off'}`);
}
export function drawLighting(scene: Phaser.Scene, state: World) {
  if (state.room === 'sala' && !state.home.lamp) scene.add.rectangle(500, 300, 1000, 600, 0x312440, 0.27).setDepth(900);
}
