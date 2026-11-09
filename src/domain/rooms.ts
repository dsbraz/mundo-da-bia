import type { PieceKind, Room, RoomId, RoomSize, RoomTemplate, World } from './types';
import { editWorld } from './design';
import { freePlacement } from './placement';
import { pieceBounds } from './layout';
import { roomWidth } from './geometry';
import { enterRoom } from './room-state';
export interface NewRoom { name: string; template: RoomTemplate; size: RoomSize; cell: number }
const furnishings: Record<RoomTemplate, PieceKind[]> = {
  classroom: ['desk', 'bookcase', 'picture'], sportsfield: ['planter'], gym: ['shelf', 'speaker'],
  laundry: ['washer', 'sink', 'shelf'], library: ['bookcase', 'armchair', 'reading-lamp'], dining: ['picnic-table', 'kitchen-cart', 'plant'],
  reception: ['counter', 'armchair', 'plant'],
  consultation: ['desk', 'armchair', 'sink'],
  ward: ['bed', 'side-table', 'reading-lamp'],
  dispatch: ['desk', 'shelf', 'armchair'],
  investigation: ['desk', 'bookcase', 'picture'],
  office: ['desk', 'bookcase', 'armchair'],
  meeting: ['picnic-table', 'armchair', 'plant'],
  breakroom: ['counter', 'fridge', 'kitchen-cart'],
  playground: ['picnic-table', 'planter', 'plant'],
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
  const next = enterRoom({ ...state, layout: { ...state.layout, nextRoomId: state.layout.nextRoomId + 1,
    rooms: { ...state.layout.rooms, [id]: room } } }, id);
  return furnishRoom(next, options.template);
}
export function furnishRoom(state: World, template: RoomTemplate): World {
  let next = state;
  furnishings[template].forEach((kind, index) => {
    const box = pieceBounds[kind];
    const playground = template === 'playground' || template === 'garden';
    const x = playground ? [60, 320, 60][index]! : 40 + index * (roomWidth(state) - 80 - box.width) / Math.max(1, furnishings[template].length - 1);
    const point = freePlacement(next, { id: next.layout.nextId, kind, room: next.room, color: 'original', flipped: false, x, y: (playground && index === 2 ? 390 : 450) - box.height });
    if (point) next = editWorld(next, { type: 'add', kind, point: { x: point.x + box.width / 2, y: point.y + box.height / 2 } });
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
export function reorderRoom(state: World, room: RoomId, target: RoomId): World {
  const ids = (Object.keys(state.layout.rooms) as RoomId[]).sort((a, b) => state.layout.rooms[a]!.cell - state.layout.rooms[b]!.cell);
  const from = ids.indexOf(room); const to = ids.indexOf(target);
  if (from < 0 || to < 0 || from === to) return state;
  const cells = ids.map(id => state.layout.rooms[id]!.cell);
  ids.splice(from, 1); ids.splice(to, 0, room);
  const rooms = { ...state.layout.rooms };
  ids.forEach((id, index) => { rooms[id] = { ...rooms[id]!, cell: cells[index]! }; });
  return { ...state, layout: { ...state.layout, rooms } };
}
