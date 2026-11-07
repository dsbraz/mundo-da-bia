import type { ActorId, RoomId, World } from './types';
import { roomWidth } from './geometry';
import { travel } from './room-state';
export type Direction = 'left' | 'right';
export function neighbor(state: World, direction: Direction): RoomId | undefined {
  const rooms = (Object.keys(state.layout.rooms) as RoomId[]).sort((a, b) => state.layout.rooms[a]!.cell - state.layout.rooms[b]!.cell);
  const index = rooms.indexOf(state.room);
  return rooms[index + (direction === 'left' ? -1 : 1)];
}
export function crossDoor(state: World, actor: ActorId, direction: Direction): World {
  const room = neighbor(state, direction);
  if (!room || !state.actors.some(a => a.id === actor && a.room === state.room)) return state;
  const next = travel(state, actor, room);
  return { ...next, actors: next.actors.map(a => a.id === actor ? { ...a, x: direction === 'right' ? 110 : roomWidth(next) - 110, y: 510 } : a) };
}
