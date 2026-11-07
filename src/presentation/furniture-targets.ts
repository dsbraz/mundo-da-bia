import { seatPoint } from '../domain/furniture';
import { fixture, pieceBounds, toPiece } from '../domain/layout';
import { seatIds } from '../domain/types';
import type { Home, PieceKind, Point, Spot, World } from '../domain/types';

function hit(state: World, kind: PieceKind, p: Point, x: number, y: number, width: number, height: number) {
  const piece = fixture(state, kind);
  if (!piece || piece.room !== state.room) return false;
  const point = toPiece(piece, p);
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
export function seatAt(state: World, p: Point) {
  return seatIds.find(id => {
    const seat = seatPoint(state, id);
    return seat && seat.room === state.room && Math.abs(seat.x - p.x) <= 45 && Math.abs(seat.y - p.y) <= 55;
  });
}
export function wardrobeHit(state: World, p: Point) { return hit(state, 'wardrobe', p, 305, 150, 195, 195); }

export function usableAt(state: World, point: Point) {
  return [...state.layout.pieces].reverse().find(piece => {
    const box = pieceBounds[piece.kind];
    return piece.room === state.room && ['stove', 'bath', 'desk', 'speaker', 'mirror', 'piano', 'tv', 'aquarium', 'reading-lamp'].includes(piece.kind)
      && point.x >= piece.x && point.x <= piece.x + box.width && point.y >= piece.y && point.y <= piece.y + box.height;
  });
}
