import { availableSpot } from '../domain/furniture';
import { lookIds } from '../domain/types';
import type { Actor, Item, ItemId, LookId, Point, World } from '../domain/types';
export type DragToken = { kind: 'item'; id: ItemId } | { kind: 'look'; id: LookId };
export type DragPreview = DragToken & { point: Point };
export const wardrobeSlots = lookIds.map((id, index) => ({ id, x: 345 + index % 3 * 60, y: 220 + Math.floor(index / 3) * 85 }));
export function wardrobeHit(p: Point) { return p.x >= 305 && p.x <= 500 && p.y >= 150 && p.y <= 345; }
export function actorAt(state: World, p: Point) {
  return [...state.actors].sort((a, b) => a.y - b.y).reverse().find(a => a.room === state.room
    && actorContains(a, p));
}
export function itemPoint(state: World, item: Item): Point | null {
  const holder = state.actors.find(a => a.id === item.holder);
  if (holder) return holder.room === state.room ? handPoint(holder) : null;
  return item.room === state.room && availableSpot(state, item.spot) ? { x: item.x, y: item.y - 28 } : null;
}
export function sourceAt(state: World, p: Point, wardrobe: boolean): DragToken | undefined {
  const item = [...state.items].reverse().find(i => {
    const position = itemPoint(state, i);
    return position && Math.hypot(position.x - p.x, position.y - p.y) < 28;
  });
  if (item) return { kind: 'item', id: item.id };
  if (actorAt(state, p)) return undefined;
  if (wardrobe && state.room === 'sala') {
    const look = wardrobeSlots.find(slot => Math.abs(slot.x - p.x) < 32 && Math.abs(slot.y - p.y) < 30);
    if (look) return { kind: 'look', id: look.id };
  }
  return undefined;
}

function actorContains(actor: Actor, p: Point): boolean {
  if (actor.seat === 'bed') return p.x >= actor.x - 185 && p.x <= actor.x + 20 && Math.abs(p.y - actor.y) < 45;
  return Math.abs(actor.x - p.x) < 50 && p.y <= actor.y + 20 && p.y >= actor.y - (actor.kind === 'cat' ? 115 : 205);
}

function handPoint(actor: Actor): Point {
  return actor.seat === 'bed' ? { x: actor.x - 55, y: actor.y - 28 } : { x: actor.x + 28, y: actor.y - 55 };
}
