import type { Location, Neighborhood } from './neighborhood-types';
export function sameLocation(a: Location, b: Location): boolean {
  return a.kind === 'street' ? b.kind === 'street' : b.kind === 'interior' && a.building === b.building && a.room === b.room;
}
export function validLocation(town: Neighborhood, location: Location): boolean {
  return location.kind === 'street' || !!town.buildings.find(b => b.id === location.building)?.layout.rooms[location.room];
}
