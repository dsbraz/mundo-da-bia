import type { Actor, Home, Item, ItemId, SeatId, Spot, Transition, World } from './types';

export const seats = {
  'sofa-left': { x: 150, y: 405, room: 'sala' },
  'sofa-right': { x: 245, y: 405, room: 'sala' },
  bed: { x: 790, y: 350, room: 'quarto' },
} as const;
export function availableSpot(state: World, spot: Spot): boolean {
  return spot === 'drawer' || spot === 'fridge' ? state.home[spot] : true;
}
export function interact(state: World, target: keyof Home): Transition {
  if (state.room !== 'sala') return { state, events: [] };
  return { state: { ...state, home: { ...state.home, [target]: !state.home[target] } }, events: [{ type: 'furniture' }] };
}
export function sit(state: World, actor: Actor, seat: SeatId): Transition {
  const place = seats[seat];
  if (place.room !== state.room || state.actors.some(a => a.id !== actor.id && a.seat === seat)) return { state, events: [] };
  return {
    state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...place, seat, resting: seat === 'bed' } : a) },
    events: [{ type: 'rested', actor: actor.id }],
  };
}
export function foodHome(item: Item, actor: Actor, feeding: boolean): Partial<Item> {
  if (!feeding) return { holder: null, room: actor.room, spot: 'floor', x: actor.x, y: actor.y };
  return { holder: null, room: 'sala', spot: 'fridge', x: 680, y: item.id === 'lanche' ? 310 : 360 };
}
export function put(state: World, id: ItemId, spot: Exclude<Spot, 'floor'>): Transition {
  const item = state.items.find(i => i.id === id);
  if (!item || state.room !== 'sala' || !availableSpot(state, spot)) return { state, events: [] };
  if (!reachable(state, item)) return { state, events: [] };
  if (spot === 'fridge' && id !== 'lanche' && id !== 'peixe') return { state, events: [] };
  const index = state.items.indexOf(item);
  const point = destinations(spot, index);
  return {
    state: { ...state, items: state.items.map(i => i.id === id ? { ...i, ...point, room: 'sala', holder: null, spot } : i) },
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
