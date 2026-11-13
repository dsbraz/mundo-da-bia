import type { Actor, ActorId, Item, PieceKind, SeatRef, Transition, World } from './types';
import type { RecipeId } from './progress';
import type { NeighborhoodItem } from './neighborhood-types';
import { tastes } from './tastes';
import { needsOf, relieve } from './needs';
import { freeSeat, mealSeat, seatPiece, seatPoint } from './seats';
import { fromPiece, pieceBounds } from './layout';
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

/** Where one sleeps (W3L-15, §3.2): a person in a bed, else on a sofa; a cat in its bed, on a sofa or a bed (or on a rug, below). */
const sleepKinds: Record<Actor['kind'], readonly PieceKind[]> = { human: ['bed', 'sofa'], cat: ['cat-bed', 'sofa', 'bed'] };
/** The seat `actor` would sleep on here: the one she sits on if it is a place to sleep, else the first free one by `sleepKinds`. On her
 *  own (`alone`) a cat only takes its cat bed: sofa and bed seats stay for the people. */
export function restSeat(state: World, actor: Actor, alone = false): SeatRef | undefined {
  const kinds = alone && actor.kind === 'cat' ? ['cat-bed'] : sleepKinds[actor.kind], own = actor.seat ? seatPiece(state, actor.seat) : undefined;
  if (own && kinds.includes(own.kind)) return actor.seat!;
  return kinds.flatMap(kind => state.layout.pieces.filter(p => p.room === state.room && p.kind === kind)).map(p => freeSeat(state, p, actor)).find(Boolean);
}
/** Resting (the button, the autonomy): whoever rests wakes; otherwise she lies on a bed or naps on a sofa seat, and a cat curls up on a
 *  rug if there is nothing else. Never on the bare floor: with no place to sleep nothing changes and the bubble asks for a bed. */
export function rest(state: World, actor: Actor, alone = false): Transition {
  if (actor.resting) return asleep(state, actor, wake(actor));
  const seat = restSeat(state, actor, alone), point = seat && seatPoint(state, seat);
  if (point) return asleep(state, actor, { seat, x: point.x, y: point.y, resting: true });
  const rug = actor.kind === 'cat' ? state.layout.pieces.find(p => p.room === state.room && p.kind === 'rug') : undefined;
  if (!rug) return refuse(state, 'bed', actor.id, undefined, actor.kind === 'cat' ? 'cat-bed' : 'bed');
  return asleep(state, actor, { seat: null, resting: true, ...onRug(rug, actor) });
}
const asleep = (state: World, actor: Actor, patch: Partial<Actor>): Transition =>
  ({ state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...patch } : a) }, events: [{ type: 'rested', actor: actor.id }] });
/** Where she lies on `rug`: where she stands if that is on it, else its middle. */
function onRug(rug: import('./types').Piece, actor: Actor) {
  const box = pieceBounds.rug, on = actor.x >= rug.x && actor.x <= rug.x + box.width && actor.y >= rug.y && actor.y <= rug.y + box.height;
  return on ? {} : fromPiece(rug, { x: box.x + box.width / 2, y: box.y + Math.floor(box.height / 2) });
}

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
