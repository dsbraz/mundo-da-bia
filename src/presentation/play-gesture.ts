import { contextScale, visualContext } from './pose';
import type { Action, ActorId, ItemId, Point, RoomId, World } from '../domain/types';
import { furnitureAt, seatAt, surfaceAt, usableAt, wardrobeHit } from './furniture-targets';
import { actorAt, grabActor, sourceAt } from './targets';
import type { DragPreview, DragToken } from './targets';
import { onFloor } from './floor-band';
import { throwVelocity } from './ball-motion';
import { itemKind } from '../domain/item-kind';
export interface PlayInput {
  hover?: (point: Point | null) => void;
  pickup?: (item: ItemId) => void; screenScale?: () => Point;
  interact?: (point: Point) => boolean; walk?: (point: Point) => void; cancelWalk?: () => void;
  dispatch: (action: Action) => void;
  wardrobe: () => boolean; toggleWardrobe: () => void;
  preview: (preview: DragPreview | null) => void;
  previewActor?: (id: ActorId | null, point: Point | null) => void;
  selected?: () => ActorId; poke?: (actor: ActorId) => void;
  /** The ball let go on the floor with a flick rolls from `point` (instead of a place) with the finger's speed in px/ms. */
  roll?: (item: ItemId, point: Point, velocity: Point) => void;
  /** The clock finger samples are timed by (performance.now by default). */
  clock?: () => number;
  /** Chooses someone at the touch without repainting the scene (only the ring moves); `settle` repaints once the gesture is over. */
  choose?: (id: ActorId) => void; settle?: () => void;
  /** How a character's drag ended (`moved`, `sat`, `crossed`, `missing:<need>`, `cancelled:<why>`), for the tests. */
  outcome?: (value: string) => void;
}
interface Active { samples: { t: number; x: number; y: number }[]; again: boolean; dragged: boolean; scale: Point; pointer: number; room: RoomId; token: DragToken | undefined; actor: ActorId | undefined; offset: Point; start: Point; last: Point; chosen?: boolean }
export function createPlayGesture(getState: () => World, select: (id: ActorId) => void, move: (p: Point) => void, play?: PlayInput) {
  let active: Active | null = null;
  /** With `why`, a character's drag that stops here is told as `cancelled:<why>`. */
  function cancel(why?: string) {
    const ended = active; active = null; play?.preview(null);
    if (ended) release(ended, why, play);
  }
  return {
    start(pointer: number, point: Point): boolean {
      if (active) return false;
      active = begin(pointer, getState(), point, select, play);
      return true;
    },
    update(pointer: number, point: Point) {
      if (active?.pointer !== pointer) return;
      if (active.room !== getState().room) { cancel('room'); return; }
      trackDrag(active, point);
      if (!active.dragged) return;
      sample(active, point, play);
      claimDrag(active, select, play);
      if (active.token) play?.preview({ ...active.token, point });
      else if (active.actor) {
        active.last = destination(active, point, getState());
        play?.previewActor?.(active.actor, active.last);
      }
    },
    end(pointer: number, point: Point) {
      if (active?.pointer !== pointer) return;
      trackDrag(active, point);
      if (active.room === getState().room) finish(active, point, getState(), move, play);
      cancel();
    }, cancel,
  };
}
/** Where the dragged character's feet are drawn: under the finger by the grab's offset, leaning on the floor's edges, never frozen. */
export function destination(active: Pick<Active, 'offset'>, point: Point, state: World): Point {
  return onFloor(state, { x: point.x + active.offset.x, y: point.y + active.offset.y });
}
/** A drop is measured at the drawn feet, then the feet past the floor's edge, then the finger: whatever the grab, the feet decide. */
export function dropPoints(active: Pick<Active, 'offset'>, point: Point, state: World): Point[] {
  return [destination(active, point, state), { x: point.x + active.offset.x, y: point.y + active.offset.y }, point];
}
function finish(active: Active, point: Point, state: World, move: (p: Point) => void, play?: PlayInput) {
  if (!active.actor && !active.token) {
    if (play && !active.dragged && !tapFurniture(state, point, undefined, play)) play.walk?.(point);
    return;
  }
  if (!active.dragged) { tapToken(active, play); return; }
  if (active.token) { deliver(active.token, point, state, play!, active.samples); return; }
  finishActor(active, point, state, move, play);
}
function finishActor(active: Active, point: Point, state: World, move: (p: Point) => void, play?: PlayInput) {
  const seat = dropPoints(active, point, state).map(p => seatAt(state, p)).find(Boolean);
  if (active.actor && seat) { play?.dispatch({ type: 'sit', actor: active.actor, seat }); play?.outcome?.('sat'); return; }
  if (active.actor && Math.hypot(point.x - active.start.x, point.y - active.start.y) > 3) { move(destination(active, point, state)); play?.outcome?.('moved'); }
}
function deliver(token: DragToken, point: Point, state: World, play: PlayInput, samples: Active['samples']) {
  const actor = actorAt(state, point); const surface = surfaceAt(state, point);
  if (token.kind === 'look') { if (actor) play.dispatch({ type: 'dress', actor: actor.id, look: token.id }); }
  else if (actor) play.dispatch({ type: 'give', actor: actor.id, item: token.id });
  else if (surface) play.dispatch({ type: 'put', item: token.id, spot: surface });
  else {
    const floor = { x: point.x, y: point.y + 28 * contextScale(visualContext(state)) };
    if (!flick(token.id, floor, state, play, samples)) play.dispatch({ type: 'place', item: token.id, point: floor });
  }
}
/** A ball let go while the finger still moves (over 0.15 px/ms) rolls away instead of being placed. */
function flick(id: ItemId, floor: Point, state: World, play: PlayInput, samples: Active['samples']) {
  const item = state.items.find(i => i.id === id);
  if (!play.roll || !item || itemKind(item) !== 'bola') return false;
  const velocity = throwVelocity(samples, (play.clock ?? (() => performance.now()))());
  if (Math.hypot(velocity.x, velocity.y) < .15) return false;
  play.roll(id, floor, velocity); return true;
}
function tapFurniture(state: World, point: Point, token: DragToken | undefined, play: PlayInput): boolean {
  if (token || grabActor(state, point)) return false;
  if (play.interact) return play.interact(point);
  if (wardrobeHit(state, point)) { play.toggleWardrobe(); return true; }
  const target = furnitureAt(state, point);
  if (target) { play.dispatch({ type: 'interact', target }); return true; }
  const piece = usableAt(state, point);
  if (piece) { play.dispatch({ type: 'use', id: piece.id }); return true; }
  return false;
}

function startDrag(pointer: number, state: World, point: Point, token: DragToken | undefined, actor: import('../domain/types').Actor | undefined): Active {
  return { samples: [], again: false, dragged: false, scale: { x: 1, y: 1 }, pointer, room: state.room, token, actor: actor?.id, start: point, last: actor ?? point,
    offset: actor ? { x: actor.x - point.x, y: actor.y - point.y } : { x: 0, y: 0 } };
}

function interruptWalk(play: PlayInput | undefined, dragging: boolean) { if (dragging) play?.cancelWalk?.(); }

function sample(active: Active, point: Point, play?: PlayInput) { active.samples = [...active.samples.slice(-7), { t: (play?.clock ?? (() => performance.now()))(), ...point }]; }
function trackDrag(active: Active, point: Point) {
  active.dragged ||= Math.hypot((point.x - active.start.x) * active.scale.x, (point.y - active.start.y) * active.scale.y) >= 8;
}

function tapToken(active: Active, play?: PlayInput) {
  if (active.again) play?.poke?.(active.actor!);
  if (active.token?.kind === 'item') play?.pickup?.(active.token.id);
}
/** A touch on the already selected actor stays a possible poke: selection and walk are untouched until a drag starts. */
function begin(pointer: number, state: World, point: Point, select: (id: ActorId) => void, play?: PlayInput): Active {
  const token = play && sourceAt(state, point, play.wardrobe());
  const actor = token ? undefined : grabActor(state, point);
  const active = startDrag(pointer, state, point, token, actor);
  active.again = isSelected(actor, play);
  active.scale = play?.screenScale?.() ?? { x: 1, y: 1 };
  if (token) interruptWalk(play, true);
  else if (actor && !active.again) { interruptWalk(play, true); choose(active, actor.id, select, play); }
  return active;
}
function isSelected(actor: { id: ActorId } | undefined, play?: PlayInput) { return !!actor && play?.selected?.() === actor.id; }
function claimDrag(active: Active, select: (id: ActorId) => void, play?: PlayInput) {
  if (!active.again) return;
  active.again = false; interruptWalk(play, true); choose(active, active.actor!, select, play);
}
/** Light choice when the app offers it (the full repaint waits for the gesture's end), the plain `select` otherwise. */
function choose(active: Active, id: ActorId, select: (id: ActorId) => void, play?: PlayInput) {
  if (play?.choose) { play.choose(id); active.chosen = true; } else select(id);
}
/** After a touch: a light choice repaints now, and a character let go without a drop goes back (told as `cancelled:<why>`). */
function release(ended: Active, why: string | undefined, play?: PlayInput) {
  if (!play) return;
  if (ended.chosen) play.settle?.();
  if (!ended.dragged || !ended.actor) return;
  play.previewActor?.(null, null);
  if (why) play.outcome?.(`cancelled:${why}`);
}
