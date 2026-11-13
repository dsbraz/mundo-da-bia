import { pieceBounds, fixture } from '../domain/layout';
import { seatPiece, seatPoint, seatRef } from '../domain/seats';
import { onToilet } from '../domain/toilet';
import { usableKinds } from '../domain/use';
import type { Action, ActorId, PieceKind, Point, World } from '../domain/types';
import { isSchool } from '../domain/school';
import { walkingPath } from './walking-path';
import { onFloor } from './floor-band';
import { furnitureAt, seatAt, stageHit, usableAt, wardrobeHit } from './furniture-targets';
/** A tap on a seat sits there, except on a piece that switches on; a school's desk (W3L-26) is a seat to sit at. */
const sitsThere = (world: World, kind: PieceKind) => !usableKinds.includes(kind) || (kind === 'desk' && isSchool(world.layout, world.room));
export function equipmentAction(world: World, actor: ActorId, point: Point): Action | 'wardrobe' | null {
  if (wardrobeHit(world, point)) return 'wardrobe';
  // The toilet: a touch anywhere on it flushes when someone sits there, otherwise sits on it.
  const toilet = toiletAt(world, point); if (toilet) return onToilet(world, toilet) ? { type: 'use', id: toilet.id } : { type: 'sit', actor, seat: seatRef(toilet.id, 0) };
  const seat = seatAt(world, point); if (seat && sitsThere(world, seatPiece(world, seat)!.kind)) return { type: 'sit', actor, seat };
  const target = furnitureAt(world, point); if (target) return { type: 'interact', target };
  if (stageHit(world, point)) return { type: 'show' };
  const piece = usableAt(world, point); return piece ? { type: 'use', id: piece.id } : null;
}
function toiletAt(world: World, point: Point) {
  const { width, height } = pieceBounds.toilet;
  return [...world.layout.pieces].reverse().find(p => p.room === world.room && p.kind === 'toilet' && point.x >= p.x && point.x <= p.x + width && point.y >= p.y && point.y <= p.y + height);
}
export function approach(world: World, actor: ActorId, action: Action): Point | null {
  const resident = world.actors.find(a => a.id === actor)!;
  if (resident.room !== world.room) return null;
  const anchor = targetPoint(world, action); if (!anchor) return null;
  return nearestApproach(world, resident, anchor);
}
function targetPoint(world: World, action: Action): Point | null {
  if (action.type === 'sit') { const p = seatPoint(world, action.seat); return p ? { x: p.x, y: p.y + 80 } : null; }
  const piece = action.type === 'use' ? world.layout.pieces.find(p => p.id === action.id) : action.type === 'interact' ? fixture(world, action.target === 'drawer' ? 'wardrobe' : action.target) : undefined;
  if (!piece) return null;
  const box = pieceBounds[piece.kind]; return { x: piece.x + box.width / 2, y: piece.y + box.height + 40 };
}

export function nearestApproach(world: World, start: Point, anchor: Point): Point | null {
  const candidates = [0, 40, 80].flatMap(dy => [0, -50, 50, -100, 100].map(dx => onFloor(world, { x: anchor.x + dx, y: anchor.y + dy })));
  const routes = candidates.map(point => ({ point, path: walkingPath(world, start, point) })).filter(route => route.path);
  routes.sort((a, b) => pathLength(start, a.path!) - pathLength(start, b.path!));
  return routes[0]?.point ?? null;
}
function pathLength(start: Point, path: Point[]) {
  let previous = start, length = 0;
  for (const point of path) { length += Math.hypot(point.x - previous.x, point.y - previous.y); previous = point; }
  return length;
}
