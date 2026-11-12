import type { Action, ActorId, Point, World } from '../domain/types';
import type { Location } from '../domain/neighborhood-types';
import { selfCare, type SelfCare } from '../domain/autonomy';
import { transition } from '../domain/world';
import { loadAutonomy, saveAutonomy } from '../persistence/storage';
import { mealApproach } from '../presentation/meal-walk';
import { stroll } from '../presentation/stroll';
import { reducedMotion } from '../presentation/motion';

interface Deps {
  root: HTMLElement; state: () => World; selected: () => ActorId; location: () => Location;
  /** Draws the walk there (fades with reduced motion), before the move is committed. */
  stroll: (moves: { actor: ActorId; point: Point }[]) => void;
  /** Applies the act without interrupting the child's walk or game. */
  dispatch: (action: Action) => void;
}
const actionOf = (care: SelfCare): Action => care.type === 'eat' ? { type: 'give', actor: 'bia', item: care.item } : { type: 'hug', actor: 'luna', other: care.other };
/** W3L-13: the Bia's and the Luna's own acts after the clock's `live`: never while a finger is down (a drag), at most one per place every
 *  60 s of play, and none with the adult switch off (`#autonomy-toggle`, in Organizar). The Bia walks to the floor before her meal seat and
 *  sits to eat when she gets there (if the dish is still there for her); the Luna walks to whoever is sad and hugs at once. */
export function selfCareWiring(deps: Deps) {
  let pressed = false;
  const last = new Map<string, number>();
  const toggle = deps.root.querySelector<HTMLInputElement>('#autonomy-toggle');
  if (toggle) { toggle.checked = loadAutonomy(); toggle.onchange = () => { saveAutonomy(toggle.checked); }; }
  deps.root.addEventListener('pointerdown', () => { pressed = true; }, true);
  for (const type of ['pointerup', 'pointercancel'] as const) window.addEventListener(type, () => { pressed = false; }, true);
  /** Walks `actor` to `point` (drawn, then saved there); returns how long the walk lasts. */
  function walk(world: World, actor: ActorId, point: Point) {
    const from = world.actors.find(a => a.id === actor)!;
    deps.stroll([{ actor, point }]); deps.dispatch({ type: 'move', actor, point });
    return stroll(from, point, 0, reducedMotion()).duration;
  }
  function act(world: World, care: SelfCare) {
    const action = actionOf(care), approach = mealApproach(world, action);
    if (!approach) {
      const there = transition(world, action).state.actors.find(a => a.id === care.actor)!;
      deps.stroll([{ actor: care.actor, point: { x: there.x, y: there.y } }]); deps.dispatch(action); return;
    }
    const time = walk(world, care.actor, approach.point);
    setTimeout(() => { if (JSON.stringify(selfCare(deps.state(), deps.selected())) === JSON.stringify(care)) deps.dispatch(action); }, time);
  }
  return (played: number) => {
    if (pressed || !loadAutonomy()) return;
    const place = JSON.stringify(deps.location()), world = deps.state();
    if (played - (last.get(place) ?? -Infinity) < 60_000) return;
    const care = selfCare(world, deps.selected()); if (!care) return;
    last.set(place, played); act(world, care);
  };
}
