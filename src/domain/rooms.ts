import type { PieceKind, Room, RoomId, RoomSize, RoomTemplate, World } from './types';
import { editWorld } from './design';
import { enterRoom } from './room-state';
export interface NewRoom { name: string; template: RoomTemplate; size: RoomSize; cell: number }
const furnishings: Record<RoomTemplate, PieceKind[]> = {
  empty: [], bedroom: ['bed', 'wardrobe', 'lamp'], kitchen: ['fridge', 'counter', 'stove', 'table'],
  bathroom: ['bath', 'mirror', 'plant'], studio: ['stage', 'speaker', 'desk', 'neon'], garden: ['plant', 'plant', 'cat-bed'],
};
export function freeCell(state: World, cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < 12 && !Object.values(state.layout.rooms).some(r => r.cell === cell);
}
export function addRoom(state: World, options: NewRoom): World {
  const name = options.name.trim().slice(0, 32);
  if (!name || !freeCell(state, options.cell)) return state;
  const id: RoomId = `room-${state.layout.nextRoomId}`;
  const room: Room = { ...options, name, wall: 'original', floor: 'original', home: { lamp: true, fridge: true, drawer: false } };
  let next = enterRoom({ ...state, layout: { ...state.layout, nextRoomId: state.layout.nextRoomId + 1,
    rooms: { ...state.layout.rooms, [id]: room } } }, id);
  furnishings[options.template].forEach((kind, index) => {
    next = editWorld(next, { type: 'add', kind, point: { x: 210 + index * 240, y: 360 } });
  });
  return next;
}
export function renameRoom(state: World, name: string): World {
  const trimmed = name.trim().slice(0, 32);
  return trimmed ? patchRoom(state, { name: trimmed }) : state;
}
export function moveRoom(state: World, cell: number): World { return freeCell(state, cell) ? patchRoom(state, { cell }) : state; }
function patchRoom(state: World, patch: Partial<Room>): World {
  return { ...state, layout: { ...state.layout, rooms: { ...state.layout.rooms, [state.room]: { ...state.layout.rooms[state.room], ...patch } } } };
}
