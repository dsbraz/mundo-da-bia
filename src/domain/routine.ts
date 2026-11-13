import { sameLocation } from './location';
import { band, needsOf, type Need } from './needs';
import type { Phase } from './clock';
import type { Actor } from './types';
import type { BuildingModel, Location, Neighborhood } from './neighborhood-types';
import { hasMarketRoom } from './market';

/** What the day suggests (§3.6), drawn in a dashed bubble: never saved, never forced, ignoring it changes nothing. */
export type Suggestion = 'mochila' | 'pasta' | 'bola' | 'prato' | 'travesseiro' | 'mercado';
export type Place = 'home' | 'school' | 'street' | 'away';
const homes: readonly BuildingModel[] = ['house', 'apartment'];
const relief: Record<Need, Suggestion> = { fome: 'prato', sono: 'travesseiro', tedio: 'bola' };
/** Where a location is for the routine: at home, at school, on the street (the plaza) or somewhere else. */
export function placeOf(town: Pick<Neighborhood, 'buildings'>, location: Location): Place {
  if (location.kind === 'street') return 'street';
  const model = town.buildings.find(b => b.id === location.building)?.model;
  return model === 'school' ? 'school' : model && homes.includes(model) ? 'home' : 'away';
}
/** The highest need when it is not `bem`, else null. */
function topNeed(actor: Pick<Actor, 'needs'>): Need | null {
  const current = needsOf(actor), top = (['fome', 'sono', 'tedio'] as const).reduce((a, b) => current[b] > current[a] ? b : a);
  return band(current[top]) === 'bem' ? null : top;
}
/** What relieves `need`: hungry with nothing left at home (lot 6F), the market. */
const reliefOf = (need: Need, food: boolean | undefined): Suggestion => need === 'fome' && food === false ? 'mercado' : relief[need];
/** The needs come first: one in `pede` or `precisa` (the highest) is what the bubble draws, a plate, a pillow or a ball. With every need
 *  fine the hour of the day speaks: in the morning a child at home takes the backpack to school (a grown-up the briefcase to work), the
 *  afternoon is for playing out, dusk for dinner and the night for bed. Cats have no routine. Hungry with nothing left at home (`food`
 *  false, lot 6F), the market. */
export function suggestion(phase: Phase, actor: Pick<Actor, 'kind' | 'needs'>, place: Place, grownUp = false, food?: boolean): Suggestion | null {
  if (actor.kind !== 'human') return null;
  const need = topNeed(actor);
  if (need) return reliefOf(need, food);
  if (phase === 'manha') return place === 'home' ? (grownUp ? 'pasta' : 'mochila') : null;
  if (phase === 'tarde') return place === 'street' ? null : 'bola';
  return ({ entardecer: 'prato', noite: 'travesseiro', amanhecer: null } as const)[phase];
}
export type Destination = { kind: 'building'; building: number } | { kind: 'street' };
const places: Record<Exclude<Suggestion, 'bola' | 'mercado'>, readonly BuildingModel[]> = { mochila: ['school'], pasta: ['office'], prato: homes, travesseiro: homes };
/** A destination seen from `from`: a building counts as `from`'s own room when she is in it. */
const placeLocation = (place: Destination, from: Location): Location =>
  place.kind === 'street' ? place : { kind: 'interior', building: place.building, room: from.kind === 'interior' ? from.room : 'sala' };
function first(town: Pick<Neighborhood, 'buildings'>, models: readonly BuildingModel[]): Destination | null {
  const found = town.buildings.filter(b => models.includes(b.model)).sort((a, b) => a.id - b.id)[0];
  return found ? { kind: 'building', building: found.id } : null;
}
/** The first building with a market room (a place is what it holds). */
function market(town: Pick<Neighborhood, 'buildings'>): Destination | null {
  const found = town.buildings.filter(b => hasMarketRoom(b.layout)).sort((a, b) => a.id - b.id)[0];
  return found ? { kind: 'building', building: found.id } : null;
}
/** Where the Map marks a suggestion: the school, work, the market, the street with its plaza, or home; null when there is no such place,
 *  or when she is already there (`from`: hungry at home, the need's own bubble is enough). */
export function destination(town: Pick<Neighborhood, 'buildings'>, wish: Suggestion, from?: Location): Destination | null {
  const place = wish === 'bola' ? { kind: 'street' as const } : wish === 'mercado' ? market(town) : first(town, places[wish]);
  return place && from && sameLocation(placeLocation(place, from), from) ? null : place;
}
