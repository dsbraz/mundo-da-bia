import { localWorld, neighborhoodAction, undoTo } from '../domain/neighborhood';
import type { LiveAction, NeighborhoodAction, Neighborhood } from '../domain/neighborhood-types';
import type { ActorId } from '../domain/types';
import type { Game } from '../domain/tastes';
import { streetExit } from '../presentation/street-opening';
import type { PlayScene } from '../presentation/scene';

interface TownDeps {
  town: () => Neighborhood; selected: () => ActorId;
  /** Makes `town` the current neighborhood (world, edits and selection follow) and saves it. */
  commit: (town: Neighborhood) => void;
  /** Makes `town` current and saves it when only what grows with time changed: the world, edits, walks and the scene stay; the garden redraws. */
  quiet: (town: Neighborhood) => void;
  /** Makes `town` current when only the needs changed (§3.1, never saved): nothing is saved, redrawn or interrupted. */
  feel: (town: Neighborhood) => void;
  camera: () => number; setCamera: (x: number) => void;
  /** Repaints; `then` runs once the new place is painted (after the cover closes, W3L-04). */
  refresh: (then?: () => void) => void;
  /** Before a neighborhood action: balls settle and every game, walk, drag, input and the wardrobe close. */
  interrupt: () => void;
  /** Before an undo or redo: the game, walk and input stop. */
  pause: () => void;
  scene: Pick<PlayScene, 'captureMotion' | 'outdoor' | 'neighborhood' | 'paint'>; cue: (sound: 'door') => void;
  structure: { open: (building?: number) => void; refresh: () => void };
  /** Who plays without moving (a rope or hopscotch game): never idle, like whoever rides the swing. */
  busy?: () => readonly ActorId[];
}
/** Who came along through a door, if anyone. */
const comer = (action: NeighborhoodAction) => action.type === 'transport' ? action.actor : undefined;
/** Where each awake character stands (place, spot and seat), to tell who stayed still between two ticks (W3L-13). */
function stances(town: Neighborhood): Map<ActorId, string> {
  return new Map(town.actors.filter(a => !a.resting).map(a => [a.id, JSON.stringify([a.location, a.room, a.x, a.y, a.seat])]));
}
/** Neighborhood actions with their undo history (the last 50), camera on the street and the scene's answer. */
export function townActions(deps: TownDeps) {
  let past: Neighborhood[] = [], future: Neighborhood[] = [];
  let opening: ReturnType<typeof streetExit> = { camera: 0, spans: [], people: [] };
  let stood = new Map<ActorId, string>();
  function remember() { past = [...past.slice(-49), deps.town()]; future = []; }
  function streetCamera(previous: Neighborhood) {
    const where = previous.location;
    if (where.kind === 'street') return deps.camera();
    opening = streetExit(previous, where.building); return opening.camera;
  }
  function dispatch(action: NeighborhoodAction) {
    deps.interrupt();
    const town = deps.town(), next = neighborhoodAction(town, action);
    if (next === town) return;
    if (!['visit', 'transport', 'outdoor'].includes(action.type)) remember();
    const settle = deps.scene.captureMotion();
    const previous = town.location; const exitCamera = streetCamera(town);
    deps.commit(next);
    deps.setCamera(next.location.kind !== 'street' ? 0 : previous.kind === 'interior' ? exitCamera : deps.camera());
    const through = action.type === 'visit' || action.type === 'transport';
    deps.refresh(through ? () => deps.scene.outdoor.arrive(previous, comer(action)) : undefined);
    if (through) deps.cue('door');
    if (action.type === 'construct') deps.structure.open(next.nextBuilding - 1);
    if (action.type === 'outdoor') { settle(); deps.scene.outdoor.reaction(action); }
  }
  function undo(forward: boolean) {
    deps.pause();
    const from = forward ? future : past, to = forward ? past : future;
    const next = from.pop(); if (!next) return;
    // What the child has gained only grows: undo and redo bring the old houses back, never an older progress or a lost dish.
    to.push(deps.town()); deps.commit(undoTo(next, deps.town())); deps.refresh(); deps.structure.refresh();
  }
  /** Draws what `action` would make of the neighborhood (or the neighborhood itself), without committing it. */
  function preview(action: NeighborhoodAction | null) {
    const town = action ? neighborhoodAction(deps.town(), action) : deps.town();
    deps.scene.neighborhood(town); deps.scene.paint(localWorld(town), deps.selected());
  }
  /** Saves and draws `next` without interrupting anything and outside the undo history; an unchanged neighborhood costs nothing. */
  function apply(next: Neighborhood) { if (next !== deps.town()) { deps.commit(next); deps.refresh(); } }
  /** The clock's tick: what changed with time is applied quietly, without interrupting a walk, a drag or a game; with `life` (only in
   *  Brincar) the needs move on too. */
  function tick(now: number, life?: Omit<LiveAction, 'type'>) {
    const next = neighborhoodAction(deps.town(), { type: 'tick', now }); if (next !== deps.town()) deps.quiet(next);
    if (!life) return;
    // Boredom grows for whoever stands where she stood at the last tick (the first tick has nothing to compare with).
    const here = stances(deps.town()), busy = [...deps.busy?.() ?? [], deps.town().outdoor.swing];
    const idle = life.idle ?? [...here].filter(([id, at]) => stood.get(id) === at && !busy.includes(id)).map(([id]) => id);
    stood = here;
    const lived = neighborhoodAction(deps.town(), { type: 'live', ...life, idle }); if (lived !== deps.town()) deps.feel(lived);
  }
  /** `actor` plays `game` (W3L-13): only the needs change, quietly. */
  function enjoy(actor: ActorId, game: Game) {
    const next = neighborhoodAction(deps.town(), { type: 'enjoy', actor, game }); if (next !== deps.town()) deps.feel(next);
  }
  return { dispatch, undo, remember, preview, tick, apply, enjoy, opening: () => opening, canUndo: () => past.length > 0, canRedo: () => future.length > 0 };
}
