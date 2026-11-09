import { contextScale, visualContext } from './pose';
import { doorAt } from './door-controls';
import type { Direction } from '../domain/doors';
import type { Action, ActorId, ItemId, Point, RoomId, World } from '../domain/types';
import { roomWidth, validPoint } from '../domain/geometry';
import { furnitureAt, seatAt, surfaceAt, usableAt, wardrobeHit } from './furniture-targets';
import { actorAt, sourceAt } from './targets';
import type { DragPreview, DragToken } from './targets';
export interface PlayInput {
  hover?: (point: Point | null) => void;
  pickup?: (item: ItemId) => void; screenScale?: () => Point;
  interact?: (point: Point) => boolean; walk?: (point: Point) => void; cancelWalk?: () => void;
  cross?: (actor: ActorId, direction: Direction) => void;
  dispatch: (action: Action) => void;
  wardrobe: () => boolean; toggleWardrobe: () => void;
  preview: (preview: DragPreview | null) => void;
  previewActor?: (id: ActorId | null, point: Point | null) => void;
}
interface Active { dragged: boolean; scale: Point; pointer: number; room: RoomId; token: DragToken | undefined; actor: ActorId | undefined; offset: Point; start: Point; last: Point }
export function createPlayGesture(getState: () => World, select: (id: ActorId) => void, move: (p: Point) => void, play?: PlayInput) {
  let active: Active | null = null;
  function cancel() { const actor = active?.actor; active = null; play?.preview(null); if (actor) play?.previewActor?.(null, null); }
  return {
    start(pointer: number, point: Point): boolean {
      if (active) return false;
      const state = getState(); const token = play && sourceAt(state, point, play.wardrobe());
      const actor = token ? undefined : actorAt(state, point);
      interruptWalk(play, !!(actor ?? token));
      active = startDrag(pointer, state, point, token, actor);
      active.scale = play?.screenScale?.() ?? { x: 1, y: 1 };
      if (actor) select(actor.id);
      return true;
    },
    update(pointer: number, point: Point) {
      if (active?.pointer !== pointer) return;
      if (active.room !== getState().room) { cancel(); return; }
      trackDrag(active, point);
      if (!active.dragged) return;
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
function destination(active: Active, point: Point, state: World): Point {
  const position = { x: point.x + active.offset.x, y: point.y + active.offset.y };
  return validPoint(position, roomWidth(state)) ? position : active.last;
}
function finish(active: Active, point: Point, state: World, move: (p: Point) => void, play?: PlayInput) {
  if (!active.actor && !active.token) {
    if (play && !active.dragged && !tapFurniture(state, point, undefined, play)) play.walk?.(point);
    return;
  }
  if (!active.dragged) {
    tapToken(active.token, play);
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
  else play.dispatch({ type: 'place', item: token.id, point: { x: point.x, y: point.y + 28 * contextScale(visualContext(state)) } });
}
function tapFurniture(state: World, point: Point, token: DragToken | undefined, play: PlayInput): boolean {
  if (token || actorAt(state, point)) return false;
  if (play.interact) return play.interact(point);
  if (wardrobeHit(state, point)) { play.toggleWardrobe(); return true; }
  const target = furnitureAt(state, point);
  if (target) { play.dispatch({ type: 'interact', target }); return true; }
  const piece = usableAt(state, point);
  if (piece) { play.dispatch({ type: 'use', id: piece.id }); return true; }
  return false;
}

function startDrag(pointer: number, state: World, point: Point, token: DragToken | undefined, actor: import('../domain/types').Actor | undefined): Active {
  return { dragged: false, scale: { x: 1, y: 1 }, pointer, room: state.room, token, actor: actor?.id, start: point, last: actor ?? point,
    offset: actor ? { x: actor.x - point.x, y: actor.y - point.y } : { x: 0, y: 0 } };
}

function interruptWalk(play: PlayInput | undefined, dragging: boolean) { if (dragging) play?.cancelWalk?.(); }

function trackDrag(active: Active, point: Point) {
  active.dragged ||= Math.hypot((point.x - active.start.x) * active.scale.x, (point.y - active.start.y) * active.scale.y) >= 8;
}

function tapToken(token: DragToken | undefined, play?: PlayInput) {
  if (token?.kind === 'item') play?.pickup?.(token.id);
}
