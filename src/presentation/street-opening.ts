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
/** How far from the door (toward the nearest free plot's sign) whoever leaves a house steps out, so the two fit one tablet view. */
export const arrivalStep = 70;
/** Where whoever leaves the house on `plot` stands on the street: beside its door, on the side of the nearest free plot. */
export function streetArrival(town: Neighborhood, plot: number): number {
  const door = plotStart(plot) + 220, free = nearestFreePlot(town, plot);
  return free === undefined ? door : door + Math.sign(free - plot) * arrivalStep;
}
/** Leaving a house: the 1000-wide street window centred on whoever left and the nearest free plot's sign. `must` (window coordinates)
 *  lists, first, them and the whole sign (tablets and up: both open whole), then them alone (a phone, too narrow for both, still shows
 *  them whole); `people` leans the view toward them and `spans` toward the house. */
export function streetExit(town: Neighborhood, building: number): { camera: number; must?: Span[] | undefined; spans: Span[]; people: Span[] } {
  const plot = town.buildings.find(b => b.id === building)!.plot, x = streetArrival(town, plot), free = nearestFreePlot(town, plot);
  const person = { left: x - 42, right: x + 42 }, sign = free === undefined ? undefined : placard(free);
  const focus = sign && { left: Math.min(sign.left, person.left), right: Math.max(sign.right, person.right) };
  const middle = focus ? (focus.left + focus.right) / 2 : x;
  const camera = Math.max(0, Math.min(streetWidth(town.plots) - 1000, Math.round(middle - 500)));
  const local = (s: Span) => ({ left: s.left - camera, right: s.right - camera });
  return { camera, must: [...focus ? [focus] : [], person].map(local), spans: [local({ left: plotStart(plot), right: plotStart(plot) + 440 })], people: [local(person)] };
}
