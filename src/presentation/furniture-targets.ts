import { seats } from '../domain/furniture';
import { seatIds } from '../domain/types';
import type { Home, Point, Spot, World } from '../domain/types';

function inside(p: Point, x: number, y: number, width: number, height: number) {
  return p.x >= x && p.x <= x + width && p.y >= y && p.y <= y + height;
}
export function furnitureAt(state: World, p: Point): keyof Home | undefined {
  if (state.room !== 'sala') return;
  if (inside(p, 10, 160, 95, 110)) return 'lamp';
  if (inside(p, 625, 200, 120, 185)) return 'fridge';
  if (inside(p, 315, 350, 182, 45)) return 'drawer';
  return undefined;
}
export function surfaceAt(state: World, p: Point): Exclude<Spot, 'floor'> | undefined {
  if (state.room !== 'sala') return;
  if (inside(p, 165, 435, 230, 52)) return 'table';
  if (inside(p, 315, 350, 182, 45) && state.home.drawer) return 'drawer';
  if (inside(p, 625, 270, 120, 115) && state.home.fridge) return 'fridge';
  return undefined;
}
export function seatAt(state: World, p: Point) {
  return seatIds.find(id => seats[id].room === state.room && Math.abs(seats[id].x - p.x) <= 45 && Math.abs(seats[id].y - p.y) <= 55);
}
