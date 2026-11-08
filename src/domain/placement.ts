import { doorway } from './doorway';
import { roomWidth } from './geometry';
import { pieceBounds, validPlacement } from './layout';
import type { Piece, World } from './types';
export interface Footprint { left: number; right: number; top: number; bottom: number }
const flat = ['rug', 'picture', 'neon', 'mirror', 'cushion'];
export function footprint(piece: Piece): Footprint | null {
  if (flat.includes(piece.kind)) return null;
  const box = pieceBounds[piece.kind];
  const depth = piece.kind === 'bed' ? 100 : Math.min(60, box.height * .35);
  return { left: piece.x + 8, right: piece.x + box.width - 8, top: piece.y + box.height - depth, bottom: piece.y + box.height - 8 };
}
export function overlap(a: Footprint, b: Footprint) { return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); }
export function canPlace(world: World, piece: Piece) {
  if (!validPlacement(piece, roomWidth(world))) return false;
  const area = footprint(piece); if (!area) return true;
  const others = world.layout.pieces.filter(p => p.room === piece.room && p.id !== piece.id).map(footprint).filter((p): p is Footprint => !!p);
  const room = world.layout.rooms[piece.room]!;
  if (room.cell === 0) { const d = doorway.interior; others.push({ left: d.x - 12, right: d.x + d.width + 12, top: d.y + d.height - 90, bottom: d.y + d.height + 100 }); }
  const before = world.layout.pieces.find(p => p.id === piece.id);
  const old = before && footprint(before);
  return others.every(other => overlap(area, other) === 0 || (!!old && overlap(area, other) < overlap(old, other)));
}
export function freePlacement(world: World, piece: Piece) {
  const candidates: Piece[] = [];
  for (let y = 80; y <= 520; y += 20) for (let x = 0; x < roomWidth(world); x += 20) candidates.push({ ...piece, x, y });
  candidates.sort((a, b) => Math.hypot(a.x - piece.x, a.y - piece.y) - Math.hypot(b.x - piece.x, b.y - piece.y));
  return candidates.find(candidate => canPlace(world, candidate));
}
