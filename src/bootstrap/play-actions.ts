import type { Action, ActorId, ItemId, Need, PieceKind, Point, World } from '../domain/types';
import { approach, equipmentAction } from '../presentation/equipment-interaction';
import { pickupItem } from '../presentation/item-pickup';
import type { walking } from '../presentation/walking';
import { refusal } from '../content/feedback-text';
import { benchKinds } from '../domain/recipes';
import { mealApproach } from '../presentation/meal-walk';
const blockedMessage = refusal('blocked', '');
interface PlayActions {
  root: HTMLElement; state: () => World; selected: () => ActorId; choose: (id: ActorId) => void;
  /** Chooses `id` mid-touch without a repaint (the ring moves); `settle` repaints when the touch is over. */
  light: (id: ActorId) => void; settle: () => void;
  cancelGame: () => void; walker: ReturnType<typeof walking>; dispatch: (action: Action) => void;
  toggleWardrobe: () => void; refuse: (need: Need, text: string) => void;
  /** Opens the kitchen bench of a stove, counter or cart once the selected character got there. */
  bench: (piece: number) => void;
  /** Applies an action without walking first (the meal once she got to her seat). */
  serve: (action: Action) => void;
  /** The mirror (W3L-08): opens the Looks, and at it she pulls a face (and the view keeps her and the mirror beside the tray). */
  looks: () => void; grimace: (id: ActorId, mirror: number) => void;
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
    if (!point) { deps.refuse('path', blockedMessage); return; }
    const kind = action.type === 'use' ? deps.state().layout.pieces.find(p => p.id === action.id)?.kind : undefined;
    // The mirror (W3L-08): the Looks open at once while she walks there.
    if (kind === 'mirror') deps.looks();
    walker.start(point, () => arrived(action, kind));
  }
  /** At the piece: the bench opens, otherwise the action applies (at the mirror she pulls her face too); no way there is refused. */
  function arrived(action: Action, kind: PieceKind | undefined) {
    if (!approach(deps.state(), deps.selected(), action)) { deps.refuse('path', blockedMessage); return; }
    if (action.type === 'use' && kind && benchKinds.includes(kind)) { deps.bench(action.id); return; }
    deps.dispatch(action);
    if (action.type === 'use' && kind === 'mirror') deps.grimace(deps.selected(), action.id);
  }
  function pickup(item: ItemId) {
    pickupItem(item, { state: deps.state, selected: deps.selected, dispatch: deps.dispatch, walk: walker, hint: text => deps.refuse('path', text) });
  }
  function interact(point: Point) {
    const action = equipmentAction(deps.state(), deps.selected(), point);
    if (action === 'wardrobe') { walker.cancel(); deps.toggleWardrobe(); } else if (action) perform(action);
    return action !== null;
  }
  /** A dish for a person (W3L-07): she is chosen and walks to her meal seat, then eats there. False when there is no walk to make. */
  function sitToEat(action: Action): boolean {
    const walk = mealApproach(deps.state(), action);
    if (!walk) return false;
    deps.cancelGame(); select(walk.actor);
    walker.start(walk.point, () => deps.serve(action));
    return true;
  }
  return { select, choose, settle: deps.settle, perform, pickup, interact, sitToEat };
}
