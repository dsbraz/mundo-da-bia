import Phaser from 'phaser';
import { actors } from '../content/catalog';
import type { Actor } from '../domain/types';

export function drawActor(scene: Phaser.Scene, actor: Actor, selected: boolean): Phaser.GameObjects.Container {
  const container = scene.add.container(actor.x, actor.y).setName(actor.id);
  const labelX = actor.seat === 'bed' ? -80 : 0;
  const shadow = scene.add.ellipse(labelX, 2, actor.seat === 'bed' ? 140 : 56, 7, 0x716858, 0.08);
  if (selected) shadow.setStrokeStyle(3, 0xffefb7);
  container.add(shadow);
  const pose = scene.add.container(0, 0).setName('pose').setScale(actorScale(actor));
  container.add(pose);
  const parts = actor.kind === 'human'
    ? ['hair-back', 'legs', 'hands', actor.look, 'face', 'hair', 'eyes', 'lids', 'mouth', 'mouth-happy']
    : ['tail', 'body', 'eyes', 'lids'];
  parts.forEach(part => addPart(scene, pose, actor, part));
  animateActor(container, actor, 500, 0, false);
  coverActor(scene, container, actor);
  if (selected) container.add(scene.add.text(labelX, 22, actorLabel(actor), { resolution: 2, fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#71452e', backgroundColor: '#fff1d1', padding: { x: 10, y: 4 } }).setOrigin(0.5));
  if (actor.resting) container.add(scene.add.text(actor.seat === 'bed' ? -175 : 24, actor.seat === 'bed' ? -60 : -185, 'z z Z', { resolution: 2, fontSize: '21px', color: '#77558b' }));
  if (actor.fed) container.add(scene.add.text(-48, -100, '♥', { resolution: 2, fontSize: '20px', color: '#d75c78' }));
  return container;
}
export function animateActor(figure: Phaser.GameObjects.Container, actor: Actor, time: number, index: number, show: boolean) {
  const pose = figure.getByName<Phaser.GameObjects.Container>('pose');
  figure.getByName<Phaser.GameObjects.Graphics>('blanket')?.setVisible(actor.seat === 'bed' && actor.resting);
  const blink = actor.resting || (time + index * 530) % 3900 < 130;
  pose.getByName<Phaser.GameObjects.Image>('eyes').setVisible(!blink);
  pose.getByName<Phaser.GameObjects.Image>('lids').setVisible(blink);
  if (actor.kind === 'human') {
    pose.getByName<Phaser.GameObjects.Image>('mouth').setVisible(!actor.fed);
    pose.getByName<Phaser.GameObjects.Image>('mouth-happy').setVisible(actor.fed);
    seatLayers(pose, actor);
  } else pose.getByName<Phaser.GameObjects.Image>('tail').rotation = actor.resting ? 0 : Math.sin(time / 700 + index) * 0.04;
  pose.rotation = actor.seat === 'bed' ? -Math.PI / 2 : danceAngle(time, index, show && !actor.resting);
}
function danceAngle(time: number, index: number, dancing: boolean) { return dancing ? Math.sin(time / 220 + index) * 0.06 : 0; }

function actorScale(actor: Actor) { return actor.kind === 'cat' ? 0.78 : 0.86; }

function actorLabel(actor: Actor) { return actor.name ?? actors[actor.id].name; }

function cover(scene: Phaser.Scene, container: Phaser.GameObjects.Container, cat: boolean) {
  const width = cat ? 62 : 104;
  const blanket = scene.add.graphics().setName('blanket');
  blanket.fillStyle(0xa8c9b8).fillRoundedRect(-width, -32, width + 12, 64, 12);
  blanket.lineStyle(1.5, 0x789f8b).strokeRoundedRect(-width, -32, width + 12, 64, 12);
  blanket.lineStyle(5, 0xdce9d1).lineBetween(-width + 8, -26, -width + 8, 26);
  blanket.lineStyle(1, 0x789f8b, .5).lineBetween(-width + 26, 20, 0, 24);
  container.add(blanket);
}

function actorHeight(actor: Actor) { return actor.kind === 'cat' ? 120 : 220; }
function coverActor(scene: Phaser.Scene, container: Phaser.GameObjects.Container, actor: Actor) {
  if (actor.seat === 'bed' && actor.resting) cover(scene, container, actor.kind === 'cat');
}

function addPart(scene: Phaser.Scene, pose: Phaser.GameObjects.Container, actor: Actor, part: string) {
  const key = `${actor.id}-${part}`;
  const image = scene.add.image(0, 0, key).setDisplaySize(140, actorHeight(actor)).setOrigin(.5, 1).setName(part);
  pose.add(image);
  if (actor.kind !== 'human' || !actor.seat || actor.seat === 'bed') return;
  if (part !== 'legs' && part !== actor.look) return;
  image.setCrop(0, 0, 280, 332);
  const lower = scene.add.image(0, -21.6, key).setName(`${part}-seated`).setDisplaySize(140, 132).setOrigin(.5, 1).setCrop(0, 332, 280, 108);
  pose.add(lower);
}

function seatLayers(pose: Phaser.GameObjects.Container, actor: Actor) {
  const seated = !!actor.seat && actor.seat !== 'bed';
  pose.y = seated ? 22 : 0;
  for (const part of ['legs', actor.look]) {
    const lower = pose.getByName<Phaser.GameObjects.Image>(`${part}-seated`);
    if (!lower) continue;
    lower.setVisible(seated);
    const image = pose.getByName<Phaser.GameObjects.Image>(part);
    if (seated) image.setCrop(0, 0, 280, 332); else image.setCrop();
  }
}
