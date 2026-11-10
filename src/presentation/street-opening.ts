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
/** Leaving a house: the 1000-wide street window centred between its door and the nearest free plot's sign. `must` (window coordinates)
 *  holds the whole sign and reaches the door's near half (whoever left stands there), so on tablets and up the sign opens whole beside
 *  them, leaning toward them (`people`); a phone view, too narrow for both, opens on whoever left, whole, and the house (`spans`). */
export function streetExit(town: Neighborhood, building: number): { camera: number; must?: Span | undefined; spans: Span[]; people: Span[] } {
  const plot = town.buildings.find(b => b.id === building)!.plot, door = plotStart(plot) + 220, free = nearestFreePlot(town, plot);
  const sign = free === undefined ? undefined : placard(free);
  const focus = !sign ? undefined : sign.left > door ? { left: door + 30, right: sign.right } : { left: sign.left, right: door - 30 };
  const middle = focus ? (focus.left + focus.right) / 2 : door;
  const camera = Math.max(0, Math.min(streetWidth(town.plots) - 1000, Math.round(middle - 500)));
  const local = (s: Span) => ({ left: s.left - camera, right: s.right - camera });
  return { camera, must: focus && local(focus), spans: [local({ left: plotStart(plot), right: plotStart(plot) + 440 })], people: [local({ left: door - 42, right: door + 42 })] };
}
