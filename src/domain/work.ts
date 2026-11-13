import { basics } from './ingredients';
import type { Phase } from './clock';
import type { LookId } from './types';
import type { Neighborhood, NeighborhoodItem, Resident } from './neighborhood-types';
import { adultIds } from './family';
import { hasMarket, isMarket } from './market';
import { stockOf } from './stock';
import { spawnItem } from './portable';
import { initialWorld } from './world';

/** A place is what it holds: the uniform of the room `adult` stands in (the market's checkout, the office, the consultation room, the
 *  firefighters' or police dispatch), or none. */
function uniformAt(town: Neighborhood, adult: Resident): LookId | null {
  const where = adult.location;
  if (where.kind !== 'interior') return null;
  const building = town.buildings.find(b => b.id === where.building)!, template = building.layout.rooms[where.room]?.template;
  if (isMarket(building.layout, where.room)) return 'market';
  if (template === 'dispatch') return building.model === 'fire-station' ? 'firefighter' : 'police';
  return template === 'office' ? 'office' : template === 'consultation' ? 'doctor' : null;
}
/** The everyday look a new game gives `adult`: what comes back when the look before the shift was not kept (it is never saved). */
const everyday = (adult: Resident) => initialWorld().actors.find(a => a.id === adult.id)!.look;
const change = (town: Neighborhood, adult: Resident, patch: Partial<Resident>): Neighborhood =>
  ({ ...town, actors: town.actors.map(a => a.id === adult.id ? { ...a, ...patch } : a) });
/** The shift is over at home: the look comes back and nothing is left to remember. */
function home(town: Neighborhood, adult: Resident, look: LookId): Neighborhood {
  return { ...town, actors: town.actors.map(a => { if (a.id !== adult.id) return a; const next = { ...a, look }; delete next.work; return next; }) };
}
/** "Minha casa": the building with the lowest id. */
const homeOf = (town: Neighborhood) => Math.min(...town.buildings.map(b => b.id));
/** At work the grown-up wears the uniform (keeping the look it came in with); out of work, that look comes back; arriving home from
 *  a shift in the afternoon or at dusk, with a market in the neighborhood, it brings a paid bag of the 3 basics the home lacks most. */
export function work(town: Neighborhood, phase: Phase): Neighborhood {
  return adultIds.reduce((current, id) => shift(current, current.actors.find(a => a.id === id)!, phase), town);
}
function shift(town: Neighborhood, adult: Resident, phase: Phase): Neighborhood {
  const uniform = uniformAt(town, adult);
  if (uniform) return atWork(town, adult, uniform);
  return adult.work ? offWork(town, adult, adult.work, phase) : town;
}
function atWork(town: Neighborhood, adult: Resident, uniform: LookId): Neighborhood {
  if (adult.look === uniform && adult.work) return town;
  return change(town, adult, { look: uniform, work: adult.work ?? { look: adult.look === uniform ? everyday(adult) : adult.look } });
}
function offWork(town: Neighborhood, adult: Resident, shift: NonNullable<Resident['work']>, phase: Phase): Neighborhood {
  const look = shift.look, where = adult.location;
  if (where.kind !== 'interior' || where.building !== homeOf(town)) return shift.off ? town : change(town, adult, { look, work: { look, off: true } });
  const back = home(town, adult, look);
  return (phase === 'tarde' || phase === 'entardecer') && hasMarket(town) ? groceries(back, adult) : back;
}
/** A paid bag of the 3 basics with the least in the home's pantry, in the grown-up's hand (at its feet when the hand is full). */
function groceries(town: Neighborhood, adult: Resident): Neighborhood {
  const stock = stockOf(town.buildings.find(b => b.id === homeOf(town))!);
  const contents = [...basics].sort((a, b) => (stock[a] ?? 0) - (stock[b] ?? 0)).slice(0, 3);
  const spawned = spawnItem(town, { kind: 'sacola', location: adult.location, point: { x: adult.x, y: adult.y } }), bag = spawned.items.at(-1)!;
  const busy = town.items.some(i => i.holder === adult.id);
  const filled: NeighborhoodItem = { ...bag, contents, paid: true, ...(busy ? {} : { holder: adult.id }) };
  return { ...spawned, items: spawned.items.map(i => i.id === bag.id ? filled : i) };
}
