import { roomLinks } from './doors';
import { roomWidths } from './geometry';
import type { Layout, Point, RoomId } from './types';
export type PassageKind = 'up' | 'down';
export interface Rect { x: number; y: number; width: number; height: number }
/** A way on foot to another floor of the building, in the stairwell: a column of the architecture at the left end of a floor's first
 *  room (which never has a room to its left), floor to ceiling, where no piece ever stands. The flight up climbs it into an opening in
 *  the ceiling; in the room above it arrives through a hole in the floor at the front of the same column (the way down).
 *  `box`: drawn and touched there; `zone`: kept free of furniture; `front`: where one stands to go through; `sill`: where one vanishes and comes out. */
export interface Passage { kind: PassageKind; room: RoomId; box: Rect; zone: Rect; front: Point; sill: Point }
export const stairwell: Rect = { x: 0, y: 0, width: 240, height: 600 };
const stairs = { box: { x: 0, y: 20, width: 240, height: 430 }, zone: stairwell, front: { x: 228, y: 458 }, sill: { x: 110, y: 200 } };
const well = { box: { x: 16, y: 478, width: 214, height: 122 }, zone: stairwell, front: { x: 262, y: 520 }, sill: { x: 110, y: 585 } };
export function passages(layout: Layout, room: RoomId): Passage[] {
  const links = roomLinks(layout, room);
  return [
    links.up && { kind: 'up' as const, room: links.up, ...stairs },
    links.down && { kind: 'down' as const, room: links.down, ...well },
  ].filter((p): p is Passage => !!p);
}
/** Lot 8A: no doorway between side-by-side rooms. The floor's last 64 units at a side with a neighbour lead there: one walks off that
 *  edge (`sill`, past the room) and comes in walking from the neighbour's opposite edge to its `front`. Nothing is kept free there. */
export interface Edge { kind: 'edge'; room: RoomId; side: 'left' | 'right'; box: Rect; front: Point; sill: Point }
export function edges(layout: Layout, room: RoomId): Edge[] {
  const links = roomLinks(layout, room), width = roomWidths[layout.rooms[room]?.size ?? 'small'];
  const edge = (side: 'left' | 'right', to: RoomId): Edge => {
    const at = (inside: number) => side === 'left' ? inside : width - inside;
    return { kind: 'edge', room: to, side, box: { x: side === 'left' ? 0 : width - 64, y: 400, width: 64, height: 200 }, front: { x: at(150), y: 500 }, sill: { x: at(-70), y: 500 } };
  };
  return [links.left && edge('left', links.left), links.right && edge('right', links.right)].filter((e): e is Edge => !!e);
}
