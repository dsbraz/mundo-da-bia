import { mealSeat } from '../domain/seats';
import { visibleItem } from '../domain/objects';
import type { Action, ActorId, Point, World } from '../domain/types';
import { approach } from './equipment-interaction';

/** A dish dropped on a person, or Comer with one in hand (W3L-07): who walks, and to where, before sitting down to eat. Nothing when
 *  she already sits at her meal seat, when there is none (the bubble asks for a table), for a cat (it eats on the floor), on the street or when
 *  there is no way there (she sits at once). */
export function mealApproach(world: World, action: Action): { actor: ActorId; point: Point } | null {
  const actor = eater(world, action);
  if (!actor) return null;
  const seat = mealSeat(world, actor);
  if (!seat || actor.seat === seat) return null;
  const point = approach(world, actor.id, { type: 'sit', actor: actor.id, seat });
  return point ? { actor: actor.id, point } : null;
}
/** The person this action hands a dish to (dropped on her, or the one in her hand for Comer). */
function eater(world: World, action: Action) {
  if ((action.type !== 'give' && action.type !== 'feed') || world.streetWidth) return undefined;
  const actor = world.actors.find(a => a.id === action.actor);
  const item = action.type === 'give' ? visibleItem(world, action.item) : world.items.find(i => i.holder === action.actor);
  return actor?.kind === 'human' && item?.kind === 'prato' ? actor : undefined;
}
