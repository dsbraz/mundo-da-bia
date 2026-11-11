import { supportedActor } from './furniture-scale';
import { logicalWidth } from './rendering';
import { itemTexture } from './art-sheet';
import type Phaser from 'phaser';
import type { ActorId, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { drawRoom } from './room';
import { drawPieces, actorDepth, objectDepth } from './piece-art';
import { drawActor } from './art';
import { itemPoint } from './targets';
export function roomPreview(scene: Phaser.Scene, world: World, selected: ActorId, building: boolean, extend = true) {
  const before = new Set(scene.children.list);
  drawRoom(scene, world, extend); drawPieces(scene, world, false, null);
  if (!building) {
    world.actors.filter(a => a.room === world.room).forEach(a => drawActor(scene, supportedActor(world, a), a.id === selected).setDepth(actorDepth(world, a)));
    world.items.forEach(item => { const p = itemPoint(world, item); if (p) scene.add.image(p.x, p.y, itemTexture(item)).setDisplaySize(40, 40).setDepth(objectDepth(world, item)); });
  }
  const objects = scene.children.list.filter(o => !before.has(o));
  objects.sort((a, b) => (a as Phaser.GameObjects.Container).depth - (b as Phaser.GameObjects.Container).depth);
  return scene.add.container(0, 0, objects).setScale(logicalWidth(scene) / roomWidth(world), 1);
}
