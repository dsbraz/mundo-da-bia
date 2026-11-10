import { plotStart, streetWidth } from '../domain/neighborhood-geometry';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { Span } from './viewport';

/** A free plot's "Terreno livre" sign with its bricks, in street coordinates. */
export const placard = (plot: number): Span => ({ left: plotStart(plot) + 40, right: plotStart(plot) + 261 });
/** The free plot closest to `plot` (to the right on a tie, where its sign sits beside the house). */
export function nearestFreePlot(town: Neighborhood, plot: number): number | undefined {
  const free = Array.from({ length: town.plots }, (_, p) => p).filter(p => !town.buildings.some(b => b.plot === p));
  return free.sort((a, b) => Math.abs(a - plot) - Math.abs(b - plot) || b - a)[0];
}
/** Leaving a house: the 1000-wide street window centred between its door and the nearest free plot's sign, which must open whole
 *  (`must`, in window coordinates) with as much of the house as fits (`spans`). */
export function streetExit(town: Neighborhood, building: number): { camera: number; must?: Span | undefined; spans: Span[] } {
  const plot = town.buildings.find(b => b.id === building)!.plot, door = plotStart(plot) + 220, free = nearestFreePlot(town, plot);
  const sign = free === undefined ? undefined : placard(free);
  const middle = sign ? (Math.min(door, sign.left) + Math.max(door, sign.right)) / 2 : plotStart(plot) + 220;
  const camera = Math.max(0, Math.min(streetWidth(town.plots) - 1000, Math.round(middle - 500)));
  const local = (s: Span) => ({ left: s.left - camera, right: s.right - camera });
  return { camera, must: sign && local(sign), spans: [local({ left: plotStart(plot), right: plotStart(plot) + 440 })] };
}
