import type { Layout, World } from './types';
import type { Building, Neighborhood } from './neighborhood-types';

/** The pianos of `layout` stop playing (the same layout when none plays). */
function pianosOff(layout: Layout): Layout {
  if (!layout.pieces.some(p => p.kind === 'piano' && p.active)) return layout;
  return { ...layout, pieces: layout.pieces.map(p => p.kind === 'piano' && p.active ? { ...p, active: false } : p) };
}
/** The show ends (lot 6B): nobody dances any more and the piano that played it stops, so a touch on it starts a new one. */
export function endShow<T extends Pick<World, 'show' | 'layout'> | Building>(place: T): T {
  const layout = pianosOff(place.layout);
  return !place.show && layout === place.layout ? place : { ...place, show: false, layout };
}
/** When the view leaves a building (to the street or another building), its show ends: coming back never replays the dance. */
export function leaveShow(before: Neighborhood, after: Neighborhood): Neighborhood {
  const from = before.location, to = after.location;
  if (from.kind !== 'interior' || (to.kind === 'interior' && to.building === from.building)) return after;
  return { ...after, buildings: after.buildings.map(b => b.id === from.building ? endShow(b) : b) };
}
