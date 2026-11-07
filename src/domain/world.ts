import { validPoint } from './geometry';
export { validPoint } from './geometry';
import { initialLayout } from './layout';
import { actorIds, itemIds } from './types';
import type { Action, Actor, Point, PresentationEvent, Transition, World } from './types';
import { interact, put, sit, foodHome } from './furniture';
import { give, visibleItem } from './objects';

export function initialWorld(): World {
  return {
    room: 'sala', show: false, layout: initialLayout(), home: { lamp: true, fridge: true, drawer: false },
    actors: actorIds.map((id, index) => ({
      id, kind: index < 4 ? 'human' : 'cat', room: 'sala', look: (['sol', 'estrela', 'mar', 'jardim', 'sol', 'sol', 'sol'] as const)[index]!,
      x: [520, 440, 755, 880, 600, 710, 835][index]!, y: index < 4 ? 530 : 540, fed: false, resting: false, seat: null,
    })),
    items: itemIds.map((id, index) => ({ id, room: 'sala', holder: null, spot: index < 2 ? 'fridge' : 'floor',
      x: [680, 680, 900, 350][index]!, y: [310, 360, 280, 410][index]! })),
  };
}

function changeActor(state: World, actor: Actor, patch: Partial<Actor>, type: PresentationEvent['type']): Transition {
  return { state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...patch } : a) }, events: [{ type, actor: actor.id }] };
}

function pick(state: World, actor: Actor, itemId: import('./types').ItemId): Transition {
  const item = visibleItem(state, itemId);
  if (!item || item.holder || item.room !== state.room || state.items.some(i => i.holder === actor.id)) {
    return { state, events: [] };
  }
  return {
    state: { ...state, items: state.items.map(i => i.id === itemId ? { ...i, holder: actor.id, spot: 'floor' } : i) },
    events: [{ type: 'picked', actor: actor.id }],
  };
}

function release(state: World, actor: Actor, feeding: boolean): Transition {
  const item = state.items.find(i => i.holder === actor.id);
  if (!item) return { state, events: [] };
  const food = actor.kind === 'cat' ? 'peixe' : 'lanche';
  if (feeding && item.id !== food) return { state, events: [] };
  const result = feeding ? changeActor(state, actor, { fed: true, resting: false }, 'fed')
    : { state, events: [{ type: 'dropped' as const, actor: actor.id }] };
  return { ...result, state: { ...result.state, items: state.items.map(i => i.id === item.id
    ? { ...i, ...foodHome(state, i, actor, feeding) } : i) } };
}

function actorAction(state: World, actor: Actor, action: Action): Transition {
  switch (action.type) {
    case 'move': return moveActor(state, actor, action.point);
    case 'sit': return sit(state, actor, action.seat);
    case 'dress':
      return actor.kind === 'human' ? changeActor(state, actor, { look: action.look }, 'dressed') : { state, events: [] };
    case 'rest': return changeActor(state, actor, { resting: !actor.resting }, 'rested');
    case 'pick': return pick(state, actor, action.item);
    case 'drop': return release(state, actor, false);
    case 'feed': return release(state, actor, true);
    case 'give': return give(state, actor, action.item);
    default: return { state, events: [] };
  }
}

export function transition(state: World, action: Action): Transition {
  if (action.type === 'interact') return interact(state, action.target);
  if (action.type === 'put') return put(state, action.item, action.spot);
  if (action.type === 'place') {
    if (!visibleItem(state, action.item) || !validPoint(action.point)) return { state, events: [] };
    return { state: { ...state, items: state.items.map(i => i.id === action.item
      ? { ...i, ...action.point, room: state.room, holder: null, spot: 'floor' } : i) }, events: [{ type: 'dropped' }] };
  }
  if (action.type === 'room') return { state: { ...state, room: action.room, show: false }, events: [{ type: 'room' }] };
  if (action.type === 'show') return { state: { ...state, show: !state.show }, events: [{ type: 'show' }] };
  if (action.type === 'summon') {
    return {
      state: { ...state, actors: state.actors.map(a => ({ ...a, room: state.room, seat: null })) }, events: [{ type: 'summoned' }],
    };
  }
  const actor = state.actors.find(a => a.id === action.actor && a.room === state.room);
  return actor ? actorAction(state, actor, action) : { state, events: [] };
}

function moveActor(state: World, actor: Actor, point: Point): Transition {
  return validPoint(point) ? changeActor(state, actor, { ...point, resting: false, seat: null }, 'moved') : { state, events: [] };
}
