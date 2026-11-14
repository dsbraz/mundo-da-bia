import { itemKind } from './item-kind';
import { stockLimit } from './ingredients';
import { stockOf } from './stock';
import type { Building, BuildingModel, Neighborhood } from './neighborhood-types';
import type { ActorId, FridgeFood, Item, World } from './types';

/** The fridge food a house has left (lot 6F): the snack, and the cats' fish, which is the pantry's fish. */
export type Larder = Record<FridgeFood, number>;
/** Snacks left: absent means none was ever eaten, so 4 (a new house and every save from before lot 6F). */
export function snacksOf(building: Pick<Building, 'snacks'>): number { return building.snacks ?? stockLimit; }
export function larderOf(building: Pick<Building, 'snacks' | 'stock'>): Larder { return { lanche: snacksOf(building), peixe: stockOf(building).peixe ?? 0 }; }
/** `building` with what `larder` left, touching only what changed: an untouched house gains no field. */
export function storeLarder<B extends Building>(building: B, larder: Larder): B {
  const before = larderOf(building), snacks = larder.lanche === before.lanche ? {} : { snacks: larder.lanche };
  if (larder.peixe === before.peixe) return { ...building, ...snacks };
  const stock = { ...stockOf(building) };
  if (larder.peixe > 0) stock.peixe = larder.peixe; else delete stock.peixe;
  return { ...building, ...snacks, stock };
}
const foodOf = (item: Item): FridgeFood | null => { const kind = itemKind(item); return kind === 'lanche' || kind === 'peixe' ? kind : null; };
/** Fridge food this house ran out of: it stays in the fridge as a silhouette and cannot be taken (the bubble shows the market). */
export function runOut(state: Pick<World, 'larder'>, item: Item): boolean {
  const food = foodOf(item);
  return !!food && !!state.larder && state.larder[food] <= 0;
}
/** One less of the fridge food `item` is, where the house counts it. */
export function eatOne(state: World, item: Item): World {
  const food = foodOf(item);
  return food && state.larder ? { ...state, larder: { ...state.larder, [food]: Math.max(0, state.larder[food] - 1) } } : state;
}
const homes: readonly BuildingModel[] = ['house', 'apartment'];
/** The home that feeds `actor`: the one she is in, else "Minha casa" (the lowest id). */
function homeOf(town: Pick<Neighborhood, 'buildings'>, where: Neighborhood['location']): Building {
  const here = where.kind === 'interior' ? town.buildings.find(b => b.id === where.building) : undefined;
  return here && homes.includes(here.model) ? here : [...town.buildings].sort((a, b) => a.id - b.id)[0]!;
}
/** Whether home still has something for `id` to eat: a snack (the fish for a cat), or a dish for a person. */
export function foodAtHome(town: Pick<Neighborhood, 'buildings' | 'actors' | 'items'>, id: ActorId): boolean {
  const actor = town.actors.find(a => a.id === id);
  if (!actor) return true;
  const house = homeOf(town, actor.location);
  if (larderOf(house)[actor.kind === 'cat' ? 'peixe' : 'lanche'] > 0) return true;
  return actor.kind === 'human' && town.items.some(i => i.kind === 'prato' && i.location.kind === 'interior' && i.location.building === house.id);
}
