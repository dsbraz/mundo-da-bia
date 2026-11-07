import { lookIds } from '../domain/types';
import type { Item, ItemId, LookId, Point, World } from '../domain/types';
export type DragToken = { kind: 'item'; id: ItemId } | { kind: 'look'; id: LookId };
export type DragPreview = DragToken & { point: Point };
export const wardrobeSlots = lookIds.map((id, index) => ({ id, x: 340 + index % 3 * 80, y: 155 + Math.floor(index / 3) * 70 }));
export function wardrobeHit(p: Point) { return p.x >= 285 && p.x <= 575 && p.y >= 85 && p.y <= 255; }
export function actorAt(state: World, p: Point) {
  return [...state.actors].sort((a, b) => a.y - b.y).reverse().find(a => a.room === state.room
    && Math.abs(a.x - p.x) < 45 && p.y <= a.y + 20 && p.y >= a.y - (a.kind === 'cat' ? 100 : 140));
}
export function itemPoint(state: World, item: Item): Point | null {
  const holder = state.actors.find(a => a.id === item.holder);
  if (holder) return holder.room === state.room ? { x: holder.x + 28, y: holder.y - 55 } : null;
  return item.room === state.room ? { x: item.x, y: item.y - 28 } : null;
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
