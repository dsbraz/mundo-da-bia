import { itemKind } from './item-kind';
import { transferItem } from './transfer';
import { crossDoor } from './doors';
import { roomWidth, validPoint } from './geometry';
export { validPoint } from './geometry';
import { enterRoom, travel } from './room-state';
import { initialLayout } from './layout';
import { actorIds, actorKinds, itemIds } from './types';
import type { Action, Actor, Point, PresentationEvent, RoomId, Transition, World } from './types';
import { interact, put, sit, foodHome } from './furniture';
import { give, visibleItem } from './objects';
import { eat, hug, rest, snack, wake } from './care';
import { usePiece } from './use';
import { refuse } from './missing';

// New saves only: spread out, one on the sofa, one by the stage microphone, nobody in front of the fridge, cats apart,
// and compact enough (x 203-872) for the whole group to open in view at 768 px.
const start: readonly Pick<Actor, 'x' | 'y' | 'seat'>[] = [
  { x: 520, y: 530, seat: null }, { x: 245, y: 405, seat: '2.1' }, { x: 420, y: 530, seat: null }, { x: 830, y: 530, seat: null },
  { x: 330, y: 540, seat: null }, { x: 740, y: 540, seat: null }, { x: 610, y: 540, seat: null },
];
export function initialWorld(): World {
  return {
    room: 'sala', show: false, layout: initialLayout(), home: { lamp: true, fridge: true, drawer: false },
    actors: actorIds.map((id, index) => ({
      id, kind: actorKinds[id], room: 'sala', look: (['sol', 'estrela', 'mar', 'jardim', 'sol', 'sol', 'sol'] as const)[index]!,
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
  return { ...result, state: { ...result.state, items: state.items.map(i => i.id === item.id
    ? { ...i, ...foodHome(state, i, actor, feeding) } : i) } };
}

/** Only people change clothes. */
function dress(state: World, actor: Actor, look: Extract<Action, { type: 'dress' }>['look']): Transition {
  return actor.kind === 'human' ? changeActor(state, actor, { look }, 'dressed') : { state, events: [] };
}
function actorAction(state: World, actor: Actor, action: Action): Transition {
  switch (action.type) {
    case 'move': return moveActor(state, actor, action.point);
    case 'sit': return sit(state, actor, action.seat);
    case 'dress': return dress(state, actor, action.look);
    case 'rest': return rest(state, actor);
    case 'pick': return pick(state, actor, action.item);
    case 'drop': return release(state, actor, false);
    case 'feed': return release(state, actor, true);
    case 'give': return give(state, actor, action.item);
    case 'hug': return hug(state, actor, action.other);
    default: return { state, events: [] };
  }
}

export function transition(state: World, action: Action): Transition {
  return action.type === 'name' ? nameActor(state, action.actor, action.name) : playTransition(state, action);
}
function playTransition(state: World, action: Exclude<Action, { type: 'name' }>): Transition {
  if (action.type === 'cross') return cross(state, action);
  if ('room' in action) return navigate(state, action);
  if (action.type === 'use') return usePiece(state, action.id);
  if (action.type === 'interact') return interact(state, action.target);
  if (action.type === 'put') return put(state, action.item, action.spot);
  if (action.type === 'place') return placeItem(state, action);
  if (action.type === 'show') return { state: { ...state, show: !state.show }, events: [{ type: 'show' }] };
  if (action.type === 'summon') {
    return {
      state: { ...state, actors: state.actors.map(a => ({ ...a, x: Math.min(a.x, roomWidth(state) - 60), room: state.room, seat: null })) }, events: [{ type: 'summoned' }],
    };
  }
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
    if (!visibleItem(state, action.item) || !validPoint(action.point, roomWidth(state))) return { state, events: [] };
    return { state: { ...state, items: state.items.map(i => i.id === action.item
      ? { ...i, ...action.point, room: state.room, holder: null, spot: 'floor' } : i) }, events: [{ type: 'dropped' }] };
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
