import { doorAt } from './door-controls';
import type { Direction } from '../domain/doors';
import type { Action, ActorId, Point, RoomId, World } from '../domain/types';
import { roomWidth, validPoint } from '../domain/geometry';
import { furnitureAt, seatAt, surfaceAt, usableAt, wardrobeHit } from './furniture-targets';
import { actorAt, sourceAt } from './targets';
import type { DragPreview, DragToken } from './targets';
export interface PlayInput {
  cross?: (actor: ActorId, direction: Direction) => void;
  dispatch: (action: Action) => void;
  wardrobe: () => boolean; toggleWardrobe: () => void;
  preview: (preview: DragPreview | null) => void;
  previewActor?: (id: ActorId | null, point: Point | null) => void;
}
interface Active { pointer: number; room: RoomId; token: DragToken | undefined; actor: ActorId | undefined; offset: Point; start: Point; last: Point }
export function createPlayGesture(getState: () => World, select: (id: ActorId) => void, move: (p: Point) => void, play?: PlayInput) {
  let active: Active | null = null;
  function cancel() { active = null; play?.preview(null); play?.previewActor?.(null, null); }
  return {
    start(pointer: number, point: Point): boolean {
      if (active) return false;
      const state = getState(); const token = play && sourceAt(state, point, play.wardrobe());
      const actor = token ? undefined : actorAt(state, point);
      active = startDrag(pointer, state, point, token, actor);
      if (token) play?.preview({ ...token, point });
      if (actor) select(actor.id);
      return true;
    },
    update(pointer: number, point: Point) {
      if (active?.pointer !== pointer) return;
      if (active.room !== getState().room) { cancel(); return; }
      if (active.token) play?.preview({ ...active.token, point });
      else if (active.actor) {
        active.last = destination(active, point, getState());
        play?.previewActor?.(active.actor, active.last);
      }
    },
    end(pointer: number, point: Point) {
      if (active?.pointer !== pointer) return;
      if (active.room === getState().room) finish(active, point, getState(), move, play);
      cancel();
    }, cancel,
  };
}
function destination(active: Active, point: Point, state: World): Point {
  const position = { x: point.x + active.offset.x, y: point.y + active.offset.y };
  return validPoint(position, roomWidth(state)) ? position : active.last;
}
function finish(active: Active, point: Point, state: World, move: (p: Point) => void, play?: PlayInput) {
  if (!active.actor && !active.token) {
    if (play && Math.hypot(point.x - active.start.x, point.y - active.start.y) < 12) tapFurniture(state, point, undefined, play);
    return;
  }
  if (active.token) { deliver(active.token, point, state, play!); return; }
  finishActor(active, point, state, move, play);
}
function finishActor(active: Active, point: Point, state: World, move: (p: Point) => void, play?: PlayInput) {
  const door = doorAt(state, point);
  if (active.actor && door && play?.cross) { play.cross(active.actor, door); return; }
  const seat = seatAt(state, point);
  if (active.actor && seat) { play?.dispatch({ type: 'sit', actor: active.actor, seat }); return; }
  if (active.actor && Math.hypot(point.x - active.start.x, point.y - active.start.y) > 3) move(destination(active, point, state));
}
function deliver(token: DragToken, point: Point, state: World, play: PlayInput) {
  const actor = actorAt(state, point); const surface = surfaceAt(state, point);
  if (token.kind === 'look') { if (actor) play.dispatch({ type: 'dress', actor: actor.id, look: token.id }); }
  else if (actor) play.dispatch({ type: 'give', actor: actor.id, item: token.id });
  else if (surface) play.dispatch({ type: 'put', item: token.id, spot: surface });
  else play.dispatch({ type: 'place', item: token.id, point: { x: point.x, y: point.y + 28 } });
}
function tapFurniture(state: World, point: Point, token: DragToken | undefined, play: PlayInput): boolean {
  if (token || actorAt(state, point)) return false;
  if (wardrobeHit(state, point)) { play.toggleWardrobe(); return true; }
  const target = furnitureAt(state, point);
  if (target) { play.dispatch({ type: 'interact', target }); return true; }
  const piece = usableAt(state, point);
  if (piece) { play.dispatch({ type: 'use', id: piece.id }); return true; }
  return false;
}

function startDrag(pointer: number, state: World, point: Point, token: DragToken | undefined, actor: import('../domain/types').Actor | undefined): Active {
  return { pointer, room: state.room, token, actor: actor?.id, start: point, last: actor ?? point,
    offset: actor ? { x: actor.x - point.x, y: actor.y - point.y } : { x: 0, y: 0 } };
}
