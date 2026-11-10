import type { Point, World } from '../domain/types';
import { roomWidth, validPoint } from '../domain/geometry';
/** Feet stay on the painted floor: indoors below the baseboard (y 382–392), on the street below the facades' doors while the plaza seats (y 445) stay reachable. The domain still accepts y ≥ 280, so old saves load and are only drawn on the floor. */
export function floorTop(world: World): number { return world.streetWidth ? 430 : 410; }
export function onFloor(world: World, p: Point): Point {
  return { x: Math.max(60, Math.min(roomWidth(world) - 60, p.x)), y: Math.max(floorTop(world), Math.min(540, p.y)) };
}
export function walkable(world: World, p: Point): boolean { return validPoint(p, roomWidth(world)) && p.y >= floorTop(world); }
