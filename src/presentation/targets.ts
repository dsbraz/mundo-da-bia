import { handAnchor, posePoint } from './pose';
import { fixture, fromPiece } from '../domain/layout';
import { availableSpot } from '../domain/furniture';
import { lookIds } from '../domain/types';
import type { Actor, Item, ItemId, LookId, Point, World } from '../domain/types';
export type VisibleWorld = World & {
  visibleItems?: ReadonlyMap<ItemId, Point>; visibleDepth?: ReadonlyMap<string, number>;
  occludingDepth?: (point: Point) => number; itemDepth?: ReadonlyMap<ItemId, number>;
  actorHit?: (actor: Actor, point: Point) => boolean;
};
export type DragToken = { kind: 'item'; id: ItemId } | { kind: 'look'; id: LookId };
export type DragPreview = DragToken & { point: Point };
export const wardrobeSlots = lookIds.map((id, index) => ({ id, x: 335 + index % 4 * 46, y: 180 + Math.floor(index / 4) * 44 }));
export function slotsFor(state: World) {
  const wardrobe = fixture(state, 'wardrobe');
  return wardrobe?.room === state.room ? wardrobeSlots.map(slot => ({ ...slot, ...fromPiece(wardrobe, slot) })) : [];
}
export function actorAt(state: VisibleWorld, p: Point) {
  return [...state.actors].sort((a, b) => (state.visibleDepth?.get(a.id) ?? a.y) - (state.visibleDepth?.get(b.id) ?? b.y)).reverse().find(a => a.room === state.room
    && (state.visibleDepth?.get(a.id) ?? a.y) >= (state.occludingDepth?.(p) ?? 0)
    && (state.actorHit ? state.actorHit(a, p) : actorContains(a, p)));
}
export function itemPoint(state: VisibleWorld, item: Item): Point | null {
  const visible = state.visibleItems?.get(item.id); if (visible) return visible;
  const holder = state.actors.find(a => a.id === item.holder);
  if (holder) return holder.room === state.room ? handPoint(holder) : null;
  return item.room === state.room && availableSpot(state, item.spot) ? { x: item.x, y: item.y - 28 } : null;
}
export function sourceAt(state: VisibleWorld, p: Point, wardrobe: boolean): DragToken | undefined {
  const foreground = foregroundDepth(state, p);
  const item = [...state.items].reverse().sort((a, b) => (state.itemDepth?.get(b.id) ?? b.y) - (state.itemDepth?.get(a.id) ?? a.y)).find(i => {
    const position = itemPoint(state, i);
    return position && (state.itemDepth?.get(i.id) ?? Infinity) >= foreground && Math.abs(position.x - p.x) <= 20 && Math.abs(position.y - p.y) <= 20;
  });
  if (item) return { kind: 'item', id: item.id };
  if (actorAt(state, p)) return undefined;
  if (wardrobe) {
    const look = slotsFor(state).find(slot => Math.abs(slot.x - p.x) < 23 && Math.abs(slot.y - p.y) < 30);
    if (look) return { kind: 'look', id: look.id };
  }
  return undefined;
}

function actorContains(actor: Actor, p: Point): boolean {
  if (actor.seat === 'bed') return p.x >= actor.x - 185 && p.x <= actor.x + 20 && Math.abs(p.y - actor.y) < 45;
  return Math.abs(actor.x - p.x) < 43 && p.y <= actor.y + 20 && p.y >= actor.y - (actor.kind === 'cat' ? 100 : 175);
}

export function handPoint(actor: Actor): Point {
  return posePoint(actor, handAnchor(actor));
}

export function previewPoint(state: World, drag: DragPreview): Point {
  const target = actorAt(state, drag.point);
  return target && drag.kind === 'item' ? handPoint(target) : drag.point;
}

function foregroundDepth(state: VisibleWorld, point: Point) {
  return Math.max(state.occludingDepth?.(point) ?? 0, state.visibleDepth?.get(actorAt(state, point)?.id ?? '') ?? 0);
}
