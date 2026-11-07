import type { Action, ActorId, Point, RoomId, World } from '../domain/types';
import { furnitureAt, seatAt, surfaceAt, wardrobeHit } from './furniture-targets';
import { actorAt, sourceAt } from './targets';
import type { DragPreview, DragToken } from './targets';
export interface PlayInput {
  dispatch: (action: Action) => void;
  wardrobe: () => boolean;
  toggleWardrobe: () => void;
  preview: (preview: DragPreview | null) => void;
}
export function createPlayGesture(getState: () => World, select: (id: ActorId) => void, move: (p: Point) => void, play?: PlayInput) {
  let active: { pointer: number; room: RoomId; token: DragToken | undefined; actor: ActorId | undefined } | null = null;
  function cancel() { active = null; play?.preview(null); }
  function start(pointer: number, point: Point): boolean {
    if (active) return false;
    const state = getState();
    const token = play && sourceAt(state, point, play.wardrobe());
    if (play && tapFurniture(state, point, token, play)) return false;
    const actor = actorAt(state, point);
    active = { pointer, room: state.room, token, actor: token ? undefined : actor?.id };
    if (token) play?.preview({ ...token, point });
    else selectOrMove(state, point, select, move);
    return true;
  }
  function update(pointer: number, point: Point) {
    if (active?.pointer !== pointer) return;
    if (active.room !== getState().room) { cancel(); return; }
    if (active.token) play?.preview({ ...active.token, point });
    else move(point);
  }
  function end(pointer: number, point: Point) {
    if (active?.pointer !== pointer) return;
    if (active.token && active.room === getState().room) deliver(active.token, point, getState(), play!);
    const seat = seatAt(getState(), point);
    if (active.actor && seat && active.room === getState().room) play?.dispatch({ type: 'sit', actor: active.actor, seat });
    cancel();
  }
  return { start, update, end, cancel };
}
function selectOrMove(state: World, p: Point, select: (id: ActorId) => void, move: (p: Point) => void) {
  const actor = actorAt(state, p);
  if (actor) select(actor.id);
  else move(p);
}
function deliver(token: DragToken, point: Point, state: World, play: PlayInput) {
  const actor = actorAt(state, point);
  const surface = surfaceAt(state, point);
  if (token.kind === 'look') {
    if (actor) play.dispatch({ type: 'dress', actor: actor.id, look: token.id });
  } else if (surface) play.dispatch({ type: 'put', item: token.id, spot: surface });
  else if (actor) play.dispatch({ type: 'give', actor: actor.id, item: token.id });
  else play.dispatch({ type: 'place', item: token.id, point: { x: point.x, y: point.y + 28 } });
}

function wardrobeAvailable(state: World, point: Point) {
  return wardrobeHit(state, point) && !actorAt(state, point);
}

function tapFurniture(state: World, point: Point, token: DragToken | undefined, play: PlayInput): boolean {
  if (token || actorAt(state, point)) return false;
  if (wardrobeAvailable(state, point)) { play.toggleWardrobe(); return true; }
  const target = furnitureAt(state, point);
  if (!target) return false;
  play.dispatch({ type: 'interact', target });
  return true;
}
