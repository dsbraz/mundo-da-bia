import type { Action, Transition, World } from './types';
import { roomWidth, validPoint } from './geometry';
import { enterRoom } from './room-state';
export function transferItem(state: World, action: Extract<Action, { type: 'transfer' }>): Transition {
  const item = state.items.find(i => i.id === action.item);
  if (!item || item.holder !== null || item.room !== state.room || item.spot !== 'floor') return { state, events: [] };
  if (!state.layout.rooms[action.room] || !validPoint(action.point, roomWidth(state, action.room))) return { state, events: [] };
  const next = enterRoom(state, action.room);
  return { state: { ...next, items: next.items.map(i => i.id === item.id ? { ...i, ...action.point, room: action.room } : i) }, events: [{ type: 'room' }] };
}
