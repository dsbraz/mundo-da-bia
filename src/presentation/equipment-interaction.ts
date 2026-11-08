import { pieceBounds, fixture } from '../domain/layout';
import { seatPoint } from '../domain/furniture';
import { roomWidth } from '../domain/geometry';
import type { Action, ActorId, Point, World } from '../domain/types';
import { walkingPath } from './walking-path';
import { furnitureAt, seatAt, usableAt, wardrobeHit } from './furniture-targets';
export function equipmentAction(world: World, actor: ActorId, point: Point): Action | 'wardrobe' | null {
  if (wardrobeHit(world, point)) return 'wardrobe';
  const seat = seatAt(world, point); if (seat) return { type: 'sit', actor, seat };
  const target = furnitureAt(world, point); if (target) return { type: 'interact', target };
  const piece = usableAt(world, point); return piece ? { type: 'use', id: piece.id } : null;
}
export function approach(world: World, actor: ActorId, action: Action): Point | null {
  const resident = world.actors.find(a => a.id === actor)!;
  if (resident.room !== world.room) return null;
  if (action.type === 'sit' && world.actors.some(a => a.id !== actor && a.room === world.room && a.seat === action.seat)) return null;
  const anchor = targetPoint(world, action); if (!anchor) return null;
  for (const dy of [0, -100, -160]) {
    const found = reachable(world, resident, anchor, dy);
    if (found) return found;
  }
  return null;
}
function targetPoint(world: World, action: Action): Point | null {
  if (action.type === 'sit') { const p = seatPoint(world, action.seat); return p ? { x: p.x, y: p.y + 80 } : null; }
  const piece = action.type === 'use' ? world.layout.pieces.find(p => p.id === action.id) : action.type === 'interact' ? fixture(world, action.target === 'drawer' ? 'wardrobe' : action.target) : undefined;
  if (!piece) return null;
  const box = pieceBounds[piece.kind]; return { x: piece.x + box.width / 2, y: piece.y + box.height + 40 };
}

function reachable(world: World, start: Point, anchor: Point, dy: number): Point | null {
  for (const dx of [0, -50, 50, -100, 100]) {
    const point = { x: Math.max(60, Math.min(roomWidth(world) - 60, anchor.x + dx)), y: Math.max(280, Math.min(540, anchor.y + dy)) };
    if (walkingPath(world, start, point)) return point;
  }
  return null;
}
