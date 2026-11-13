import { roomLinks } from './doors';
import { roomWidths } from './geometry';
import type { Layout, Point, RoomId } from './types';
export type PassageKind = 'passage' | 'up' | 'down';
export interface Rect { x: number; y: number; width: number; height: number }
/** A way on foot to another room of the building: a doorway at that end of the back wall, the stairs up (left end of a floor's first
 *  room, which never has a room to its left) or the stairwell down (a hole in the floor at the front left).
 *  `box`: drawn and touched there; `zone`: kept free of furniture; `front`: where one stands to go through; `sill`: where one vanishes and comes out. */
export interface Passage { kind: PassageKind; room: RoomId; box: Rect; zone: Rect; front: Point; sill: Point }
/** A doorway the size of the "Rua" door (104 × 228, sill on the baseboard), 16 units from the end of the wall; its frame is kept free. */
const door = (x: number) => ({ box: { x, y: 182, width: 104, height: 228 }, zone: { x: x - 9, y: 173, width: 122, height: 237 }, front: { x: x + 52, y: 432 }, sill: { x: x + 52, y: 412 } });
const stairs = { box: { x: 16, y: 150, width: 170, height: 260 }, zone: { x: 10, y: 144, width: 182, height: 276 }, front: { x: 101, y: 445 }, sill: { x: 101, y: 412 } };
const well = { box: { x: 40, y: 516, width: 210, height: 84 }, zone: { x: 32, y: 470, width: 226, height: 130 }, front: { x: 145, y: 505 }, sill: { x: 145, y: 560 } };
export function passages(layout: Layout, room: RoomId): Passage[] {
  const links = roomLinks(layout, room), width = roomWidths[layout.rooms[room]?.size ?? 'small'];
  return [
    links.left && { kind: 'passage' as const, room: links.left, ...door(16) },
    links.right && { kind: 'passage' as const, room: links.right, ...door(width - 120) },
    links.up && { kind: 'up' as const, room: links.up, ...stairs },
    links.down && { kind: 'down' as const, room: links.down, ...well },
  ].filter((p): p is Passage => !!p);
}
