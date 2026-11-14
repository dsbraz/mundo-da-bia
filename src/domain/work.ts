import { basics } from './ingredients';
import type { Phase } from './clock';
import type { Neighborhood, NeighborhoodItem, Resident } from './neighborhood-types';
import { adultIds } from './family';
import { hasMarket, isMarket } from './market';
import { stockOf } from './stock';
import { snacksOf } from './larder';
import { spawnItem } from './portable';

/** A place is what it holds: the room `adult` stands in is a workplace (the market's checkout, the office, the consultation room, the
 *  firefighters' or police dispatch), or not. */
function atWorkplace(town: Neighborhood, adult: Resident): boolean {
  const where = adult.location;
  if (where.kind !== 'interior') return false;
  const building = town.buildings.find(b => b.id === where.building)!, template = building.layout.rooms[where.room]?.template;
  return isMarket(building.layout, where.room) || ['dispatch', 'office', 'consultation'].includes(template ?? '');
}
const change = (town: Neighborhood, adult: Resident, patch: Partial<Resident>): Neighborhood =>
  ({ ...town, actors: town.actors.map(a => a.id === adult.id ? { ...a, ...patch } : a) });
/** The shift is over at home: nothing is left to remember. */
function home(town: Neighborhood, adult: Resident): Neighborhood {
  return { ...town, actors: town.actors.map(a => { if (a.id !== adult.id) return a; const next = { ...a }; delete next.work; return next; }) };
}
/** "Minha casa": the building with the lowest id. */
const homeOf = (town: Neighborhood) => Math.min(...town.buildings.map(b => b.id));
/** In a workplace the grown-up is on a shift; arriving home from one in the afternoon or at dusk, with a market in the neighborhood, it
 *  brings a paid bag of the 3 basics the home lacks most. The clothes never change here (lot 8B): everybody keeps the look it wears
 *  everywhere, and only the wardrobe changes it. */
export function work(town: Neighborhood, phase: Phase): Neighborhood {
  return adultIds.reduce((current, id) => shift(current, current.actors.find(a => a.id === id)!, phase), town);
}
function shift(town: Neighborhood, adult: Resident, phase: Phase): Neighborhood {
  if (atWorkplace(town, adult)) return adult.work && !adult.work.off ? town : change(town, adult, { work: {} });
  return adult.work ? offWork(town, adult, adult.work, phase) : town;
}
function offWork(town: Neighborhood, adult: Resident, shift: NonNullable<Resident['work']>, phase: Phase): Neighborhood {
  const where = adult.location;
  if (where.kind !== 'interior' || where.building !== homeOf(town)) return shift.off ? town : change(town, adult, { work: { off: true } });
  const back = home(town, adult);
  return (phase === 'tarde' || phase === 'entardecer') && hasMarket(town) ? groceries(back, adult) : back;
}
/** A paid bag of the 3 goods the home has least of (the basics of the pantry and the fridge's snack), in the grown-up's hand (at its
 *  feet when the hand is full). */
function groceries(town: Neighborhood, adult: Resident): Neighborhood {
  const house = town.buildings.find(b => b.id === homeOf(town))!, stock = { ...stockOf(house), lanche: snacksOf(house) };
  const contents = [...basics, 'lanche' as const].sort((a, b) => (stock[a] ?? 0) - (stock[b] ?? 0)).slice(0, 3);
  const spawned = spawnItem(town, { kind: 'sacola', location: adult.location, point: { x: adult.x, y: adult.y } }), bag = spawned.items.at(-1)!;
  const busy = town.items.some(i => i.holder === adult.id);
  const filled: NeighborhoodItem = { ...bag, contents, paid: true, ...(busy ? {} : { holder: adult.id }) };
  return { ...spawned, items: spawned.items.map(i => i.id === bag.id ? filled : i) };
}
