import Phaser from 'phaser';
import { actors } from '../content/catalog';
import type { Actor } from '../domain/types';

export function drawActor(scene: Phaser.Scene, actor: Actor, selected: boolean): Phaser.GameObjects.Container {
  const container = scene.add.container(actor.x, actor.y).setName(actor.id);
  const labelX = actor.seat === 'bed' ? -80 : 0;
  const shadow = scene.add.ellipse(labelX, 2, actor.seat === 'bed' ? 180 : 86, 18, 0x654236, 0.16);
  if (selected) shadow.setStrokeStyle(3, 0xffefb7);
  container.add(shadow);
  const pose = scene.add.container(0, 0).setName('pose');
  container.add(pose);
  const parts = actor.kind === 'human'
    ? ['hair-back', 'legs', 'hands', actor.look, 'face', 'hair', 'eyes', 'lids', 'mouth', 'mouth-happy']
    : ['tail', 'body', 'eyes', 'lids'];
  parts.forEach(part => {
    const image = scene.add.image(0, 0, `${actor.id}-${part}`).setOrigin(0.5, 1).setName(part);
    pose.add(image);
  });
  animateActor(container, actor, 500, 0, false);
  if (selected) container.add(scene.add.text(labelX, 22, actors[actor.id].name, { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#71452e', backgroundColor: '#fff1d1', padding: { x: 10, y: 4 } }).setOrigin(0.5));
  if (actor.resting) container.add(scene.add.text(actor.seat === 'bed' ? -175 : 24, actor.seat === 'bed' ? -60 : -185, 'z z Z', { fontSize: '21px', color: '#77558b' }));
  if (actor.fed) container.add(scene.add.text(-48, -100, '♥', { fontSize: '20px', color: '#d75c78' }));
  return container;
}
export function animateActor(figure: Phaser.GameObjects.Container, actor: Actor, time: number, index: number, show: boolean) {
  const pose = figure.getByName<Phaser.GameObjects.Container>('pose');
  const blink = actor.resting || (time + index * 530) % 3900 < 130;
  pose.getByName<Phaser.GameObjects.Image>('eyes').setVisible(!blink);
  pose.getByName<Phaser.GameObjects.Image>('lids').setVisible(blink);
  if (actor.kind === 'human') {
    pose.getByName<Phaser.GameObjects.Image>('mouth').setVisible(!actor.fed);
    pose.getByName<Phaser.GameObjects.Image>('mouth-happy').setVisible(actor.fed);
    pose.getByName<Phaser.GameObjects.Image>('legs').setScale(1, actor.seat ? 0.82 : 1).setY(actor.seat ? -12 : 0);
  } else pose.getByName<Phaser.GameObjects.Image>('tail').rotation = actor.resting ? 0 : Math.sin(time / 700 + index) * 0.04;
  pose.rotation = actor.seat === 'bed' ? -Math.PI / 2 : danceAngle(time, index, show && !actor.resting);
}
function danceAngle(time: number, index: number, dancing: boolean) { return dancing ? Math.sin(time / 220 + index) * 0.06 : 0; }
