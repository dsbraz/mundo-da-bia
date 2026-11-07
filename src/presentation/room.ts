import Phaser from 'phaser';
import type { RoomId } from '../domain/types';

export function drawRoom(scene: Phaser.Scene, room: RoomId) {
  scene.add.image(500, 300, room).setDisplaySize(1000, 600);
}
