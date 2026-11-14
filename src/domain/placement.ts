import { doorway } from './doorway';
import { roomWidth } from './geometry';
import { pieceBounds, validPlacement } from './layout';
import { passages } from './passages';
import type { Piece, World } from './types';
export interface Footprint { left: number; right: number; top: number; bottom: number }
const flat = ['rug', 'picture', 'neon', 'mirror', 'cushion', 'board'];
/** Where the painted floor meets the baseboard: anything that stands on the floor has its base at or below it. */
export const floorBase = 390;
const onWall = ['picture', 'neon', 'mirror', 'cushion', 'board'];
const standsOnFloor = (piece: Piece) => !onWall.includes(piece.kind);
/** A floor piece dropped on the wall slides down until its base touches the baseboard; wall pieces stay where they are. */
export function onFloorPiece(piece: Piece): Piece {
  const bottom = piece.y + pieceBounds[piece.kind].height;
  return standsOnFloor(piece) && bottom < floorBase ? { ...piece, y: floorBase - pieceBounds[piece.kind].height } : piece;
}
export function footprint(piece: Piece): Footprint | null {
  if (flat.includes(piece.kind)) return null;
  const box = pieceBounds[piece.kind];
  const depth = piece.kind === 'bed' ? 100 : Math.min(60, box.height * .35);
  return { left: piece.x + 8, right: piece.x + box.width - 8, top: piece.y + box.height - depth, bottom: piece.y + box.height - 8 };
}
export function overlap(a: Footprint, b: Footprint) { return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); }
/** How much of the piece's picture stands in the room's doorways, stairs and stairwell (the rug lies flat under one's feet). */
export function inPassages(world: Pick<World, 'layout'>, piece: Piece) {
  if (piece.kind === 'rug') return 0;
  const box = pieceBounds[piece.kind], area = { left: piece.x, right: piece.x + box.width, top: piece.y, bottom: piece.y + box.height };
  return passages(world.layout, piece.room).reduce((sum, { zone: z }) => sum + overlap(area, { left: z.x, right: z.x + z.width, top: z.y, bottom: z.y + z.height }), 0);
}
/** Nothing new goes into a passage; a piece an older save left there may move out of it, or less into it. */
function keepsPassagesFree(world: World, piece: Piece) {
  const now = inPassages(world, piece), before = world.layout.pieces.find(p => p.id === piece.id);
  return now === 0 || (!!before && now < inPassages(world, before));
}
export function canPlace(world: World, piece: Piece) {
  if (!validPlacement(piece, roomWidth(world))) return false;
  if (onFloorPiece(piece) !== piece || !keepsPassagesFree(world, piece)) return false;
  const area = footprint(piece); if (!area) return true;
  const others = world.layout.pieces.filter(p => p.room === piece.room && p.id !== piece.id).map(footprint).filter((p): p is Footprint => !!p);
  const room = world.layout.rooms[piece.room]!;
  if (room.cell === 0) { const d = doorway.interior; others.push({ left: d.x - 12, right: d.x + d.width + 12, top: d.y + d.height - 90, bottom: d.y + d.height + 100 }); }
  const before = world.layout.pieces.find(p => p.id === piece.id);
  const old = before && footprint(before);
  return others.every(other => overlap(area, other) === 0 || (!!old && overlap(area, other) < overlap(old, other)));
}
const rows = Array.from({ length: 23 }, (_, i) => 80 + i * 20);
/** The nearest spot where `piece` can stand (and that `fits`, when given), on a 20-unit grid over `ys` (by default the whole floor and wall). */
export function freePlacement(world: World, piece: Piece, ys: readonly number[] = rows, fits: (piece: Piece) => boolean = () => true) {
  const candidates: Piece[] = [];
  for (const y of ys) for (let x = 0; x < roomWidth(world); x += 20) candidates.push({ ...piece, x, y });
  candidates.sort((a, b) => Math.hypot(a.x - piece.x, a.y - piece.y) - Math.hypot(b.x - piece.x, b.y - piece.y));
  return candidates.find(candidate => canPlace(world, candidate) && fits(candidate));
}
