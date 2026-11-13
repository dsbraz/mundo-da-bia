import type { Action, ActorId, Point, World } from '../domain/types';
import type { Location } from '../domain/neighborhood-types';
import { selfCare, type SelfCare } from '../domain/autonomy';
import { transition } from '../domain/world';
import { loadAutonomy, saveAutonomy } from '../persistence/storage';
import { mealApproach } from '../presentation/meal-walk';
import { approach } from '../presentation/equipment-interaction';
import { stroll } from '../presentation/stroll';
import { reducedMotion } from '../presentation/motion';

interface Deps {
  root: HTMLElement; state: () => World; selected: () => ActorId; location: () => Location;
  /** Draws the walk there (fades with reduced motion), before the move is committed. */
  stroll: (moves: { actor: ActorId; point: Point }[]) => void;
  /** Applies the act without interrupting the child's walk or game. */
  dispatch: (action: Action) => void;
  /** `actor` plays ball (W3L-19): a little hop now and then, and the game relieves her boredom at the end. */
  hop?: (actor: ActorId) => void; played?: (actor: ActorId) => void;
}
const actionOf = (care: SelfCare): Action | null => care.type === 'eat' ? { type: 'give', actor: 'bia', item: care.item }
  : care.type === 'hug' ? { type: 'hug', actor: 'luna', other: care.other } : care.type === 'rest' ? { type: 'rest', actor: care.actor } : null;
/** A ball game on her own lasts 5 s (§3.6). */
const gameMs = 5000;
/** W3L-13 and W3L-19: the characters' own acts after the clock's `live`: never while a finger is down (a drag), at most one per place every
 *  60 s of play, and none with the adult switch off (`#autonomy-toggle`, in Organizar). The Bia walks to the floor before her meal seat and
 *  sits to eat when she gets there; the Luna walks to whoever is sad and hugs at once; the sleepy walk to the bed or sofa seat (a cat to its
 *  bed) and lie down there; the bored walk to the ball and play with it for 5 s. Each act applies only if it is still the same on arrival. */
export function selfCareWiring(deps: Deps) {
  let pressed = false;
  const last = new Map<string, number>();
  const toggle = deps.root.querySelector<HTMLInputElement>('#autonomy-toggle');
  if (toggle) { toggle.checked = loadAutonomy(); toggle.onchange = () => { saveAutonomy(toggle.checked); }; }
  deps.root.addEventListener('pointerdown', () => { pressed = true; }, true);
  for (const type of ['pointerup', 'pointercancel'] as const) window.addEventListener(type, () => { pressed = false; }, true);
  const same = (care: SelfCare) => JSON.stringify(selfCare(deps.state(), deps.selected(), loadAutonomy())) === JSON.stringify(care);
  /** Walks `actor` to `point` (drawn, then saved there); returns how long the walk lasts. */
  function walk(world: World, actor: ActorId, point: Point) {
    const from = world.actors.find(a => a.id === actor)!;
    deps.stroll([{ actor, point }]); deps.dispatch({ type: 'move', actor, point });
    return stroll(from, point, 0, reducedMotion()).duration;
  }
  /** Where the act is done: the floor before the meal seat, the bed or sofa seat, beside the ball; null when it applies where she is. */
  function target(world: World, care: SelfCare, action: Action | null): Point | null {
    if (care.type === 'play') { const ball = world.items.find(i => i.id === care.item)!; return { x: ball.x + (ball.x > 500 ? -60 : 60), y: Math.max(ball.y, 470) }; }
    if (care.type === 'rest') return approach(world, care.actor, { type: 'sit', actor: care.actor, seat: care.seat });
    return mealApproach(world, action!)?.point ?? null;
  }
  function play(actor: ActorId) {
    for (let at = 1000; at < gameMs; at += 1500) setTimeout(() => deps.hop?.(actor), at);
    setTimeout(() => deps.played?.(actor), gameMs);
  }
  function act(world: World, care: SelfCare) {
    const action = actionOf(care), point = target(world, care, action);
    if (!point && action) {
      const there = transition(world, action).state.actors.find(a => a.id === care.actor)!;
      deps.stroll([{ actor: care.actor, point: { x: there.x, y: there.y } }]); deps.dispatch(action); return;
    }
    if (!point) return;
    const time = walk(world, care.actor, point);
    setTimeout(() => { if (!same(care)) return; if (action) deps.dispatch(action); else play(care.actor); }, time);
  }
  return (played: number) => {
    if (pressed) return;
    const place = JSON.stringify(deps.location()), world = deps.state();
    if (played - (last.get(place) ?? -Infinity) < 60_000) return;
    const care = selfCare(world, deps.selected(), loadAutonomy()); if (!care) return;
    last.set(place, played); act(world, care);
  };
}
