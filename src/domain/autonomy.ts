import type { Actor, ActorId, ItemId, SeatRef, World } from './types';
import { bandOf, mood, needsOf, type Need } from './needs';
import { edible, restSeat } from './care';
import { itemKind } from './item-kind';
import { mealSeat } from './seats';

/** What a character does on her own (W3L-13, §3.1): the Bia "faz sozinha" (hungry, she eats a dish of the room, seated) and the Luna
 *  "cuida" (she hugs whoever is sad in the room); anyone (W3L-19, §3.6) sleepy in `precisa` lies down where she may sleep here (a cat in
 *  its bed) and anyone bored in `precisa` plays with a ball on the room's floor. Never the selected one nor anyone in another room; the
 *  app adds the drag and the 60 s rhythm per place. */
export type SelfCare = { type: 'eat'; actor: 'bia'; item: ItemId } | { type: 'hug'; actor: 'luna'; other: ActorId }
  | { type: 'rest'; actor: ActorId; seat: SeatRef } | { type: 'play'; actor: ActorId; item: ItemId };
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
/** The free characters here whose `need` is in `precisa`, the neediest first. */
function needy(world: World, selected: ActorId, need: Need): Actor[] {
  return world.actors.filter(a => free(world, a.id, selected) && bandOf(a, need) === 'precisa').sort((a, b) => needsOf(b)[need] - needsOf(a)[need]);
}
function sleeps(world: World, selected: ActorId): SelfCare | null {
  const act = needy(world, selected, 'sono').map(a => ({ actor: a.id, seat: restSeat(world, a) })).find(a => a.seat);
  return act ? { type: 'rest', actor: act.actor, seat: act.seat! } : null;
}
function plays(world: World, selected: ActorId): SelfCare | null {
  const ball = world.items.find(i => itemKind(i) === 'bola' && !i.holder && i.spot === 'floor' && i.room === world.room), actor = needy(world, selected, 'tedio')[0];
  return ball && actor ? { type: 'play', actor: actor.id, item: ball.id } : null;
}
/** At most one act: the Bia's hunger first, then the Luna's care, then sleep, then boredom. With the adult switch off (`enabled`), none. */
export function selfCare(world: World, selected: ActorId, enabled = true): SelfCare | null {
  if (!enabled) return null;
  return biaEats(world, selected) ?? lunaCares(world, selected) ?? sleeps(world, selected) ?? plays(world, selected);
}
