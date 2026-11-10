import type Phaser from 'phaser';
import type { ActorId, ItemId, RoomId, World } from '../domain/types';
import { enterRoom } from '../domain/room-state';
import { itemKind } from '../domain/item-kind';
import { roomPreview } from './room-preview';
import { drawActor } from './art';
/** What a drag across rooms carries over the next room's preview: the character with what it holds, or the object alone. */
export interface TransferShown { figures: Phaser.GameObjects.Container[]; objects: Phaser.GameObjects.Image[]; ghost: Phaser.GameObjects.Image | null }
export function transferPreview(scene: Phaser.Scene, world: World, room: RoomId, selected: ActorId, building: boolean, actor: ActorId | null, item: ItemId | null): TransferShown {
  roomPreview(scene, enterRoom(world, room), selected, building);
  const shown: TransferShown = { figures: [], objects: [], ghost: null };
  if (actor) {
    const value = world.actors.find(a => a.id === actor)!;
    shown.figures = [drawActor(scene, { ...value, seat: null, resting: false }, true).setDepth(750)];
    world.items.filter(i => i.holder === actor).forEach(i => shown.objects.push(scene.add.image(0, 0, itemKind(i)).setDisplaySize(40, 40).setDepth(751)));
  } else if (item) shown.ghost = scene.add.image(0, 0, itemKind(world.items.find(i => i.id === item)!)).setDisplaySize(40, 40).setDepth(750);
  return shown;
}
export function placeTransfer(shown: TransferShown, x: number, y: number) {
  shown.figures[0]?.setPosition(x, y);
  shown.objects.forEach(o => o.setPosition(x + 28, y - 55)); shown.ghost?.setPosition(x, y - 28);
}
/** A swipe between rooms: what is drawn now slides out as one layer while the next room's preview slides in. */
export function slidePreview(scene: Phaser.Scene, world: World, room: RoomId, selected: ActorId, building: boolean) {
  const objects = [...scene.children.list].sort((a, b) => (a as Phaser.GameObjects.Container).depth - (b as Phaser.GameObjects.Container).depth);
  return { room, current: scene.add.container(0, 0, objects), next: roomPreview(scene, enterRoom(world, room), selected, building, false) };
}
export function placeSlide(sliding: { current: Phaser.GameObjects.Container; next: Phaser.GameObjects.Container }, fraction: number, width: number) {
  sliding.current.x = fraction * width;
  sliding.next.x = fraction * width + (fraction < 0 ? width : -width);
}
