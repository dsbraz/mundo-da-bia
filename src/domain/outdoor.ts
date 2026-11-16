import type { Action, ActorId, Item } from './types';
import { edible, wake } from './care';
import { plazaWidth } from './neighborhood-geometry';
import { needsOf, played, relieve } from './needs';
import type { Neighborhood, Outdoor, OutdoorAction, Resident } from './neighborhood-types';
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
    actors: town.actors.map(a => a.id === action.actor ? { ...a, ...point, seat: null, ...wake(a), ...swung(a, target) } : a),
    items: town.items.map(i => i.holder === action.actor ? { ...i, ...point } : i) };
}
/** #34: who sits on the plaza bench before eating the dish this action gives her (dropped on her, or Comer with it in hand): a person
 *  on the street, near the bench (on the plaza) and with it free. Anywhere else on the street, or with it taken, she eats standing. */
export function benchMeal(town: Neighborhood, action: Action): ActorId | null {
  if ((action.type !== 'give' && action.type !== 'feed') || town.location.kind !== 'street' || town.outdoor.bench) return null;
  const actor = town.actors.find(a => a.id === action.actor && a.kind === 'human' && a.location.kind === 'street' && a.x < plazaWidth);
  const item = town.items.find(i => action.type === 'give' ? i.id === action.item : i.holder === action.actor);
  return actor && item && edible(actor, item as Item) ? actor.id : null;
}
/** The swing is a game (W3L-13); the bench is only a seat. */
const swung = (actor: Resident, target: 'bench' | 'swing') => target === 'swing' ? { needs: relieve(needsOf(actor), played(actor.id, 'balanco')) } : {};
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
