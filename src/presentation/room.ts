import Phaser from 'phaser';
import type { RoomId } from '../domain/types';

export function drawRoom(scene: Phaser.Scene, room: RoomId) {
  const g = scene.add.graphics();
  g.fillStyle(room === 'sala' ? 0xf6dfd4 : 0xe6def1).fillRect(0, 0, 1000, 600);
  g.fillStyle(0xe6c5a8).fillRect(0, 295, 1000, 305);
  g.fillStyle(0xfff4df).fillRect(0, 286, 1000, 12);
  for (let y = 340; y < 600; y += 70) g.lineStyle(2, 0xd7b397).lineBetween(0, y, 1000, y);
  g.fillStyle(0xc4deda).fillRoundedRect(70, 45, 170, 185, 75);
  g.lineStyle(10, 0xfffaf0).strokeRoundedRect(70, 45, 170, 185, 75);
  g.lineBetween(155, 49, 155, 225).lineBetween(75, 140, 235, 140);
  g.fillStyle(0xffe6a1).fillCircle(194, 92, 21);
  g.fillStyle(room === 'sala' ? 0xd6a5a5 : 0xb5a0c9, 0.6).fillEllipse(500, 460, 670, 180);
  if (room === 'sala') {
    drawStage(g);
    scene.add.star(805, 164, 5, 16, 33, 0xffe19b);
  }
  else drawBed(g);
  g.fillStyle(0xc09070).fillRoundedRect(42, 250, 45, 53, 8);
  g.fillStyle(0x7da78d).fillEllipse(64, 216, 30, 80).fillEllipse(43, 235, 33, 50).fillEllipse(83, 230, 35, 57);
  scene.add.text(500, 62, room === 'sala' ? 'O palco é de vocês' : 'Um cantinho para sonhar', { fontFamily: 'sans-serif', fontSize: '25px', color: '#795c78' }).setOrigin(0.5);
}
function drawStage(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(0x9c729d).fillRoundedRect(660, 90, 290, 185, 12);
  g.fillStyle(0xc795ad).fillRoundedRect(660, 90, 75, 180, 12).fillRoundedRect(875, 90, 75, 180, 12);
  g.fillStyle(0xd0a167).fillRoundedRect(642, 265, 320, 30, 8);
  g.fillStyle(0x8eaf9e).fillRoundedRect(292, 188, 268, 100, 25);
  g.fillStyle(0xb5cebc).fillRoundedRect(313, 205, 106, 60, 14).fillRoundedRect(433, 205, 106, 60, 14);
  g.fillStyle(0x8eaf9e).fillRoundedRect(280, 227, 30, 70, 12).fillRoundedRect(543, 227, 30, 70, 12);
}
function drawBed(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(0xaf88a1).fillRoundedRect(600, 170, 340, 120, 25);
  g.fillStyle(0xfff5dd).fillRoundedRect(610, 200, 320, 65, 15);
  g.fillStyle(0xb0a8cf).fillRoundedRect(720, 208, 210, 70, 14);
  g.fillStyle(0xf0d7af).fillRoundedRect(620, 205, 85, 45, 18);
  g.fillStyle(0xba9c7d).fillRoundedRect(298, 140, 190, 150, 10);
  g.fillStyle(0xffe6b1).fillRoundedRect(313, 156, 160, 115, 7);
  g.fillStyle(0xd9949f).fillCircle(360, 211, 13).fillCircle(426, 211, 13);
  g.fillStyle(0xa1b8a4).fillEllipse(190, 319, 125, 42);
}
