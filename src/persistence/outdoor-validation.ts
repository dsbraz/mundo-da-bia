import type { LegacyNeighborhood as Neighborhood } from '../domain/neighborhood-types';
import { outdoorPoints } from '../domain/outdoor';
import { record } from './values';
export function validOutdoor(town: Neighborhood): boolean {
  const value = town.outdoor;
  if (!record(value) || typeof value.watered !== 'boolean') return false;
  if (!['bench', 'swing'].every(key => occupant(town, key as 'bench' | 'swing'))) return false;
  return (value.bench === null || value.bench !== value.swing) && [value.mail, value.bells].every(list =>
    Array.isArray(list) && new Set(list).size === list.length && list.every(id => town.buildings.some(b => b.id === id)));
}
function occupant(town: Neighborhood, key: 'bench' | 'swing') {
  const id = town.outdoor[key], p = outdoorPoints[key];
  return id === null || town.actors.some(a => a.id === id && a.location.kind === 'street' && a.x === p.x && a.y === p.y);
}
