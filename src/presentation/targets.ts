import { supportedActor, visualPiecePoint } from './furniture-scale';
import { handAnchor, posePoint, contextScale, visualContext } from './pose';
import type { VisualContext } from './pose';
import { fixture, fromPiece } from '../domain/layout';
import { availableSpot, spotKind } from '../domain/furniture';
import { lookIds } from '../domain/types';
import type { Actor, Item, ItemId, LookId, Point, World } from '../domain/types';
import { floorTop } from './floor-band';
export type VisibleWorld = World & {
  visibleItems?: ReadonlyMap<ItemId, Point>; visibleDepth?: ReadonlyMap<string, number>;
  occludingDepth?: (point: Point) => number; itemDepth?: ReadonlyMap<ItemId, number>;
  actorHit?: (actor: Actor, point: Point) => boolean;
};
export type DragToken = { kind: 'item'; id: ItemId } | { kind: 'look'; id: LookId };
export type DragPreview = DragToken & { point: Point };
// The physical wardrobe has twenty hangers; the Looks tray contains the full catalog.
export const wardrobeSlots = lookIds.slice(0, 20).map((id, index) => ({ id, x: 335 + index % 4 * 46, y: 180 + Math.floor(index / 4) * 34 }));
export function slotsFor(state: World) {
  const wardrobe = fixture(state, 'wardrobe');
  return wardrobe?.room === state.room ? wardrobeSlots.map(slot => ({ ...slot, ...visualPiecePoint(wardrobe, fromPiece(wardrobe, slot)) })) : [];
}
export function actorAt(state: VisibleWorld, p: Point) {
  return [...state.actors].sort((a, b) => (state.visibleDepth?.get(a.id) ?? a.y) - (state.visibleDepth?.get(b.id) ?? b.y)).reverse().find(a => a.room === state.room
    && (state.visibleDepth?.get(a.id) ?? a.y) >= (state.occludingDepth?.(p) ?? 0)
    && (state.actorHit ? state.actorHit(a, p) : actorContains(a, p, visualContext(state))));
}
export function itemPoint(state: VisibleWorld, item: Item): Point | null {
  const visible = state.visibleItems?.get(item.id); if (visible) return visible;
  const holder = state.actors.find(a => a.id === item.holder);
  if (holder) return holder.room === state.room ? handPoint(state.visibleItems ? holder : supportedActor(state, holder), visualContext(state)) : null;
  if (item.room !== state.room || !availableSpot(state, item.spot)) return null;
  const point = { x: item.x, y: restingY(state, item) - 28 * contextScale(visualContext(state)) };
  const support = item.spot !== 'floor' && fixture(state, spotKind(item.spot));
  return support ? visualPiecePoint(support, point) : point;
}
/** Floor objects saved outside the floor band are drawn resting on it; the save keeps its value. */
function restingY(state: World, item: Item) { return item.spot === 'floor' && !state.streetWidth ? Math.max(floorTop(state), Math.min(540, item.y)) : item.y; }
export function sourceAt(state: VisibleWorld, p: Point, wardrobe: boolean): DragToken | undefined {
  const foreground = foregroundDepth(state, p);
  const item = [...state.items].reverse().sort((a, b) => (state.itemDepth?.get(b.id) ?? b.y) - (state.itemDepth?.get(a.id) ?? a.y)).find(i => {
    const position = itemPoint(state, i);
    return position && (state.itemDepth?.get(i.id) ?? Infinity) >= foreground && Math.abs(position.x - p.x) <= 20 * contextScale(visualContext(state)) && Math.abs(position.y - p.y) <= 20 * contextScale(visualContext(state));
  });
  if (item) return { kind: 'item', id: item.id };
  if (actorAt(state, p)) return undefined;
  if (wardrobe) {
    const look = slotsFor(state).find(slot => Math.abs(slot.x - p.x) < 14 && Math.abs(slot.y - p.y) < 14);
    if (look) return { kind: 'look', id: look.id };
  }
  return undefined;
}

function actorContains(actor: Actor, point: Point, context: VisualContext): boolean {
  const scale = contextScale(context);
  const p = { x: actor.x + (point.x - actor.x) / scale, y: actor.y + (point.y - actor.y) / scale };
  if (actor.seat === 'bed') return p.x >= actor.x - 185 && p.x <= actor.x + 20 && Math.abs(p.y - actor.y) < 45;
  return Math.abs(actor.x - p.x) < 43 && p.y <= actor.y + 20 && p.y >= actor.y - (actor.kind === 'cat' ? 100 : 175);
}

export function handPoint(actor: Actor, context: VisualContext = 'interior'): Point {
  return posePoint(actor, handAnchor(actor), context);
}

export function previewPoint(state: World, drag: DragPreview): Point {
  const target = actorAt(state, drag.point);
  return target && drag.kind === 'item' ? handPoint(target, visualContext(state)) : drag.point;
}

function foregroundDepth(state: VisibleWorld, point: Point) {
  return Math.max(state.occludingDepth?.(point) ?? 0, state.visibleDepth?.get(actorAt(state, point)?.id ?? '') ?? 0);
}
