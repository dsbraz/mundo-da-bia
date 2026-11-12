import { pieceBounds } from '../domain/layout';
import { seatPiece } from '../domain/seats';
import { posed } from './posture';
import type { Posed } from './posture';
import type { Actor, Piece, PieceKind, Point, World } from '../domain/types';
import { floorTop } from './floor-band';
const scales: Record<PieceKind, readonly [number, number]> = {
  sofa: [.94, .82], armchair: [.9, .84], bed: [.92, .8], 'cat-bed': [.78, .8],
  wardrobe: [.94, .84], fridge: [.96, .92], lamp: [.85, .84], 'reading-lamp': [.88, .92],
  table: [.96, .82], 'side-table': [.9, .88], counter: [.98, .9], desk: [.96, .9],
  sink: [.96, .9], washer: [.94, .9], stove: [.96, .92], bath: [.94, .86],
  dresser: [.92, .8], shelf: [.92, .96], bookcase: [.96, .96], 'kitchen-cart': [.94, .88],
  'picnic-table': [.96, .88], piano: [.96, .9], tv: [.94, .9], aquarium: [.94, .9],
  stage: [.94, .9], planter: [.94, .9], plant: [1, 1], picture: [1, 1], rug: [1, 1],
  cushion: [.9, .9], neon: [1, 1], speaker: [.92, .94], mirror: [.94, .96], chair: [1, 1],
};
export function visualPiecePoint(piece: Piece, point: Point): Point {
  const box = pieceBounds[piece.kind], [x, y] = scales[piece.kind];
  const cx = piece.x + box.width / 2, cy = piece.y + box.height;
  return { x: cx + (point.x - cx) * x, y: cy + (point.y - cy) * y };
}
export function logicalPiecePoint(piece: Piece, point: Point): Point {
  const box = pieceBounds[piece.kind], [x, y] = scales[piece.kind];
  const cx = piece.x + box.width / 2, cy = piece.y + box.height;
  return { x: cx + (point.x - cx) / x, y: cy + (point.y - cy) / y };
}
export function furnitureTransform(kind: PieceKind) {
  const box = pieceBounds[kind], [x, y] = scales[kind];
  return `translate(${(box.x + box.width / 2) * (1 - x)} ${(box.y + box.height) * (1 - y)}) scale(${x} ${y})`;
}
/** Where a character is drawn: on its seat's drawn piece (lying on a bed), or with the feet on the painted floor. */
export function supportedActor(world: World, actor: Actor): Posed {
  const piece = actor.seat ? seatPiece(world, actor.seat, actor.room) : undefined;
  return piece ? { ...posed(world, actor), ...visualPiecePoint(piece, actor) } : { ...actor, y: Math.max(floorTop(world), actor.y) };
}
