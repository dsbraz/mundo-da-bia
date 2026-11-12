import type { ActorId, Point, World } from '../domain/types';
import type { Neighborhood } from '../domain/neighborhood-types';
import { placeTransition, type PlaceStep } from '../presentation/place-transition';
import { worldToScreen } from '../presentation/viewport';

interface PlaceDeps { root: HTMLElement; town: () => Neighborhood; state: () => World; selected: () => ActorId }
/** W3L-04: every place change (door, map, Ir, swipe) is painted under a cover. Callers say what the next change looks like with
 *  `next` (a door and its screen point, a swipe); anything else fades. */
export function placeChange(deps: PlaceDeps) {
  const canvas = () => deps.root.querySelector('canvas');
  const places = placeTransition(deps.root.querySelector<HTMLElement>('#world')!, canvas);
  const key = () => `${JSON.stringify(deps.town().location)}|${deps.state().room}`;
  let shown = '', step: PlaceStep = { kind: 'fade' }, after: (() => void)[] = [];
  const flush = () => { const due = after; after = []; due.forEach(then => then()); };
  /** Where the selected character stands in the new place: the opening iris starts there (the arrival door). */
  function arrival(): Point | undefined {
    const state = deps.state(), actor = state.actors.find(a => a.id === deps.selected() && a.room === state.room), c = canvas();
    return actor && c ? worldToScreen(c, { x: actor.x, y: actor.y - 90 }) : undefined;
  }
  return {
    next(value: PlaceStep) { step = value; },
    /** The screen point of a scene point (for a door). */
    screen(point: Point) { const c = canvas(); return c ? worldToScreen(c, point) : point; },
    /** Repaints now, or under the cover when the place changed; while the cover closes, the paint under it shows the latest state.
     *  `then` runs right after that paint (whoever came through the door walks out of it in the new place). */
    refresh(repaint: () => void, then?: () => void) {
      if (then) after.push(then);
      if (places.busy()) return;
      const now = key(), changed = shown !== '' && now !== shown && canvas()?.dataset.ready === 'true';
      shown = now;
      const current = step; step = { kind: 'fade' };
      if (changed) places.run(current, () => { repaint(); flush(); }, arrival); else { repaint(); flush(); }
    },
  };
}
