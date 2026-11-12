import { fromPiece } from './layout';
import { roomWidth, validPoint } from './geometry';
import type { Actor, Piece, PieceKind, Point, RoomId, SeatRef, World } from './types';

/** The seats each piece offers (§3.3), in the piece's drawing coordinates (`pieceBounds` origin): where the feet of whoever sits there are. */
export const seatSlots: Partial<Record<PieceKind, readonly Point[]>> = {
  sofa: [{ x: 150, y: 405 }, { x: 245, y: 405 }], bed: [{ x: 790, y: 350 }], armchair: [{ x: 90, y: 145 }],
  chair: [{ x: 45, y: 108 }], desk: [{ x: 100, y: 132 }], 'cat-bed': [{ x: 170, y: 408 }],
  'picnic-table': [36, 92, 148, 204].map(x => ({ x, y: 140 })),
};
/** Sitting on these is resting: the bed (lying down) and the cats' bed. */
export const restingKinds: readonly PieceKind[] = ['bed', 'cat-bed'];
/** Only a cat fits the cats' bed. */
export const fits = (kind: PieceKind, actor: Pick<Actor, 'kind'>) => kind !== 'cat-bed' || actor.kind === 'cat';
export const seatRef = (piece: number, slot: number): SeatRef => `${piece}.${slot}`;
export function parseSeat(seat: string): { piece: number; slot: number } | null {
  const match = /^([1-9]\d*)\.(0|[1-9]\d*)$/.exec(seat);
  return match ? { piece: Number(match[1]), slot: Number(match[2]) } : null;
}
/** The piece in `room` that has this seat (a piece that is not a seat, or a slot it does not have, has none). */
export function seatPiece(state: World, seat: string, room: RoomId = state.room): Piece | undefined {
  const ref = parseSeat(seat), piece = ref ? state.layout.pieces.find(p => p.id === ref.piece && p.room === room) : undefined;
  return piece && ref!.slot < (seatSlots[piece.kind]?.length ?? 0) ? piece : undefined;
}
export function seatPoint(state: World, seat: string, room: RoomId = state.room): (Point & { room: RoomId }) | undefined {
  const piece = seatPiece(state, seat, room);
  return piece ? { ...fromPiece(piece, seatSlots[piece.kind]![parseSeat(seat)!.slot]!), room: piece.room } : undefined;
}
export const seatsOf = (piece: Piece): SeatRef[] => (seatSlots[piece.kind] ?? []).map((_, slot) => seatRef(piece.id, slot));
export const seatsIn = (state: World, room: RoomId): SeatRef[] => state.layout.pieces.filter(p => p.room === room).flatMap(seatsOf);
/** Whether `actor` sits on `piece`. */
export const sitsOn = (actor: Actor, piece: Piece) => actor.room === piece.room && !!actor.seat && parseSeat(actor.seat)?.piece === piece.id;
export const occupant = (state: World, actor: Pick<Actor, 'id'>, seat: SeatRef, room: RoomId = state.room) =>
  state.actors.find(a => a.id !== actor.id && a.room === room && a.seat === seat)?.id;
/** A seat that is free, fits `actor` and is on the reachable floor. */
export function freeFor(state: World, actor: Actor, seat: SeatRef): boolean {
  const piece = seatPiece(state, seat), point = seatPoint(state, seat);
  return !!piece && !!point && fits(piece.kind, actor) && validPoint(point, roomWidth(state)) && !occupant(state, actor, seat);
}
/** The first free seat of `piece` for `actor`. */
export const freeSeat = (state: World, piece: Piece, actor: Actor) => seatsOf(piece).find(seat => freeFor(state, actor, seat));
/** Seats at a table (W3L-07): eating prefers these. */
const tableKinds: readonly PieceKind[] = ['chair', 'picnic-table'];
/** Where `actor` eats seated: the seat she is on (not a bed), else the free seat here at a table, else any other free seat, nearest first. */
export function mealSeat(state: World, actor: Actor): SeatRef | undefined {
  const own = actor.seat ? seatPiece(state, actor.seat) : undefined;
  if (own && !restingKinds.includes(own.kind)) return actor.seat!;
  const free = seatsIn(state, state.room).filter(seat => freeFor(state, actor, seat) && !restingKinds.includes(seatPiece(state, seat)!.kind));
  const rank = (seat: SeatRef) => (tableKinds.includes(seatPiece(state, seat)!.kind) ? 0 : 10000) + Math.abs(seatPoint(state, seat)!.x - actor.x);
  return free.sort((a, b) => rank(a) - rank(b))[0];
}
/** Where `actor` sits on `piece`: its first free seat, else its first seat (sitting there tells who is in it). */
export const pieceSeat = (state: World, piece: Piece, actor: Actor): SeatRef | undefined => freeSeat(state, piece, actor) ?? seatsOf(piece)[0];
/** The same for any `kind` here: a piece with a free seat first. */
export function seatOfKind(state: World, kind: PieceKind, actor: Actor): SeatRef | undefined {
  const pieces = state.layout.pieces.filter(p => p.room === state.room && p.kind === kind);
  return pieces.map(p => freeSeat(state, p, actor)).find(Boolean) ?? pieces.flatMap(seatsOf)[0];
}
