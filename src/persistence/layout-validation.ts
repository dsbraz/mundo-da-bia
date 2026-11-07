import { paletteIds, pieceKinds } from '../domain/types';
import type { Layout, Piece, Room } from '../domain/types';
import { fixtures, validPlacement } from '../domain/layout';
import { roomWidths } from '../domain/geometry';
import { member, positiveId, record, roomId } from './values';
import { validRooms } from './room-validation';
function piece(value: unknown): value is Piece {
  if (!record(value) || !positiveId(value.id)) return false;
  return member(pieceKinds, value.kind) && roomId(value.room) && member(paletteIds, value.color)
    && typeof value.flipped === 'boolean' && (value.active === undefined || typeof value.active === 'boolean')
    && typeof value.x === 'number' && typeof value.y === 'number';
}
export function validLayout(value: unknown): value is Layout {
  if (!record(value) || !positiveId(value.nextId) || !Array.isArray(value.pieces)) return false;
  if (!validRooms(value.rooms, value.nextRoomId)) return false;
  if (!value.pieces.every(piece)) return false;
  const rooms = value.rooms as Record<string, Room>; const nextId = value.nextId;
  if (!value.pieces.every(p => Object.hasOwn(rooms, p.room) && validPlacement(p, roomWidths[rooms[p.room]!.size]))) return false;
  const ids = value.pieces.map(p => p.id);
  const kinds = value.pieces.filter(p => fixtures.includes(p.kind)).map(p => `${p.room}:${p.kind}`);
  return new Set(ids).size === ids.length && ids.every(id => id < nextId) && new Set(kinds).size === kinds.length;
}
