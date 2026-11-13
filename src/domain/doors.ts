import { floorOf } from './neighborhood-geometry';
import type { ActorId, Layout, RoomId, World } from './types';
import { roomWidth } from './geometry';
import { travel } from './room-state';
export type Direction = 'left' | 'right';
export interface RoomLinks { left?: RoomId; right?: RoomId; up?: RoomId; down?: RoomId }
/** The rooms reached on foot from `room`: its neighbours on the same floor and, from the first room of a floor, the stairs to the first
 *  room of the nearest occupied floor above and below. */
export function roomLinks(layout: Layout, room: RoomId): RoomLinks {
  const here = layout.rooms[room]; if (!here) return {};
  const ids = (Object.keys(layout.rooms) as RoomId[]).sort((a, b) => layout.rooms[a]!.cell - layout.rooms[b]!.cell);
  const floor = (id: RoomId) => floorOf(layout.rooms[id]!.cell), level = floor(room);
  const same = ids.filter(id => floor(id) === level), index = same.indexOf(room);
  const left = same[index - 1], right = same[index + 1];
  const links: RoomLinks = { ...(left ? { left } : {}), ...(right ? { right } : {}) };
  if (left) return links;
  const up = ids.find(id => floor(id) > level), below = ids.filter(id => floor(id) < level).at(-1);
  const down = below && ids.find(id => floor(id) === floor(below));
  return { ...links, ...(up ? { up } : {}), ...(down ? { down } : {}) };
}
export function neighbor(state: World, direction: Direction): RoomId | undefined {
  return roomLinks(state.layout, state.room)[direction];
}
export function crossDoor(state: World, actor: ActorId, direction: Direction): World {
  const room = neighbor(state, direction);
  if (!room || !state.actors.some(a => a.id === actor && a.room === state.room)) return state;
  const next = travel(state, actor, room);
  return { ...next, actors: next.actors.map(a => a.id === actor ? { ...a, x: direction === 'right' ? 110 : roomWidth(next) - 110, y: 510 } : a) };
}
