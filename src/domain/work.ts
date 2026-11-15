import { basics, stockLimit } from './ingredients';
import type { Phase } from './clock';
import type { Neighborhood, NeighborhoodItem, Resident } from './neighborhood-types';
import type { ActorId, Layout, RoomId } from './types';
import { adultIds } from './family';
import { checkoutAt, hasMarket, isMarket } from './market';
import { familyHome, stockOf } from './stock';
import { larderOf, snacksOf, storeLarder } from './larder';
import { spawnItem } from './portable';

/** A place is what it holds: the room `adult` stands in is a workplace (the market's checkout, the office, the consultation room, the
 *  firefighters' or police dispatch), or not. */
function atWorkplace(town: Neighborhood, adult: Resident): boolean {
  const where = adult.location;
  if (where.kind !== 'interior') return false;
  const building = town.buildings.find(b => b.id === where.building)!, template = building.layout.rooms[where.room]?.template;
  return atTill(town, adult, building.layout, where.room) || ['dispatch', 'office', 'consultation'].includes(template ?? '');
}
/** At the market the workplace is its checkout (W3L-25): empty-handed at it, the grown-up works the till; in the hall, or paying there
 *  with her own bag, she is shopping, which is no shift (#27). */
function atTill(town: Neighborhood, adult: Resident, layout: Layout, room: RoomId): boolean {
  return isMarket(layout, room) && !!checkoutAt(layout, room, { x: adult.x, y: adult.y }) && !town.items.some(i => i.holder === adult.id && i.kind === 'sacola');
}
const change = (town: Neighborhood, adult: Resident, patch: Partial<Resident>): Neighborhood =>
  ({ ...town, actors: town.actors.map(a => a.id === adult.id ? { ...a, ...patch } : a) });
/** The shift is over at home: nothing is left to remember. */
function home(town: Neighborhood, adult: Resident): Neighborhood {
  return { ...town, actors: town.actors.map(a => { if (a.id !== adult.id) return a; const next = { ...a }; delete next.work; return next; }) };
}
/** "Minha casa": the family's home. */
const homeOf = (town: Neighborhood) => familyHome(town).id;
/** In a workplace the grown-up is on a shift; arriving home from one in the afternoon or at dusk, with a market in the neighborhood, it
 *  brings a paid bag of the 3 basics the home lacks most, once a day (#7); home in the morning, the shift is cut short. The clothes never change here (lot 8B): everybody keeps the look it wears
 *  everywhere, and only the wardrobe changes it. */
export function work(town: Neighborhood, phase: Phase): Neighborhood {
  return adultIds.reduce((current, id) => shift(current, current.actors.find(a => a.id === id)!, phase), morningFood(town, phase));
}
/** Never a dead end (decision #32): with no market in the neighborhood, the snack and the cats' fish the family home ran out of come back
 *  in the morning, 4 of each, like a new house. */
function morningFood(town: Neighborhood, phase: Phase): Neighborhood {
  if (phase !== 'manha' || hasMarket(town)) return town;
  const home = familyHome(town), larder = larderOf(home), next = storeLarder(home, { lanche: larder.lanche || stockLimit, peixe: larder.peixe || stockLimit });
  return next === home ? town : { ...town, buildings: town.buildings.map(b => b === home ? next : b) };
}
function shift(town: Neighborhood, adult: Resident, phase: Phase): Neighborhood {
  // The day's groceries came (#7): no other shift until the next morning.
  if (adult.work?.done) return phase === 'manha' ? home(town, adult) : town;
  if (atWorkplace(town, adult)) return adult.work && !adult.work.off ? town : change(town, adult, { work: {} });
  return adult.work ? offWork(town, adult, adult.work, phase) : town;
}
function offWork(town: Neighborhood, adult: Resident, shift: NonNullable<Resident['work']>, phase: Phase): Neighborhood {
  const where = adult.location;
  if (where.kind !== 'interior' || where.building !== homeOf(town)) return shift.off ? town : change(town, adult, { work: { off: true } });
  if ((phase !== 'tarde' && phase !== 'entardecer') || !hasMarket(town)) return home(town, adult);
  return groceries(change(town, adult, { work: { off: true, done: true } }), adult);
}
/** The grown-ups a trip home in the morning took off their shift with no groceries (#41): the scene shows it, never silently. */
export function cutShort(before: Neighborhood, after: Neighborhood, phase: Phase): ActorId[] {
  if (phase !== 'manha') return [];
  return adultIds.filter(id => { const was = before.actors.find(a => a.id === id)?.work; return !!was && !was.done && !after.actors.find(a => a.id === id)?.work; });
}
/** A paid bag of the 3 goods the home has least of (the basics of the pantry and the fridge's snack), in the grown-up's hand (at its
 *  feet when the hand is full); only what is short of 4, and no bag when the home lacks nothing (#7). */
function groceries(town: Neighborhood, adult: Resident): Neighborhood {
  const house = town.buildings.find(b => b.id === homeOf(town))!, stock = { ...stockOf(house), lanche: snacksOf(house) };
  const contents = [...basics, 'lanche' as const].filter(good => (stock[good] ?? 0) < stockLimit).sort((a, b) => (stock[a] ?? 0) - (stock[b] ?? 0)).slice(0, 3);
  if (!contents.length) return town;
  const spawned = spawnItem(town, { kind: 'sacola', location: adult.location, point: { x: adult.x, y: adult.y } }), bag = spawned.items.at(-1)!;
  const busy = town.items.some(i => i.holder === adult.id);
  const filled: NeighborhoodItem = { ...bag, contents, paid: true, ...(busy ? {} : { holder: adult.id }) };
  return { ...spawned, items: spawned.items.map(i => i.id === bag.id ? filled : i) };
}
