import type { Location, Neighborhood } from './neighborhood-types';
import { plotStart } from './neighborhood-geometry';

export function removeBuilding(town: Neighborhood, id: number): Neighborhood {
  const building = town.buildings.find(b => b.id === id);
  if (!building || town.buildings.length === 1) return town;
  const inside = (location: Location) => location.kind === 'interior' && location.building === id;
  const outside = { location: { kind: 'street' as const }, room: 'sala' as const, x: plotStart(building.plot) + 220, y: 520 };
  const actors = town.actors.map((a, index) => inside(a.location)
    ? { ...a, ...outside, x: outside.x - 90 + index * 30, resting: false, seat: null } : a);
  const items = town.items.map(i => {
    if (!inside(i.location)) return i;
    const holder = actors.find(a => a.id === i.holder);
    return { ...i, ...outside, x: holder?.x ?? outside.x, spot: 'floor' as const };
  });
  return { ...town, buildings: town.buildings.filter(b => b.id !== id), actors, items,
    location: inside(town.location) ? outside.location : town.location,
    outdoor: { ...town.outdoor, mail: town.outdoor.mail.filter(b => b !== id), bells: town.outdoor.bells.filter(b => b !== id) } };
}
