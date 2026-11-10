import type { ActorId, RoomId, World } from './types';
import { roomWidth } from './geometry';
import { wake } from './care';
export function enterRoom(state: World, room: RoomId): World {
  const target = state.layout.rooms[room];
  if (!target || room === state.room) return state;
  return { ...state, room, show: false, home: target.home,
    layout: { ...state.layout, rooms: { ...state.layout.rooms, [state.room]: { ...state.layout.rooms[state.room], home: state.home } } } };
}
export function travel(state: World, actor: ActorId, room: RoomId): World {
  if (!state.layout.rooms[room] || !state.actors.some(a => a.id === actor)) return state;
  const next = enterRoom(state, room);
  return { ...next, actors: next.actors.map(a => a.id === actor ? { ...a, room, seat: null, ...wake(a),
    x: Math.min(a.x, roomWidth(next) - 60) } : a) };
}
