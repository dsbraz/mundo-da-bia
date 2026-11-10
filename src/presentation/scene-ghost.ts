import type Phaser from 'phaser';
import { reducedMotion } from './motion';
import type { ActorId, Point } from '../domain/types';

/** Moves the drag ghost to `point`; snapping onto a new `target` glides there in 100 ms (jumps with reduced motion). */
export function snapGhost(scene: Phaser.Scene, ghost: Phaser.GameObjects.Image, point: Point, target: ActorId | null) {
  if (ghost.getData('target') !== target) {
    scene.tweens.killTweensOf(ghost);
    if (target && !reducedMotion()) scene.tweens.add({ targets: ghost, ...point, duration: 100, ease: 'Sine.Out' });
    else ghost.setPosition(point.x, point.y);
  } else if (!target) ghost.setPosition(point.x, point.y);
  ghost.setData('target', target);
}
