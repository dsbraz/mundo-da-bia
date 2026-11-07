import { validPoint } from './geometry';
import type { Layout, Piece, PieceKind, Point, World } from './types';

export const pieceBounds: Record<PieceKind, Point & { width: number; height: number }> = {
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
};
export const fixtures: readonly PieceKind[] = ['sofa', 'wardrobe', 'fridge', 'lamp', 'table', 'stage', 'bed'];
export function initialLayout(): Layout {
  const kinds: PieceKind[] = ['rug', 'sofa', 'wardrobe', 'fridge', 'lamp', 'table', 'stage', 'bed', 'dresser', 'cat-bed'];
  return {
    nextId: kinds.length + 1,
    rooms: { sala: { wall: 'original', floor: 'original' }, quarto: { wall: 'lilac', floor: 'original' } },
    pieces: kinds.map((kind, index) => ({ id: index + 1, kind, room: index < 7 ? 'sala' : 'quarto',
      x: pieceBounds[kind].x, y: pieceBounds[kind].y, color: 'original', flipped: false })),
  };
}
export function fixture(state: World, kind: PieceKind) { return state.layout.pieces.find(p => p.kind === kind); }
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
export function validPlacement(piece: Piece): boolean {
  const box = pieceBounds[piece.kind];
  return Number.isFinite(piece.x) && Number.isFinite(piece.y) && piece.x >= 0 && piece.y >= 65
    && piece.x + box.width <= 1000 && piece.y + box.height <= 600
    && (anchors[piece.kind] ?? []).every(p => validPoint(fromPiece(piece, p))); 
}

const anchors: Partial<Record<PieceKind, Point[]>> = {
  sofa: [{ x: 150, y: 405 }, { x: 245, y: 405 }], bed: [{ x: 790, y: 350 }],
  table: [0, 1, 2, 3].map(i => ({ x: 260 + i * 30, y: 475 })),
  wardrobe: [0, 1, 2, 3].map(i => ({ x: 340 + i * 42, y: 392 })),
  fridge: [{ x: 680, y: 310 }, { x: 680, y: 360 }],
};
