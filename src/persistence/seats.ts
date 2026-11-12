import { parseSeat, seatRef, seatSlots } from '../domain/seats';
import type { PieceKind } from '../domain/types';
import { record } from './values';
import type { RecordValue } from './values';

/** The four seats saves had before W3L-06: the first piece of that kind in the room, and which of its seats. */
const legacy: Record<string, readonly [PieceKind, number]> = { 'sofa-left': ['sofa', 0], 'sofa-right': ['sofa', 1], bed: ['bed', 0], armchair: ['armchair', 0] };
/** A saved seat as this build reads it (§4): an old id becomes `<first piece of its kind>.<slot>`; a seat whose piece is missing, is not a
 *  seat or lacks that slot becomes null (she stands where she was), and so does anything that is not a string. */
export function knownSeat(pieces: unknown, room: unknown, seat: unknown): unknown {
  if (seat === null || typeof seat !== 'string') return null;
  const here = (Array.isArray(pieces) ? pieces : []).filter((p): p is RecordValue => record(p) && p.room === room);
  if (Object.hasOwn(legacy, seat)) return legacySeat(here, legacy[seat]!);
  const ref = parseSeat(seat), piece = ref && here.find(p => p.id === ref.piece);
  return piece && ref.slot < (seatSlots[piece.kind as PieceKind]?.length ?? 0) ? seat : null;
}
function legacySeat(here: RecordValue[], [kind, slot]: readonly [PieceKind, number]) {
  const piece = here.find(p => p.kind === kind);
  return piece ? seatRef(Number(piece.id), slot) : null;
}
/** The actors of a single-house world (album and the v1 to v4 house saves) with their seats read. */
export function seatedWorld(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.actors) || !record(value.layout)) return value;
  const pieces = value.layout.pieces;
  return { ...value, actors: value.actors.map(a => record(a) && a.seat !== undefined ? { ...a, seat: knownSeat(pieces, a.room, a.seat) } : a) };
}
/** The residents of a neighborhood with their seats read, each in the layout of the building it is in (none on the street). */
export function seatedTown(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.actors)) return value;
  const buildings = Array.isArray(value.buildings) ? value.buildings.filter(record) : [];
  const pieces = (where: unknown) => {
    const building = record(where) && where.kind === 'interior' ? buildings.find(b => b.id === where.building) : undefined;
    return building && record(building.layout) ? building.layout.pieces : [];
  };
  return { ...value, actors: value.actors.map(a => record(a) && a.seat !== undefined ? { ...a, seat: knownSeat(pieces(a.location), a.room, a.seat) } : a) };
}
