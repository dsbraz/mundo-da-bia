import { releaseOutdoor } from './outdoor';
import { streetWidth } from './neighborhood-geometry';
import type { Neighborhood, NeighborhoodAction } from './neighborhood-types';
import { sameLocation, validLocation } from './location';
import { validPoint } from './geometry';
import { wake } from './care';
export function transport(town: Neighborhood, action: Extract<NeighborhoodAction, { type: 'transport' }>): Neighborhood {
  if (!validLocation(town, action.location) || !validPoint(action.point, destinationWidth(town, action))) return town;
  const actor = town.actors.find(a => a.id === action.actor && sameLocation(a.location, town.location));
  const item = town.items.find(i => i.id === action.item && !i.holder && i.spot === 'floor' && sameLocation(i.location, town.location));
  if ((!actor && !item) || (actor && item)) return town;
  const room = action.location.kind === 'interior' ? action.location.room : 'sala';
  const patch = { ...action.point, location: action.location, room };
  return { ...town, outdoor: actor ? releaseOutdoor(town.outdoor, actor.id) : town.outdoor, location: action.location,
    actors: town.actors.map(a => a === actor ? { ...a, ...patch, ...wake(a), seat: null } : a),
    items: town.items.map(i => i === item || (actor && i.holder === actor.id) ? { ...i, ...patch, spot: 'floor' } : i),
  };
}
function destinationWidth(town: Neighborhood, action: Extract<NeighborhoodAction, { type: 'transport' }>) {
  const location = action.location;
  if (location.kind === 'street') return streetWidth(town.plots);
  const room = town.buildings.find(b => b.id === location.building)?.layout.rooms[location.room];
  return { small: 1000, medium: 1200, large: 1400 }[room?.size ?? 'small'];
}
