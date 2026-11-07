import type { Action, ActorId, ItemId, Point, RoomId, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { neighbor } from '../domain/doors';
import { actorAt, sourceAt } from './targets';
import { pieceAt } from './build-gesture';
import { navigation } from './navigation';
import { edgeTransfer } from './edge-transfer';
export interface HouseInput {
  building: () => boolean; wardrobe: () => boolean; dispatch: (action: Action) => void;
  pan: (room: RoomId | null, fraction: number) => void;
  transfer: (room: RoomId | null, actor: ActorId | null, item: ItemId | null, point: Point | null) => void;
  progress: (value: number, side: 'left' | 'right') => void;
}
type Gesture = { start: (id: number, p: Point) => boolean; update: (id: number, p: Point) => void; end: (id: number, p: Point) => void; cancel: () => void };
export function houseInput(canvas: HTMLCanvasElement, state: () => World, current: () => Gesture, actions: HouseInput) {
  let active: { id: number; gesture: Gesture; actor: ActorId | null; item: ItemId | null; free: boolean } | null = null;
  const width = () => canvas.getBoundingClientRect().width;
  const nav = navigation({ width, neighbor: d => neighbor(state(), d), preview: actions.pan, visit: room => actions.dispatch({ type: 'room', room }) });
  const position = (p: Point, room: RoomId): Point => ({ x: Math.max(60, Math.min(roomWidth(state(), room) - 60, p.x / width() * roomWidth(state(), room))), y: Math.max(280, Math.min(540, p.y)) });
  const edge = edgeTransfer({ width, neighbor: d => neighbor(state(), d), progress: actions.progress,
    preview: (room, p) => actions.transfer(room, active?.actor ?? null, active?.item ?? null, room && p ? position(p, room) : null),
    commit: (room, p) => commitTransfer(room, position(p, room)),
  });
  function commitTransfer(room: RoomId, point: Point) {
    const actor = active?.actor, item = active?.item;
    if (actor) { actions.dispatch({ type: 'travel', actor, room }); actions.dispatch({ type: 'move', actor, point }); }
    else if (item) actions.dispatch({ type: 'transfer', item, room, point });
  }
  function cancel() { active?.gesture.cancel(); active = null; nav.cancel(); edge.cancel(); }
  return {
    start(id: number, p: Point, pixels: Point) {
      if (active) return false;
      const { actor, item, free } = owner(state(), p, actions);
      const gesture = free ? nav : current();
      active = { id, gesture, actor, item, free };
      gesture.start(id, free ? pixels : p); return true;
    },
    update(id: number, p: Point, pixels: Point) {
      if (active?.id !== id) return;
      if (!edge.crossed()) active.gesture.update(id, active.free ? pixels : p);
      if (active.actor || active.item) edge.update({ x: pixels.x, y: p.y });
    },
    end(id: number, p: Point, pixels: Point) {
      if (active?.id !== id) return;
      const gesture = active.gesture; const free = active.free;
      if (edge.crossed() && (pixels.x < 0 || pixels.x > width() || p.y < 0 || p.y > 600)) { cancel(); return; }
      if (edge.crossed()) { gesture.cancel(); edge.end({ x: pixels.x, y: p.y }); }
      else gesture.end(id, free ? pixels : p);
      cancel();
    }, cancel,
  };
}

function owner(world: World, p: Point, actions: HouseInput) {
  const token = actions.building() ? undefined : sourceAt(world, p, actions.wardrobe());
  const actor = actions.building() || token ? null : actorAt(world, p)?.id ?? null;
  const item = looseItem(world, token);
  return { actor, item, free: !token && !actor && !pieceAt(world, p) };
}

function looseItem(world: World, token: ReturnType<typeof sourceAt>) {
  return token?.kind === 'item' && world.items.some(i => i.id === token.id && !i.holder && i.spot === 'floor') ? token.id : null;
}
