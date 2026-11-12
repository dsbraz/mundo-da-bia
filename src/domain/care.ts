import type { Actor, ActorId, Item, Transition, World } from './types';
import type { RecipeId } from './progress';
import type { NeighborhoodItem } from './neighborhood-types';
import { tastes } from './tastes';
import { needsOf, relieve } from './needs';
import { mealSeat, seatPoint } from './seats';
import { refuse } from './missing';
import { roomWidth, validPoint } from './geometry';
/** The saved `fed` flag's soft cycle: whoever wakes from a rest is ready to eat again. Hunger, sleep, boredom and the sad face are the
 *  session's needs (`needs.ts`, §3.1): they are never saved and always recover with care. */
export function wake(actor: Pick<Actor, 'resting'>): Pick<Actor, 'resting'> & Partial<Pick<Actor, 'fed'>> {
  return actor.resting ? { resting: false, fed: false } : { resting: false };
}
/** The everyday snack or the cat's fish: fed, with hunger −30 (§3.1). */
export function snack(actor: Pick<Actor, 'needs'>): Pick<Actor, 'fed' | 'needs'> { return { fed: true, needs: relieve(needsOf(actor), 'lanche') }; }
/** The rest button: falls asleep keeping the meal, or wakes ready to eat again. */
export function toggleRest(actor: Pick<Actor, 'resting'>): Partial<Actor> { return actor.resting ? wake(actor) : { resting: true }; }

/** The dishes a cat eats besides fish (§3.2): petisco de gato (S1), leite batidinho (R05) and ovo mexido (R02). */
export const catDishes: readonly RecipeId[] = ['petisco-de-gato', 'leite-batidinho', 'ovo-mexido'];
const recipeOf = (item: Item) => item.kind === 'prato' ? (item as Partial<NeighborhoodItem>).recipe : undefined;
/** A human eats any dish; a cat only the cat dishes. Anything that is not a dish is not eaten this way. */
export function edible(actor: Pick<Actor, 'kind'>, item: Item): boolean {
  const recipe = recipeOf(item);
  return !!recipe && (actor.kind === 'human' || catDishes.includes(recipe));
}
/** Eating a dish (dropped on someone, or Comer with it in hand): it is gone, the eater wakes fed with hunger −60 (the favourite: hunger 0
 *  and joy), and the favourite says so. A person eats seated (W3L-07): on her own seat or the free one nearest (a chair or picnic table
 *  first, never a bed); with none in the room she asks for a table with a chair and keeps the dish in hand. A cat eats on the floor,
 *  and offered another dish only sniffs it: nothing changes. */
export function eat(state: World, actor: Actor, item: Item): Transition {
  if (!edible(actor, item)) return { state, events: [{ type: 'sniffed', actor: actor.id }] };
  const seated = actor.kind === 'human' && !state.streetWidth, seat = seated ? mealSeat(state, actor) : undefined;
  if (seated && !seat) return noTable(state, actor, item);
  const point = seat ? seatPoint(state, seat) : undefined, place = point ? { seat: seat!, x: point.x, y: point.y } : {};
  const recipe = recipeOf(item)!, favorite = tastes[actor.id].favorite === recipe;
  return {
    state: { ...state, items: state.items.filter(i => i.id !== item.id), actors: state.actors.map(a => a.id === actor.id
      ? { ...a, ...wake(a), ...place, fed: true, needs: relieve(needsOf(a), favorite ? 'favorito' : 'prato') } : a) },
    events: [{ type: 'ate', actor: actor.id, recipe, ...(favorite ? { favorite: true as const } : {}) }],
  };
}
/** No seat for the meal: the dish goes to her hand when it is free (it stays where it was otherwise) and she asks for a table. */
function noTable(state: World, actor: Actor, item: Item): Transition {
  const free = item.holder !== actor.id && !state.items.some(i => i.holder === actor.id);
  const items = free ? state.items.map(i => i.id === item.id ? { ...i, holder: actor.id, room: actor.room, spot: 'floor' as const, x: actor.x, y: actor.y } : i) : state.items;
  return refuse({ ...state, items }, 'table', actor.id);
}
/** A hug (W3L-14, §3.1): `actor` stands beside `other` on the floor (on the side she came from; at the room's edge, the other side) and
 *  both lose 20 of boredom, with joy, so a sad face goes at once. Never with herself or with someone in another room. */
export function hug(state: World, actor: Actor, otherId: ActorId): Transition {
  const other = state.actors.find(a => a.id === otherId && a.id !== actor.id && a.room === state.room);
  if (!other) return { state, events: [] };
  const side = actor.x >= other.x ? 1 : -1, y = Math.max(other.y, 470);
  const x = [other.x + side * 70, other.x - side * 70].find(x => validPoint({ x, y }, roomWidth(state)))!;
  const hugged = (a: Actor) => relieve(needsOf(a), 'abraco');
  return {
    state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...wake(a), x, y, seat: null, needs: hugged(a) }
      : a.id === other.id ? { ...a, needs: hugged(a) } : a) },
    events: [{ type: 'hugged', actor: actor.id, by: other.id }, { type: 'hugged', actor: other.id, by: actor.id }],
  };
}
