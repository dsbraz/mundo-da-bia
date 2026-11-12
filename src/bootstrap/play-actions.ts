import type { Action, ActorId, ItemId, Point, World } from '../domain/types';
import { approach, equipmentAction } from '../presentation/equipment-interaction';
import { pickupItem } from '../presentation/item-pickup';
import type { walking } from '../presentation/walking';
import { refusal } from '../content/feedback-text';
import { benchKinds } from '../domain/recipes';
const blockedMessage = refusal('blocked', '');
interface PlayActions {
  root: HTMLElement; state: () => World; selected: () => ActorId; choose: (id: ActorId) => void;
  /** Chooses `id` mid-touch without a repaint (the ring moves); `settle` repaints when the touch is over. */
  light: (id: ActorId) => void; settle: () => void;
  cancelGame: () => void; walker: ReturnType<typeof walking>; dispatch: (action: Action) => void;
  toggleWardrobe: () => void; refuse: (text: string) => void;
  /** Opens the kitchen bench of a stove, counter or cart once the selected character got there. */
  bench: (piece: number) => void;
}
export function playActions(deps: PlayActions) {
  const { walker } = deps;
  function select(id: ActorId) { deps.cancelGame(); walker.cancel(); deps.root.classList.add('actor-chosen'); deps.choose(id); }
  function choose(id: ActorId) { deps.cancelGame(); walker.cancel(); deps.root.classList.add('actor-chosen'); deps.light(id); }
  function perform(action: Action) {
    deps.cancelGame();
    if (action.type === 'pick') { pickup(action.item); return; }
    if (!['use', 'sit', 'interact'].includes(action.type)) { deps.dispatch(action); return; }
    walker.cancel();
    const point = approach(deps.state(), deps.selected(), action);
    if (!point) { deps.refuse(blockedMessage); return; }
    const bench = action.type === 'use' && deps.state().layout.pieces.some(p => p.id === action.id && benchKinds.includes(p.kind));
    walker.start(point, () => {
      if (approach(deps.state(), deps.selected(), action)) { if (bench) deps.bench(action.id); else deps.dispatch(action); }
      else deps.refuse(blockedMessage);
    });
  }
  function pickup(item: ItemId) {
    pickupItem(item, { state: deps.state, selected: deps.selected, dispatch: deps.dispatch, walk: walker, hint: deps.refuse });
  }
  function interact(point: Point) {
    const action = equipmentAction(deps.state(), deps.selected(), point);
    if (action === 'wardrobe') { walker.cancel(); deps.toggleWardrobe(); } else if (action) perform(action);
    return action !== null;
  }
  return { select, choose, settle: deps.settle, perform, pickup, interact };
}
