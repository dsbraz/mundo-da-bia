import type { Action, ActorId, Point, RoomId, World } from '../domain/types';
import { actorAt, sourceAt, wardrobeHit } from './targets';
import type { DragPreview, DragToken } from './targets';
export interface PlayInput {
  dispatch: (action: Action) => void;
  wardrobe: () => boolean;
  toggleWardrobe: () => void;
  preview: (preview: DragPreview | null) => void;
}
export function createPlayGesture(getState: () => World, select: (id: ActorId) => void, move: (p: Point) => void, play?: PlayInput) {
  let active: { pointer: number; room: RoomId; token: DragToken | undefined } | null = null;
  function cancel() { active = null; play?.preview(null); }
  function start(pointer: number, point: Point): boolean {
    if (active) return false;
    const state = getState();
    const token = play && sourceAt(state, point, play.wardrobe());
    if (play && !token && wardrobeAvailable(state, point)) { play.toggleWardrobe(); return false; }
    active = { pointer, room: state.room, token };
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
  if (token.kind === 'look') {
    if (actor) play.dispatch({ type: 'dress', actor: actor.id, look: token.id });
  } else if (actor) play.dispatch({ type: 'give', actor: actor.id, item: token.id });
  else play.dispatch({ type: 'place', item: token.id, point: { x: point.x, y: point.y + 28 } });
}

function wardrobeAvailable(state: World, point: Point) {
  return state.room === 'sala' && wardrobeHit(point) && !actorAt(state, point);
}
