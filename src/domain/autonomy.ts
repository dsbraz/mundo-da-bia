import type { ActorId, ItemId, World } from './types';
import { bandOf, mood } from './needs';
import { edible } from './care';
import { mealSeat } from './seats';

/** What a character does on her own (W3L-13, §3.1): the Bia "faz sozinha" (hungry, she eats a dish of the room, seated) and the Luna
 *  "cuida" (she hugs whoever is sad in the room). Never the selected one; the app adds the adult switch, the drag and the 60 s rhythm. */
export type SelfCare = { type: 'eat'; actor: 'bia'; item: ItemId } | { type: 'hug'; actor: 'luna'; other: ActorId };
/** `id` is here, awake and not the one the child is playing with. */
function free(world: World, id: ActorId, selected: ActorId) {
  const actor = world.actors.find(a => a.id === id);
  return actor && id !== selected && actor.room === world.room && !actor.resting ? actor : undefined;
}
function biaEats(world: World, selected: ActorId): SelfCare | null {
  const bia = free(world, 'bia', selected);
  if (!bia || bandOf(bia, 'fome') === 'bem' || !mealSeat(world, bia)) return null;
  const dish = world.items.find(i => !i.holder && i.room === world.room && edible(bia, i));
  return dish ? { type: 'eat', actor: 'bia', item: dish.id } : null;
}
function lunaCares(world: World, selected: ActorId): SelfCare | null {
  const luna = free(world, 'luna', selected);
  const sad = luna && world.actors.filter(a => a.id !== 'luna' && a.room === world.room && mood(a) === 'triste').sort((a, b) => Math.abs(a.x - luna.x) - Math.abs(b.x - luna.x))[0];
  return sad ? { type: 'hug', actor: 'luna', other: sad.id } : null;
}
/** At most one act: the Bia's hunger first, then the Luna's care. */
export function selfCare(world: World, selected: ActorId): SelfCare | null {
  return biaEats(world, selected) ?? lunaCares(world, selected);
}
