import { paletteIds, pieceKinds, roomIds } from '../domain/types';
import type { Layout, Piece } from '../domain/types';
import { fixtures, validPlacement } from '../domain/layout';
import { member, positiveId, record } from './values';

function piece(value: unknown): value is Piece {
  if (!record(value) || !positiveId(value.id)) return false;
  return member(pieceKinds, value.kind) && member(roomIds, value.room) && member(paletteIds, value.color)
    && typeof value.flipped === 'boolean' && position(value);
}
function position(value: Record<string, unknown>) {
  return typeof value.x === 'number' && typeof value.y === 'number' && validPlacement(value as unknown as Piece);
}
function finish(value: unknown): boolean { return record(value) && member(paletteIds, value.wall) && member(paletteIds, value.floor); }
export function validLayout(value: unknown): value is Layout {
  if (!record(value) || !positiveId(value.nextId) || !Array.isArray(value.pieces)) return false;
  const rooms = value.rooms; const nextId = value.nextId;
  if (!record(rooms) || !roomIds.every(room => finish(rooms[room]))) return false;
  if (!value.pieces.every(piece)) return false;
  const ids = value.pieces.map(p => p.id);
  const kinds = value.pieces.map(p => p.kind).filter(kind => fixtures.includes(kind));
  return new Set(ids).size === ids.length && ids.every(id => id < nextId)
    && new Set(kinds).size === kinds.length;
}
