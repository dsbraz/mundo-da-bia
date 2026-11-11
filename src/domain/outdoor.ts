import type { ActorId } from './types';
import { wake } from './care';
import type { Neighborhood, Outdoor, OutdoorAction } from './neighborhood-types';
export const initialOutdoor = (): Outdoor => ({ bench: null, swing: null, watered: false, mail: [], bells: [] });
export const outdoorPoints = { bench: { x: 180, y: 445 }, swing: { x: 400, y: 445 } };
export function releaseOutdoor(outdoor: Outdoor, actor: ActorId): Outdoor {
  return { ...outdoor, bench: outdoor.bench === actor ? null : outdoor.bench, swing: outdoor.swing === actor ? null : outdoor.swing };
}
export function interactOutdoor(town: Neighborhood, action: OutdoorAction): Neighborhood {
  if (town.location.kind !== 'street' || !town.actors.some(a => a.id === action.actor && a.location.kind === 'street')) return town;
  const target = action.target;
  if (target === 'bell' || target === 'mail') return buildingInteraction(town, action);
  // The plaza's can waters a garden plot now (`water-plot`); the old flowerbed flag stays false (§4.3).
  if (target === 'water') return town;
  if (target !== 'leave' && town.outdoor[target] && town.outdoor[target] !== action.actor) return town;
  const outdoor = releaseOutdoor(town.outdoor, action.actor);
  if (target === 'leave') return { ...town, outdoor };
  const point = outdoorPoints[target];
  return { ...town, outdoor: { ...outdoor, [target]: action.actor },
    actors: town.actors.map(a => a.id === action.actor ? { ...a, ...point, seat: null, ...wake(a) } : a),
    items: town.items.map(i => i.holder === action.actor ? { ...i, ...point } : i) };
}
function buildingInteraction(town: Neighborhood, action: OutdoorAction): Neighborhood {
  const id = action.building;
  if (!town.buildings.some(b => b.id === id)) return town;
  const key = action.target === 'bell' ? 'bells' : 'mail', list = town.outdoor[key];
  return { ...town, outdoor: { ...town.outdoor, [key]: list.includes(id!) ? list.filter(n => n !== id) : [...list, id!] } };
}

export function plazaBall<T extends Pick<Neighborhood, 'items'>>(town: T): T {
  if (town.items.some(i => i.kind === 'bola')) return town;
  return { ...town, items: [...town.items, { id: '1:bola', kind: 'bola', room: 'sala', location: { kind: 'street' }, x: 320, y: 525, holder: null, spot: 'floor' }] };
}
