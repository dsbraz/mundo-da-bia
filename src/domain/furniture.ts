import { fixture, fromPiece } from './layout';
import type { Actor, Home, Item, ItemId, SeatId, Spot, PieceKind, RoomId, Transition, World } from './types';

export const seats = {
  'sofa-left': { x: 150, y: 405, room: 'sala' },
  'sofa-right': { x: 245, y: 405, room: 'sala' },
  armchair: { x: 90, y: 145, room: 'sala' },
  bed: { x: 790, y: 350, room: 'quarto' },
} as const;
export function availableSpot(state: World, spot: Spot): boolean {
  if (spot === 'floor') return true;
  if (fixture(state, spotKind(spot))?.room !== state.room) return false;
  return spot === 'table' || state.home[spot];
}
export function interact(state: World, target: keyof Home): Transition {
  if (fixture(state, target === 'drawer' ? 'wardrobe' : target)?.room !== state.room) return { state, events: [] };
  return { state: { ...state, home: { ...state.home, [target]: !state.home[target] } }, events: [{ type: 'furniture' }] };
}
export function sit(state: World, actor: Actor, seat: SeatId): Transition {
  const place = seatPoint(state, seat);
  if (!place || place.room !== state.room || state.actors.some(a => a.id !== actor.id && a.room === state.room && a.seat === seat)) return { state, events: [] };
  return {
    state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...place, seat, resting: seat === 'bed' } : a) },
    events: [{ type: 'rested', actor: actor.id }],
  };
}
export function foodHome(state: World, item: Item, actor: Actor, feeding: boolean): Partial<Item> {
  if (!feeding) return { holder: null, room: actor.room, spot: 'floor', x: actor.x, y: actor.y };
  const fridge = fixture(state, 'fridge');
  if (!fridge) return { holder: null, room: actor.room, spot: 'floor', x: actor.x, y: actor.y };
  return { holder: null, room: fridge.room, spot: 'fridge', ...fromPiece(fridge, { x: 680, y: item.id === 'lanche' ? 310 : 360 }) };
}
export function put(state: World, id: ItemId, spot: Exclude<Spot, 'floor'>): Transition {
  const item = state.items.find(i => i.id === id);
  if (!item || !availableSpot(state, spot)) return { state, events: [] };
  if (!reachable(state, item)) return { state, events: [] };
  if (spot === 'fridge' && id !== 'lanche' && id !== 'peixe') return { state, events: [] };
  const index = state.items.indexOf(item);
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
export function seatKind(seat: SeatId): PieceKind { return seat.startsWith('sofa') ? 'sofa' : seat as 'bed' | 'armchair'; }
export function seatPoint(state: World, seat: SeatId, room: RoomId = state.room) {
  const piece = fixture(state, seatKind(seat), room);
  return piece ? { ...fromPiece(piece, seats[seat]), room: piece.room } : undefined;
}
