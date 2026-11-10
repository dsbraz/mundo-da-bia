import type Phaser from 'phaser';
import type { Actor } from '../domain/types';
import { faceParts } from './expression';

type Container = Phaser.GameObjects.Container;
type Image = Phaser.GameObjects.Image;
/** In the 140 × 120 art the tail turns about its base (88, 100) and its tip about the joint (114, 82). */
const base = { x: 88, y: 100 }, joint = { x: 114, y: 82 };
/** The tail in two segments: the tip rides on the base, so turning them out of phase draws an S. */
export function addCatTail(scene: Phaser.Scene, pose: Container, actor: Actor) {
  const segment = (part: string, at: { x: number; y: number }) => scene.add.image(0, 0, `${actor.id}-${part}`).setDisplaySize(140, 120).setOrigin(at.x / 140, at.y / 120).setName(part);
  const tail = scene.add.container(base.x - 70, base.y - 120).setName('tail');
  tail.add([segment('tail-base', base), segment('tail-tip', joint).setPosition(joint.x - base.x, joint.y - base.y)]);
  pose.add(tail);
}
/** Turns the whole tail by `angles.base` and the tip by `angles.tip` more; `raise` draws it taller. */
export function poseTail(pose: Container, angles: { base: number; tip: number }, raise = 1) {
  const tail = pose.getByName<Container>('tail').setRotation(angles.base).setScale(1, raise);
  tail.getByName<Image>('tail-tip').setRotation(angles.tip);
}
/** A cat resting off the bed lies curled up (in bed it lies under the blanket). */
export const curled = (actor: Actor) => actor.kind === 'cat' && actor.resting && actor.seat !== 'bed';
/** Shows the curled drawing (lying, head down, the tail around the body, eyes shut) or the sitting one, every frame both ways. */
export function curlLayers(pose: Container, curl: boolean) {
  for (const part of ['tail', 'ears', 'body']) pose.getByName<Image>(part).setVisible(!curl);
  pose.getByName<Image>('curl').setVisible(curl);
  if (curl) faceParts.cat.forEach(part => pose.getByName<Image>(part)?.setVisible(false));
}
