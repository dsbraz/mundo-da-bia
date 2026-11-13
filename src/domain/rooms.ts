import type { PieceKind, Room, RoomId, RoomSize, RoomTemplate, World } from './types';
import { editWorld } from './design';
import { footprint, freePlacement } from './placement';
import { passages } from './passages';
import { pieceBounds } from './layout';
import { roomWidth, validPoint } from './geometry';
import { seatPoint } from './seats';
import { enterRoom } from './room-state';
export interface NewRoom { name: string; template: RoomTemplate; size: RoomSize; cell: number }
const furnishings: Record<RoomTemplate, PieceKind[]> = {
  classroom: ['bookcase', 'school-desk', 'school-desk', 'school-desk', 'board'], sportsfield: ['planter'], gym: ['shelf', 'speaker'],
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
  market: ['market-shelf', 'market-shelf', 'fridge', 'checkout'],
};
/** Fixed columns (piece left edges): the yard's scattered pieces, and the market hall (W3L-21 art pass) with both shelves left of the
 *  door and the fridge and checkout right of it, the whole hall inside one 1024 px screen so it opens with nothing cut off; the classroom
 *  (W3L-26) with three school desks in a row under the board. */
const columns: Partial<Record<RoomTemplate, readonly number[]>> = { playground: [60, 320, 60], garden: [60, 320, 60], market: [140, 318, 616, 776],
  classroom: [20, 250, 485, 720, 360] };
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
  // Along the back wall, between the doorways and stairs at its ends (kept free of furniture).
  const wall = passages(state.layout, state.room).map(p => p.zone).filter(z => z.y + z.height <= 420);
  const from = Math.max(40, ...wall.filter(z => z.x < 200).map(z => z.x + z.width + 8));
  const to = Math.min(roomWidth(state) - 40, ...wall.filter(z => z.x >= 200).map(z => z.x - 8));
  furnishings[template].forEach((kind, index) => {
    const box = pieceBounds[kind];
    const playground = template === 'playground' || template === 'garden';
    const column = columns[template]?.[index];
    const x = column !== undefined ? Math.max(column, from) : from + index * (to - from - box.width) / Math.max(1, furnishings[template].length - 1);
    const point = freePlacement(next, { id: next.layout.nextId, kind, room: next.room, color: 'original', flipped: false, x, y: (kind === 'board' ? 90 + box.height : playground && index === 2 ? 390 : 450) - box.height });
    if (point) next = editWorld(next, { type: 'add', kind, point: { x: point.x + box.width / 2, y: point.y + box.height / 2 } });
  });
  const table = { kitchen: 'table', dining: 'picnic-table' }[template as string] as PieceKind | undefined;
  return table ? chairsBeside(next, table) : next;
}
/** Where the front strip of floor, kept free for walking, begins. */
const frontBand = 500;
/** Two chairs at the table (W3L-06): either side when there is room, else both on the free side, else the nearest free floor. */
function chairsBeside(state: World, kind: PieceKind): World {
  const table = state.layout.pieces.find(p => p.room === state.room && p.kind === kind);
  if (!table) return state;
  const box = pieceBounds.chair, y = table.y + pieceBounds[kind].height - box.height, right = table.x + pieceBounds[kind].width + 4;
  return [table.x - box.width - 4, right, table.x - 2 * box.width - 8, right + box.width + 4].reduce((next, x) => {
    if (next.layout.pieces.filter(p => p.room === next.room && p.kind === 'chair').length >= 2) return next;
    const point = freePlacement(next, { id: next.layout.nextId, kind: 'chair', room: next.room, color: 'original', flipped: false, x, y });
    const added = point && footprint(point)!.bottom <= frontBand ? editWorld(next, { type: 'add', kind: 'chair', point: { x: point.x + box.width / 2, y: point.y + box.height / 2 } }) : next;
    const seat = seatPoint(added, `${added.layout.nextId - 1}.0`);
    return seat && validPoint(seat, roomWidth(added)) ? added : next;
  }, state);
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
