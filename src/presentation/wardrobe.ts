import type Phaser from 'phaser';
import { wardrobeSlots } from './targets';

export function drawWardrobe(scene: Phaser.Scene, open: boolean) {
  scene.add.image(500, 300, open ? 'wardrobe-open' : 'wardrobe-closed');
  if (open) wardrobeSlots.forEach(slot => scene.add.image(slot.x, slot.y, `look-${slot.id}`).setDisplaySize(55, 48));
}
