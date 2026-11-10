import type { VisualContext } from './pose';
import { textStyle } from './text-style';
import { actorScale, settlePose, contextScale } from './pose';
import Phaser from 'phaser';
import { applyReaction } from './feedback';
import { drawSelection } from './selection-art';
import { selectionPulse } from './motion';
import { actors } from '../content/catalog';
import { contactShadow } from './contact-shadow';
import { catTail, phaseOf } from './idle-life';
import { catTrot, gaitFrame } from './gait';
import { addCatTail, curlLayers, curled, poseTail } from './cat-pose';
import { expressionOf, faceParts, paintFace, type Expression } from './expression';
import type { Actor } from '../domain/types';

export function drawActor(scene: Phaser.Scene, actor: Actor, selected: boolean, context?: VisualContext): Phaser.GameObjects.Container {
  const container = scene.add.container(actor.x, actor.y).setName(actor.id);
  const labelX = actor.seat === 'bed' ? -80 : 0;
  const shadow = contactShadow(scene, labelX, 2, actor.seat === 'bed' ? 140 : 56, 8, 0x716858).setScale(contextScale(context));
  shadow.setData('base', shadow.scaleX);
  container.add(shadow);
  const pose = scene.add.container(0, 0).setName('pose').setScale(actorScale(actor, context));
  container.add(pose);
  const parts = actor.kind === 'human' ? ['hair-back', 'legs', 'hands', actor.look, 'face', 'hair', ...faceParts.human] : ['tail', 'ears', 'body', ...faceParts.cat, 'curl'];
  heroLayer(scene, pose, actor, 'back');
  parts.forEach(part => addPart(scene, pose, actor, part));
  heroLayer(scene, pose, actor, 'front');
  if (actor.kind === 'cat') pivotCat(pose);
  animateActor(container, actor, 500, 0, false);
  coverActor(scene, container, actor);
  if (selected) drawSelection(scene, container, actor, actorLabel(actor), context);
  if (actor.resting) container.add(scene.add.text(actor.seat === 'bed' ? -175 : 24, actor.seat === 'bed' ? -60 : -185, 'z z Z', textStyle('mark')));
  return container;
}
/** The face this frame: an expression (from events) and whether the eyes blink. */
export interface FaceFrame { expression: Expression; blink: boolean }
export function animateActor(figure: Phaser.GameObjects.Container, actor: Actor, time: number, index: number, show: boolean, reduced = false, face?: FaceFrame) {
  const pose = figure.getByName<Phaser.GameObjects.Container>('pose');
  figure.getByName<Phaser.GameObjects.Graphics>('blanket')?.setVisible(actor.seat === 'bed' && actor.resting);
  pose.x = 0; pose.y = 0;
  shiftFace(pose, 0);
  const shown = face ?? { expression: expressionOf({ ...actor, show: false }, null), blink: actor.resting };
  paintFace(pose, actor.kind, shown.expression, shown.blink);
  bodyLayers(pose, actor, time, reduced);
  const angle = actor.seat === 'bed' ? -Math.PI / 2 : 0;
  const restingAngle = settlePose(pose.getData('restingAngle') ?? angle, angle, reduced);
  pose.setData('restingAngle', restingAngle);
  pose.rotation = restingAngle + danceAngle(time, index, show && !actor.resting);
  applyReaction(figure, pose);
  pulseStar(figure, time, reduced);
}
/** The cat's ears turn about the head (70, 45), in the 140 × 120 art. */
function pivotCat(pose: Phaser.GameObjects.Container) {
  pose.getByName<Phaser.GameObjects.Image>('ears').setOrigin(.5, 45 / 120).setPosition(0, -75);
}
function bodyLayers(pose: Phaser.GameObjects.Container, actor: Actor, time: number, reduced: boolean) {
  if (actor.kind === 'human') seatLayers(pose, actor, reduced);
  else { poseTail(pose, catTail(time, phaseOf(actor.id), actor.resting, reduced)); curlLayers(pose, curled(actor)); }
}
function pulseStar(figure: Phaser.GameObjects.Container, time: number, reduced: boolean) {
  const star = figure.getByName<Phaser.GameObjects.Graphics>('selection-star');
  star?.setScale(selectionPulse(time, reduced) * star.getData('base'));
}
function danceAngle(time: number, index: number, dancing: boolean) { return dancing ? Math.sin(time / 220 + index) * 0.06 : 0; }


function actorLabel(actor: Actor) { return actor.name ?? actors[actor.id].name; }

function cover(scene: Phaser.Scene, container: Phaser.GameObjects.Container, cat: boolean) {
  const width = cat ? 62 : 104;
  const blanket = scene.add.graphics().setName('blanket');
  blanket.fillStyle(0xa8c9b8).fillRoundedRect(-width, -44, width + 12, 88, 12);
  blanket.lineStyle(1.5, 0x789f8b).strokeRoundedRect(-width, -44, width + 12, 88, 12);
  blanket.lineStyle(5, 0xdce9d1).lineBetween(-width + 8, -36, -width + 8, 36);
  blanket.lineStyle(1, 0x789f8b, .5).lineBetween(-width + 26, 32, 0, 36);
  container.add(blanket);
}

function actorHeight(actor: Actor) { return actor.kind === 'cat' ? 120 : 220; }
function coverActor(scene: Phaser.Scene, container: Phaser.GameObjects.Container, actor: Actor) {
  if (actor.seat === 'bed' && actor.resting) cover(scene, container, actor.kind === 'cat');
}

function addPart(scene: Phaser.Scene, pose: Phaser.GameObjects.Container, actor: Actor, part: string) {
  if (actor.kind === 'cat' && part === 'tail') { addCatTail(scene, pose, actor); return; }
  const key = `${actor.id}-${part}`;
  const image = scene.add.image(0, 0, key).setDisplaySize(140, actorHeight(actor)).setOrigin(.5, 1).setName(part);
  pose.add(image);
  if (actor.kind !== 'human' || (part !== 'legs' && part !== actor.look)) return;
  image.setCrop(0, 0, 280, 320).setData('hitCrop', { x: 0, y: 0, width: 280, height: 320 });
  let knees = pose.getByName<Phaser.GameObjects.Container>('knees');
  if (!knees) { knees = scene.add.container(0, -60).setName('knees'); pose.add(knees); }
  for (const side of [0, 1]) {
    const lower = scene.add.image(0, 60, key).setDisplaySize(140, 220).setOrigin(.5, 1).setCrop(side * 140, 320, 140, 120);
    lower.setData('hitCrop', { x: side * 140, y: 320, width: 140, height: 120 });
    lower.setData('side', side); knees.add(lower);
  }
}

function seatLayers(pose: Phaser.GameObjects.Container, actor: Actor, reduced: boolean) {
  const seated = !!actor.seat && actor.seat !== 'bed';
  const amount = settlePose(pose.getData('seatAmount') ?? Number(seated), Number(seated), reduced);
  pose.setData('seatAmount', amount); pose.y = 22 * amount * pose.scaleY;
  const knees = pose.getByName<Phaser.GameObjects.Container>('knees');
  knees.setScale(1, 1 - .35 * amount).setRotation(-.35 * amount);
  knees.list.forEach(part => (part as Phaser.GameObjects.Image).setPosition(0, 60));
}

function heroLayer(scene: Phaser.Scene, pose: Phaser.GameObjects.Container, actor: Actor, side: 'back' | 'front') {
  if (actor.kind !== 'human') return;
  if (side === 'back' && actor.look === 'superman') addPart(scene, pose, actor, 'cape-superman');
  if (side === 'front' && actor.look === 'spiderman') addPart(scene, pose, actor, 'mask-spiderman');
}
/** One frame of walking: the cycle comes from `gait` (cadence and step scaled by the context); a cat trots with its tail up. */
export function walkPose(figure: Phaser.GameObjects.Container, actor: Actor, scale: number, reduced: boolean) {
  const pose = figure.getByName<Phaser.GameObjects.Container>('pose'), distance = figure.getData('distance') ?? 0, direction = figure.getData('direction') ?? 0;
  if (actor.kind === 'cat') {
    const trot = catTrot(distance, scale, reduced);
    pose.y -= trot.bob; poseTail(pose, { base: trot.tail, tip: trot.tip }, trot.raise); return;
  }
  const gait = gaitFrame(distance, scale, direction, figure.getData('gait')?.acceleration ?? 0, reduced);
  if (reduced) return;
  pose.y -= gait.bob; pose.rotation += gait.lean;
  pose.getByName<Phaser.GameObjects.Image>('eyes').setX(direction * 1.5);
  pose.getByName<Phaser.GameObjects.Image>('lids').setX(direction * 1.5);
  pose.getByName<Phaser.GameObjects.Container>('knees')?.list.forEach(part => {
    const leg = part as Phaser.GameObjects.Image, step = gait.legs[Number(leg.getData('side'))]!;
    leg.y = 60 - step.lift; leg.x = step.x;
  });
}
export function gazePose(figure: Phaser.GameObjects.Container, direction: number) {
  shiftFace(figure.getByName<Phaser.GameObjects.Container>('pose'), direction * 2);
}
/** Eyes, brows and mouth look sideways together. */
function shiftFace(pose: Phaser.GameObjects.Container, x: number) { allFaceParts.forEach(part => pose.getByName<Phaser.GameObjects.Image>(part)?.setX(x)); }
const allFaceParts = [...new Set([...faceParts.human, ...faceParts.cat])];
