import type { Point, RoomId, World } from './types';
export const roomWidths = { small: 1000, medium: 1200, large: 1400 } as const;
export function roomWidth(state: World, room: RoomId = state.room): number { return state.streetWidth ?? roomWidths[state.layout.rooms[room]?.size ?? 'large']; }
/** Where the painted floor begins (feet below the baseboard indoors, below the facades' doors on the street); the domain still accepts
 *  y >= 280, so old saves load. */
export function floorTop(state: Pick<World, 'streetWidth'>): number { return state.streetWidth ? 430 : 410; }
export function validPoint(point: Point, width = 1000): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 60 && point.x <= width - 60 && point.y >= 280 && point.y <= 540;
}
