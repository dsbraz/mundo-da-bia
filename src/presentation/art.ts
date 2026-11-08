import { actorScale, settlePose } from './pose';
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
export function animateActor(figure: Phaser.GameObjects.Container, actor: Actor, time: number, index: number, show: boolean, reduced = false) {
  const pose = figure.getByName<Phaser.GameObjects.Container>('pose');
  figure.getByName<Phaser.GameObjects.Graphics>('blanket')?.setVisible(actor.seat === 'bed' && actor.resting);
  const blink = actor.resting || (time + index * 530) % 3900 < 130;
  pose.getByName<Phaser.GameObjects.Image>('eyes').setVisible(!blink);
  pose.getByName<Phaser.GameObjects.Image>('lids').setVisible(blink);
  if (actor.kind === 'human') {
    pose.getByName<Phaser.GameObjects.Image>('mouth').setVisible(!actor.fed);
    pose.getByName<Phaser.GameObjects.Image>('mouth-happy').setVisible(actor.fed);
    seatLayers(pose, actor, reduced);
  } else pose.getByName<Phaser.GameObjects.Image>('tail').rotation = actor.resting ? 0 : Math.sin(time / 700 + index) * 0.04;
  const angle = actor.seat === 'bed' ? -Math.PI / 2 : 0;
  const restingAngle = settlePose(pose.getData('restingAngle') ?? angle, angle, reduced);
  pose.setData('restingAngle', restingAngle);
  pose.rotation = restingAngle + danceAngle(time, index, show && !actor.resting);
}
function danceAngle(time: number, index: number, dancing: boolean) { return dancing ? Math.sin(time / 220 + index) * 0.06 : 0; }


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
  if (actor.kind !== 'human' || (part !== 'legs' && part !== actor.look)) return;
  image.setCrop(0, 0, 280, 332);
  let knees = pose.getByName<Phaser.GameObjects.Container>('knees');
  if (!knees) { knees = scene.add.container(0, -54).setName('knees'); pose.add(knees); }
  const lower = scene.add.image(0, 54, key).setDisplaySize(140, 220).setOrigin(.5, 1).setCrop(0, 332, 280, 108);
  knees.add(lower);
}

function seatLayers(pose: Phaser.GameObjects.Container, actor: Actor, reduced: boolean) {
  const seated = !!actor.seat && actor.seat !== 'bed';
  const amount = settlePose(pose.getData('seatAmount') ?? Number(seated), Number(seated), reduced);
  pose.setData('seatAmount', amount); pose.y = 22 * amount;
  const knees = pose.getByName<Phaser.GameObjects.Container>('knees');
  knees.setScale(1, 1 - .35 * amount).setRotation(-.35 * amount);
}
