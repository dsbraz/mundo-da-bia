import { logicalWidth } from './rendering';
import { itemKind } from '../domain/item-kind';
import type Phaser from 'phaser';
import type { ActorId, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { drawRoom } from './room';
import { drawPieces, actorDepth } from './piece-art';
import { drawActor } from './art';
import { itemPoint } from './targets';
export function roomPreview(scene: Phaser.Scene, world: World, selected: ActorId, building: boolean) {
  const before = new Set(scene.children.list);
  drawRoom(scene, world); drawPieces(scene, world, false, null);
  if (!building) {
    world.actors.filter(a => a.room === world.room).forEach(a => drawActor(scene, a, a.id === selected).setDepth(actorDepth(world, a)));
    world.items.forEach(item => { const p = itemPoint(world, item); if (p) scene.add.image(p.x, p.y, itemKind(item)).setDisplaySize(40, 40).setDepth(650); });
  }
  const objects = scene.children.list.filter(o => !before.has(o));
  objects.sort((a, b) => (a as Phaser.GameObjects.Container).depth - (b as Phaser.GameObjects.Container).depth);
  return scene.add.container(0, 0, objects).setScale(logicalWidth(scene) / roomWidth(world), 1);
}
