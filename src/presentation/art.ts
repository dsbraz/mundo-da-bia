import Phaser from 'phaser';
import { actors, looks } from '../content/catalog';
import type { Actor } from '../domain/types';

export function drawActor(scene: Phaser.Scene, actor: Actor, selected: boolean): Phaser.GameObjects.Container {
  const container = scene.add.container(actor.x, actor.y);
  const g = scene.add.graphics();
  const style = actors[actor.id];
  g.fillStyle(0x4b395d, 0.12).fillEllipse(0, 3, 86, 18);
  if (selected) g.lineStyle(3, 0x8e67b4).strokeEllipse(0, 3, 93, 24);
  if (actor.kind === 'cat') drawCat(g, style.skin);
  else drawHuman(g, actor);
  const label = scene.add.text(0, 25, style.name, { fontFamily: 'sans-serif', fontSize: '18px', color: '#4b395d', backgroundColor: '#fff9ef', padding: { x: 10, y: 5 } }).setOrigin(0.5);
  container.add([g, label]);
  if (actor.resting) container.add(scene.add.text(22, -110, 'z z Z', { fontSize: '22px', color: '#765790' }));
  if (actor.fed) container.add(scene.add.text(-40, -100, '♥', { fontSize: '20px', color: '#c46480' }));
  return container;
}
function drawHuman(g: Phaser.GameObjects.Graphics, actor: Actor) {
  const style = actors[actor.id];
  g.fillStyle(style.hair).fillRoundedRect(-33, -139, 66, 75, 26);
  g.fillStyle(style.skin).fillRoundedRect(-39, -68, 13, 49, 7).fillRoundedRect(26, -68, 13, 49, 7);
  g.fillStyle(0x665270).fillRoundedRect(-24, -30, 18, 30, 6).fillRoundedRect(6, -30, 18, 30, 6);
  g.fillStyle(looks[actor.look].color).fillRoundedRect(-29, -79, 58, 60, 15);
  g.fillStyle(style.skin).fillCircle(0, -104, 28);
  g.fillStyle(style.hair).fillEllipse(-7, -126, 48, 25);
  g.fillStyle(0x382d3f).fillCircle(-10, -104, 3).fillCircle(10, -104, 3);
  g.lineStyle(2, 0x9a544f).beginPath().arc(0, -97, 8, 0, Math.PI).strokePath();
  g.fillStyle(0xffffff, 0.8).fillCircle(0, -56, 8);
  g.fillStyle(0xffffff).fillRoundedRect(-29, -8, 25, 12, 5).fillRoundedRect(4, -8, 25, 12, 5);
}
function drawCat(g: Phaser.GameObjects.Graphics, color: number) {
  g.lineStyle(12, color).beginPath().moveTo(25, -15).lineTo(48, -28).lineTo(48, -44).strokePath();
  g.fillStyle(color).fillEllipse(0, -23, 63, 45).fillCircle(0, -58, 29);
  g.fillTriangle(-28, -65, -28, -97, -7, -79).fillTriangle(28, -65, 28, -97, 7, -79);
  g.fillStyle(0xdda2a3).fillTriangle(-23, -73, -23, -89, -13, -79).fillTriangle(23, -73, 23, -89, 13, -79);
  g.fillStyle(0x332b40).fillCircle(-10, -60, 3).fillCircle(10, -60, 3);
  g.fillStyle(0xd18491).fillTriangle(-4, -51, 4, -51, 0, -46);
  g.lineStyle(1, 0x6b5a66).lineBetween(-30, -50, -13, -47).lineBetween(30, -50, 13, -47);
}
