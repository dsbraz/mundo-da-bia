import { visualPiecePoint, logicalPiecePoint } from './furniture-scale';
import { freeFor, seatPiece, seatPoint, seatRef, seatsOf } from '../domain/seats';
import { fixture, pieceBounds, toPiece } from '../domain/layout';
import { usableKinds } from '../domain/use';
import { benchKinds } from '../domain/recipes';
import type { Actor, Home, Piece, PieceKind, Point, SeatRef, Spot, World } from '../domain/types';

function hit(state: World, kind: PieceKind, p: Point, x: number, y: number, width: number, height: number) {
  const piece = fixture(state, kind);
  return !!piece && piece.room === state.room && inside(piece, p, x, y, width, height);
}
function inside(piece: Piece, p: Point, x: number, y: number, width: number, height: number) {
  const point = toPiece(piece, logicalPiecePoint(piece, p));
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}
export function furnitureAt(state: World, p: Point): keyof Home | undefined {
  if (hit(state, 'lamp', p, 10, 160, 95, 110)) return 'lamp';
  if (hit(state, 'fridge', p, 625, 200, 120, 185)) return 'fridge';
  if (hit(state, 'wardrobe', p, 315, 350, 182, 45)) return 'drawer';
  return undefined;
}
export function surfaceAt(state: World, p: Point): Exclude<Spot, 'floor'> | undefined {
  if (hit(state, 'table', p, 165, 435, 230, 52)) return 'table';
  if (state.home.drawer && hit(state, 'wardrobe', p, 315, 350, 182, 45)) return 'drawer';
  if (state.home.fridge && hit(state, 'fridge', p, 625, 270, 120, 115)) return 'fridge';
  return undefined;
}
/** The seat under `p` (W3L-06): any bed's mattress lies down there, otherwise the nearest drawn seat within 45 × 55 px; for a dropped
 *  `actor` (W3L-17), a free seat that fits her within 60 px of her feet pulls her in (the seat magnet). */
export function seatAt(state: World, p: Point, actor?: Actor): SeatRef | undefined {
  const pieces = state.layout.pieces.filter(piece => piece.room === state.room);
  const bed = [...pieces].reverse().find(piece => piece.kind === 'bed' && inside(piece, p, 565, 271, 404, 110));
  if (bed) return seatRef(bed.id, 0);
  const seats = pieces.flatMap(seatsOf).map(seat => ({ seat, at: visualPiecePoint(seatPiece(state, seat)!, seatPoint(state, seat)!) }))
    .sort((a, b) => Math.hypot(a.at.x - p.x, a.at.y - p.y) - Math.hypot(b.at.x - p.x, b.at.y - p.y));
  const under = seats.find(({ at }) => Math.abs(at.x - p.x) <= 45 && Math.abs(at.y - p.y) <= 55)?.seat;
  return under ?? (actor ? seats.find(({ seat, at }) => Math.hypot(at.x - p.x, at.y - p.y) <= 60 && freeFor(state, actor, seat))?.seat : undefined);
}
export function stageHit(state: World, p: Point) { return hit(state, 'stage', p, 830, 80, 170, 340); }
export function wardrobeHit(state: World, p: Point) { return hit(state, 'wardrobe', p, 305, 150, 195, 195); }

export function usableAt(state: World, point: Point) {
  return [...state.layout.pieces].reverse().find(piece => {
    const box = pieceBounds[piece.kind];
    return piece.room === state.room && (usableKinds.includes(piece.kind) || benchKinds.includes(piece.kind))
      && point.x >= piece.x && point.x <= piece.x + box.width && point.y >= piece.y && point.y <= piece.y + box.height;
  });
}
