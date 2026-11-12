import type { Actor, Item, Transition, World } from './types';
import type { RecipeId } from './progress';
import type { NeighborhoodItem } from './neighborhood-types';
import { tastes } from './tastes';
import { needsOf, relieve } from './needs';
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
 *  and joy), and the favourite says so.
 *  A cat offered another dish only sniffs it: nothing changes. */
export function eat(state: World, actor: Actor, item: Item): Transition {
  if (!edible(actor, item)) return { state, events: [{ type: 'sniffed', actor: actor.id }] };
  const favorite = tastes[actor.id].favorite === recipeOf(item);
  return {
    state: { ...state, items: state.items.filter(i => i.id !== item.id), actors: state.actors.map(a => a.id === actor.id
      ? { ...a, ...wake(a), fed: true, needs: relieve(needsOf(a), favorite ? 'favorito' : 'prato') } : a) },
    events: [{ type: 'ate', actor: actor.id, ...(favorite ? { favorite: true as const } : {}) }],
  };
}
