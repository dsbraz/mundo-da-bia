import type { Action, ActorId, ItemId, World } from '../domain/types';
import { visibleItem } from '../domain/objects';
import { nearestApproach } from './equipment-interaction';
import type { walking } from './walking';
interface Actions {
  state: () => World; selected: () => ActorId; dispatch: (action: Action) => void;
  hint: (text: string) => void; walk: ReturnType<typeof walking>;
}
export function pickupItem(id: ItemId, actions: Actions) {
  actions.walk.cancel();
  const actor = actions.selected(), world = actions.state();
  if (!available(world, actor, id, actions)) return;
  const item = visibleItem(world, id)!;
  const origin = { x: item.x, y: item.y };
  const point = nearestApproach(world, world.actors.find(a => a.id === actor)!, origin);
  if (!point) { actions.hint('Hmm, não dá para chegar lá.'); return; }
  actions.walk.start(point, () => {
    const current = actions.state();
    if (!available(current, actor, id, actions)) return;
    const target = visibleItem(current, id)!;
    if (target.x !== origin.x || target.y !== origin.y) { actions.hint('Ops, mudou de lugar!'); return; }
    actions.dispatch({ type: 'pick', actor, item: id });
  });
}
/** A full hand lets go by itself (like starting a game), so the child never gets an order to drop first. */
function available(world: World, actor: ActorId, id: ItemId, { dispatch, hint }: Actions) {
  if (world.items.some(i => i.holder === actor)) dispatch({ type: 'drop', actor });
  const item = visibleItem(world, id);
  if (!item || item.holder || !world.actors.some(a => a.id === actor && a.room === world.room)) {
    hint('Esse está longe daqui.'); return false;
  }
  return true;
}
