import type { Point, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { walkingPath } from './walking-path';
import { nearestApproach } from './equipment-interaction';

/** Where a tap actually sends the walker: onto the floor band, or beside whatever blocks the tapped spot. */
export function walkTarget(world: World, origin: Point, tapped: Point): { point: Point; path: Point[] } | null {
  const point = { x: Math.max(60, Math.min(roomWidth(world) - 60, tapped.x)), y: Math.max(280, Math.min(540, tapped.y)) };
  const direct = walkingPath(world, origin, point);
  if (direct) return { point, path: direct };
  const beside = nearestApproach(world, origin, point);
  const path = beside && walkingPath(world, origin, beside);
  return beside && path ? { point: beside, path } : null;
}
