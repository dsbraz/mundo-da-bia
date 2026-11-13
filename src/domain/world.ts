import { itemKind } from './item-kind';
import { transferItem } from './transfer';
import { crossDoor } from './doors';
import { floorTop, roomWidth, validPoint } from './geometry';
export { validPoint } from './geometry';
import { enterRoom, travel } from './room-state';
import { fixture, initialLayout, toPiece, fromPiece } from './layout';
import { actorIds, actorKinds, itemIds } from './types';
import { isAdult, wardrobeOf } from './family';
import type { Action, Actor, Point, PresentationEvent, RoomId, Transition, World } from './types';
import { interact, put, sit, foodHome } from './furniture';
import { give, micDown, visibleItem } from './objects';
import { eat, hug, rest, snack, wake } from './care';
import { usePiece } from './use';
import { refuse } from './missing';
import { bedtime } from './bedtime';
import { eatOne, runOut } from './larder';

// New saves only: spread out, one on the sofa, one by the stage microphone, nobody in front of the fridge, cats apart,
// and compact enough (x 203-872) for the whole group to open in view at 768 px.
const start: readonly Pick<Actor, 'x' | 'y' | 'seat'>[] = [
  { x: 520, y: 530, seat: null }, { x: 245, y: 405, seat: '2.1' }, { x: 420, y: 530, seat: null }, { x: 830, y: 530, seat: null },
  { x: 330, y: 540, seat: null }, { x: 740, y: 540, seat: null }, { x: 610, y: 540, seat: null },
  // The grown-ups (W3L-24) start in the bedroom, in front of the dresser and the bed, leaving the living room to the children.
  { x: 620, y: 530, seat: null }, { x: 420, y: 530, seat: null },
];
export function initialWorld(): World {
  return {
    room: 'sala', show: false, layout: initialLayout(), home: { lamp: true, fridge: true, drawer: false },
    actors: actorIds.map((id, index) => ({
      id, kind: actorKinds[id], room: isAdult(id) ? 'quarto' : 'sala', look: (['sol', 'estrela', 'mar', 'jardim', 'sol', 'sol', 'sol', 'outing', 'sol'] as const)[index]!,
      ...start[index]!, fed: false, resting: false,
    })),
    items: itemIds.map((id, index) => ({ id, room: 'sala', holder: null, spot: index < 2 ? 'fridge' : 'floor',
      x: [680, 680, 600, 350][index]!, y: [310, 360, 430, 410][index]! })),
  };
}

function changeActor(state: World, actor: Actor, patch: Partial<Actor>, type: PresentationEvent['type']): Transition {
  return { state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...patch } : a) }, events: [{ type, actor: actor.id }] };
}

function pick(state: World, actor: Actor, itemId: import('./types').ItemId): Transition {
  const item = visibleItem(state, itemId);
  if (state.items.some(i => i.holder === actor.id)) return refuse(state, 'hands', actor.id);
  if (!item || item.holder || item.room !== state.room) return refuse(state, 'place', actor.id);
  if (runOut(state, item)) return refuse(state, 'market', actor.id);
  return {
    state: { ...state, items: state.items.map(i => i.id === itemId ? { ...i, holder: actor.id, spot: 'floor' } : i) },
    events: [{ type: 'picked', actor: actor.id }],
  };
}

function release(state: World, actor: Actor, feeding: boolean): Transition {
  const item = state.items.find(i => i.holder === actor.id);
  if (!item) return feeding ? refuse(state, 'food', actor.id) : { state, events: [] };
  if (feeding && item.kind === 'prato') return eat(state, actor, item);
  const food = actor.kind === 'cat' ? 'peixe' : 'lanche';
  if (feeding && itemKind(item) !== food) return refuse(state, 'food', actor.id);
  const result = feeding ? changeActor(state, actor, { ...snack(actor), resting: false }, 'fed')
    : { state, events: [{ type: 'dropped' as const, actor: actor.id }] };
  const eaten = feeding ? eatOne(result.state, item) : result.state;
  return { ...result, state: { ...eaten, items: state.items.map(i => i.id === item.id
    ? { ...i, ...foodHome(state, i, actor, feeding) } : i) } };
}

/** Only people change clothes, and only into their own wardrobe's looks (W3L-24). */
function dress(state: World, actor: Actor, look: Extract<Action, { type: 'dress' }>['look']): Transition {
  return actor.kind === 'human' && wardrobeOf(actor.id).includes(look) ? changeActor(state, actor, { look }, 'dressed') : { state, events: [] };
}
function actorAction(state: World, actor: Actor, action: Action): Transition {
  switch (action.type) {
    case 'move': return moveActor(state, actor, action.point);
    case 'sit': return sit(state, actor, action.seat);
    case 'dress': return dress(state, actor, action.look);
    case 'rest': return rest(state, actor, action.own);
    case 'pick': return pick(state, actor, action.item);
    case 'drop': return release(state, actor, false);
    case 'feed': return release(state, actor, true);
    case 'give': return give(state, actor, action.item);
    case 'hug': return hug(state, actor, action.other);
    default: return { state, events: [] };
  }
}

export function transition(state: World, action: Action): Transition {
  return action.type === 'name' ? nameActor(state, action.actor, action.name) : micDown(state, playTransition(state, action));
}
type HouseWide = Extract<Action, { type: 'show' | 'summon' | 'bedtime' }>;
const isHouseWide = (action: Action): action is HouseWide => ['show', 'summon', 'bedtime'].includes(action.type);
/** What the whole house does: the show on or off, everyone called here, everyone to bed (lot 6B). */
function houseWide(state: World, type: HouseWide['type']): Transition {
  if (type === 'show') return { state: { ...state, show: !state.show }, events: [{ type: 'show' }] };
  if (type === 'bedtime') return bedtime(state);
  return {
    state: { ...state, actors: state.actors.map(a => ({ ...a, x: Math.min(a.x, roomWidth(state) - 60), room: state.room, seat: null })) }, events: [{ type: 'summoned' }],
  };
}
function playTransition(state: World, action: Exclude<Action, { type: 'name' }>): Transition {
  if (action.type === 'cross') return cross(state, action);
  if ('room' in action) return navigate(state, action);
  if (action.type === 'use') return usePiece(state, action.id);
  if (action.type === 'interact') return interact(state, action.target);
  if (action.type === 'put') return put(state, action.item, action.spot);
  if (action.type === 'place') return placeItem(state, action);
  if (isHouseWide(action)) return houseWide(state, action.type);
  const actor = state.actors.find(a => a.id === action.actor && a.room === state.room);
  return actor ? actorAction(state, actor, action) : { state, events: [] };
}

function moveActor(state: World, actor: Actor, point: Point): Transition {
  return validPoint(point, roomWidth(state)) ? changeActor(state, actor, { ...point, ...wake(actor), seat: null }, 'moved') : refuse(state, 'path', actor.id);
}

function navigate(state: World, action: Extract<Action, { room: RoomId }>): Transition {
  if (action.type === 'transfer') return transferItem(state, action);
  const next = action.type === 'travel' ? travel(state, action.actor, action.room) : enterRoom(state, action.room);
  return { state: next, events: next === state ? [] : [{ type: 'room' }] };
}

function placeItem(state: World, action: Extract<Action, { type: 'place' }>): Transition {
    const item = visibleItem(state, action.item), at = landing(state, action.point, !!item && itemKind(item) === 'bola');
    if (!item || !validPoint(at, roomWidth(state))) return { state, events: [] };
    return { state: { ...state, items: state.items.map(i => i.id === action.item
      ? { ...i, x: at.x, y: at.y, room: state.room, holder: null, spot: at.spot } : i) }, events: [{ type: 'dropped' }] };
}
/** Light physics (W3L-17, §3.7): an object let go at `point` (its bottom) falls straight down to the first surface under it, a table's top
 *  in this room, or else to the floor; on the wall it slides down to the baseboard. Nothing stays in the air. A ball (`rolls`) does not
 *  stay on the table: it rolls off the top and lands on the floor in front of it. */
function landing(state: World, point: Point, rolls: boolean): Point & { spot: 'floor' | 'table' } {
  const table = fixture(state, 'table');
  if (table && overTable(state, point)) return { ...fromPiece(table, { x: toPiece(table, point).x, y: rolls ? 540 : 475 }), spot: rolls ? 'floor' : 'table' };
  return { x: point.x, y: Math.max(point.y, floorTop(state)), spot: 'floor' };
}
/** Whether `point` is over this room's table top (x 165 to 395 of its drawing, where `put` sets things) and not below its front edge
 *  (y 487): an object let go there lands on the table. */
export function overTable(state: World, point: Point): boolean {
  const table = fixture(state, 'table'), p = table && toPiece(table, point);
  return !!p && p.x >= 165 && p.x <= 395 && p.y <= 487;
}

function cross(state: World, action: Extract<Action, { type: 'cross' }>): Transition {
  const next = crossDoor(state, action.actor, action.direction);
  return { state: next, events: next === state ? [] : [{ type: 'room' }] };
}

function nameActor(state: World, id: import('./types').ActorId, value: string): Transition {
  const name = Array.from(value.trim()).slice(0, 24).join('');
  return { state: { ...state, actors: state.actors.map(a => {
    if (a.id !== id) return a;
    const next = { ...a }; delete next.name;
    return name ? { ...next, name } : next;
  }) }, events: [{ type: 'named', actor: id }] };
}
