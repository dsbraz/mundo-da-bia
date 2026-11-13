import { validPoint } from './geometry';
import type { Layout, Piece, PieceKind, Point, RoomId, World } from './types';

export const pieceBounds: Record<PieceKind, Point & { width: number; height: number }> = {
  sink: { x: 0, y: 0, width: 180, height: 160 }, washer: { x: 0, y: 0, width: 130, height: 155 },
  planter: { x: 0, y: 0, width: 170, height: 130 }, 'picnic-table': { x: 0, y: 0, width: 240, height: 150 },
  bookcase: { x: 0, y: 0, width: 160, height: 220 }, 'kitchen-cart': { x: 0, y: 0, width: 140, height: 150 },
  armchair: { x: 0, y: 0, width: 180, height: 180 },
  'reading-lamp': { x: 0, y: 0, width: 100, height: 220 },
  'side-table': { x: 0, y: 0, width: 130, height: 110 },
  piano: { x: 0, y: 0, width: 220, height: 170 }, tv: { x: 0, y: 0, width: 200, height: 180 },
  aquarium: { x: 0, y: 0, width: 180, height: 160 },
  counter: { x: 0, y: 0, width: 220, height: 130 },
  stove: { x: 0, y: 0, width: 110, height: 140 },
  bath: { x: 0, y: 0, width: 240, height: 150 },
  desk: { x: 0, y: 0, width: 200, height: 145 },
  shelf: { x: 0, y: 0, width: 120, height: 220 },
  sofa: { x: 60, y: 270, width: 270, height: 170 },
  wardrobe: { x: 292, y: 90, width: 226, height: 320 },
  fridge: { x: 620, y: 195, width: 145, height: 195 },
  lamp: { x: 0, y: 160, width: 150, height: 280 },
  table: { x: 160, y: 425, width: 240, height: 115 },
  stage: { x: 830, y: 80, width: 170, height: 340 },
  bed: { x: 555, y: 145, width: 425, height: 275 },
  dresser: { x: 295, y: 180, width: 185, height: 220 },
  'cat-bed': { x: 70, y: 300, width: 200, height: 130 },
  rug: { x: 90, y: 440, width: 810, height: 155 },
  plant: { x: 0, y: 0, width: 85, height: 105 },
  picture: { x: 0, y: 0, width: 80, height: 90 },
  cushion: { x: 0, y: 0, width: 65, height: 50 },
  neon: { x: 0, y: 0, width: 160, height: 75 },
  speaker: { x: 0, y: 0, width: 65, height: 95 },
  mirror: { x: 0, y: 0, width: 100, height: 150 },
  chair: { x: 0, y: 0, width: 90, height: 130 },
  'market-shelf': { x: 0, y: 0, width: 170, height: 220 }, checkout: { x: 0, y: 0, width: 200, height: 140 },
  board: { x: 0, y: 0, width: 400, height: 240 }, 'school-desk': { x: 0, y: 0, width: 150, height: 120 },
};
/** One of each per room: the pieces the home's switches and spots belong to (seats may repeat, W3L-06). */
export const fixtures: readonly PieceKind[] = ['wardrobe', 'fridge', 'lamp', 'table', 'stage'];
/** Where a new game puts the pieces that would stand in a doorway: the cat bed and the dresser right of the bedroom's door back; in the
 *  wider living room (1200, so the stage fits before its doorway) the stage leaves room at its right for the lamp, which the stairs of a
 *  second floor push there. */
const opening: Partial<Record<PieceKind, number>> = { 'cat-bed': 136, dresser: 340, stage: 760 };
export function initialLayout(): Layout {
  const kinds: PieceKind[] = ['rug', 'sofa', 'wardrobe', 'fridge', 'lamp', 'table', 'stage', 'bed', 'dresser', 'cat-bed'];
  return {
    nextId: kinds.length + 1, nextRoomId: 3,
    rooms: {
      sala: { name: 'Sala & palco', template: 'empty', size: 'medium', cell: 0, home: { lamp: true, fridge: true, drawer: false }, wall: 'original', floor: 'original' },
      quarto: { name: 'Quarto dos sonhos', template: 'bedroom', size: 'small', cell: 1, home: { lamp: true, fridge: true, drawer: false }, wall: 'lilac', floor: 'original' },
    },
    pieces: kinds.map((kind, index) => ({ id: index + 1, kind, room: index < 7 ? 'sala' : 'quarto',
      x: opening[kind] ?? pieceBounds[kind].x, y: pieceBounds[kind].y, color: 'original', flipped: false })),
  };
}
export function fixture(state: World, kind: PieceKind, room: RoomId = state.room) { return state.layout.pieces.find(p => p.kind === kind && p.room === room); }
export function fromPiece(piece: Piece, point: Point): Point {
  const box = pieceBounds[piece.kind];
  const dx = point.x - box.x;
  return { x: piece.x + (piece.flipped ? box.width - dx : dx), y: piece.y + point.y - box.y };
}
export function toPiece(piece: Piece, point: Point): Point {
  const box = pieceBounds[piece.kind];
  const dx = point.x - piece.x;
  return { x: box.x + (piece.flipped ? box.width - dx : dx), y: box.y + point.y - piece.y };
}
export function validPlacement(piece: Piece, width = 1000): boolean {
  const box = pieceBounds[piece.kind];
  return Number.isFinite(piece.x) && Number.isFinite(piece.y) && piece.x >= 0 && piece.y >= 65
    && piece.x + box.width <= width && piece.y + box.height <= 600
    && (anchors[piece.kind] ?? []).every(p => validPoint(fromPiece(piece, p), width));
}

const anchors: Partial<Record<PieceKind, Point[]>> = {
  armchair: [{ x: 90, y: 145 }],
  sofa: [{ x: 150, y: 405 }, { x: 245, y: 405 }], bed: [{ x: 790, y: 350 }],
  table: [0, 1, 2, 3].map(i => ({ x: 260 + i * 30, y: 475 })),
  wardrobe: [0, 1, 2, 3].map(i => ({ x: 340 + i * 42, y: 392 })),
  fridge: [{ x: 680, y: 310 }, { x: 680, y: 360 }],
};
