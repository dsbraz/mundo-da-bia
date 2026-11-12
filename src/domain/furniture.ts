import { fridgeKinds, itemKind } from './item-kind';
import { fixture, fromPiece, pieceBounds } from './layout';
import { roomWidth, validPoint } from './geometry';
import { missingEvent, refuse } from './missing';
import { fits, freeFor, occupant, parseSeat, restingKinds, seatPiece, seatPoint, seatsOf } from './seats';
import { wake } from './care';
import type { Actor, Home, Item, ItemId, Piece, PieceKind, SeatRef, Spot, Transition, World } from './types';

export function availableSpot(state: World, spot: Spot): boolean {
  if (spot === 'floor') return true;
  if (fixture(state, spotKind(spot))?.room !== state.room) return false;
  return spot === 'table' || state.home[spot];
}
export function interact(state: World, target: keyof Home): Transition {
  if (fixture(state, target === 'drawer' ? 'wardrobe' : target)?.room !== state.room) return { state, events: [] };
  return { state: { ...state, home: { ...state.home, [target]: !state.home[target] } }, events: [{ type: 'furniture' }] };
}
/** Sitting (W3L-06): on a taken seat she sits on a free seat of the same kind (or stands beside the piece) and the refusal shows who is there.
 *  A piece in another room is named (the bubble points to it); a seat she does not fit, or off the reachable floor, is refused. */
export function sit(state: World, actor: Actor, seat: SeatRef): Transition {
  const piece = seatPiece(state, seat), place = seatPoint(state, seat);
  if (!piece || !place) return refuse(state, 'seat', actor.id, undefined, elsewhere(state, seat));
  if (!fits(piece.kind, actor) || !validPoint(place, roomWidth(state))) return refuse(state, 'seat', actor.id);
  const by = occupant(state, actor, seat);
  return by ? besideSeat(state, actor, piece, by) : seated(state, actor, seat, piece);
}
const elsewhere = (state: World, seat: SeatRef) => state.layout.pieces.find(p => p.id === parseSeat(seat)?.piece)?.kind;
function seated(state: World, actor: Actor, seat: SeatRef, piece: Piece): Transition {
  const place = seatPoint(state, seat)!, rest = restingKinds.includes(piece.kind) ? { resting: true } : wake(actor);
  return {
    state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, x: place.x, y: place.y, seat, ...rest } : a) },
    events: [{ type: 'rested', actor: actor.id }],
  };
}
function besideSeat(state: World, actor: Actor, piece: Piece, by: Actor['id']): Transition {
  const free = state.layout.pieces.filter(p => p.room === state.room && p.kind === piece.kind).flatMap(seatsOf).find(seat => freeFor(state, actor, seat));
  const result = free ? seated(state, actor, free, seatPiece(state, free)!) : standBeside(state, actor, piece);
  return { ...result, events: [...result.events, missingEvent('seat', actor.id, by)] };
}
/** On the floor just past the piece's side she came from. */
function standBeside(state: World, actor: Actor, piece: Piece): Transition {
  const width = pieceBounds[piece.kind].width;
  const x = actor.x >= piece.x + width / 2 ? piece.x + width + 25 : piece.x - 25;
  const point = { x: Math.max(60, Math.min(roomWidth(state) - 60, x)), y: 480 };
  return { state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...point, seat: null, ...wake(a) } : a) }, events: [{ type: 'moved', actor: actor.id }] };
}
export function foodHome(state: World, item: Item, actor: Actor, feeding: boolean): Partial<Item> {
  if (!feeding) return { holder: null, room: actor.room, spot: 'floor', x: actor.x, y: actor.y };
  const fridge = fixture(state, 'fridge');
  if (!fridge) return { holder: null, room: actor.room, spot: 'floor', x: actor.x, y: actor.y };
  return { holder: null, room: fridge.room, spot: 'fridge', ...fromPiece(fridge, { x: 680, y: itemKind(item) === 'lanche' ? 310 : 360 }) };
}
export function put(state: World, id: ItemId, spot: Exclude<Spot, 'floor'>): Transition {
  const item = state.items.find(i => i.id === id);
  if (!availableSpot(state, spot)) return refuse(state, 'place', undefined, undefined, spotKind(spot));
  if (!item || !reachable(state, item)) return refuse(state, 'place');
  if (spot === 'fridge' && !fridgeKinds.includes(itemKind(item))) return refuse(state, 'place');
  const index = spot === 'fridge' ? Number(itemKind(item) === 'peixe') : state.items.indexOf(item) % 4;
  const point = fromPiece(fixture(state, spotKind(spot))!, destinations(spot, index));
  return {
    state: { ...state, items: state.items.map(i => i.id === id ? { ...i, ...point, room: state.room, holder: null, spot } : i) },
    events: [{ type: 'dropped' }],
  };
}
function reachable(state: World, item: Item): boolean {
  if (item.holder) return state.actors.some(a => a.id === item.holder && a.room === state.room);
  return item.room === state.room && availableSpot(state, item.spot);
}
function destinations(spot: Exclude<Spot, 'floor'>, index: number) {
  if (spot === 'fridge') return { x: 680, y: 310 + index * 50 };
  if (spot === 'drawer') return { x: 340 + index * 42, y: 392 };
  return { x: 260 + index * 30, y: 475 };
}

export function spotKind(spot: Exclude<Spot, 'floor'>): PieceKind { return spot === 'drawer' ? 'wardrobe' : spot; }
