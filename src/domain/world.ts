import { actorIds, itemIds } from './types';
import type { Action, Actor, Point, PresentationEvent, Transition, World } from './types';
import { give, visibleItem } from './objects';

export function initialWorld(): World {
  return {
    room: 'sala', show: false,
    actors: actorIds.map((id, index) => ({
      id, kind: index < 4 ? 'human' : 'cat', room: 'sala', look: 'sol',
      x: 160 + index * 110, y: index < 4 ? 410 : 500, fed: false, resting: false,
    })),
    items: itemIds.map((id, index) => ({ id, room: 'sala', holder: null, x: 260 + index * 150, y: 300 })),
  };
}

export function validPoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 60 && point.x <= 940 && point.y >= 280 && point.y <= 540;
}

function changeActor(state: World, actor: Actor, patch: Partial<Actor>, type: PresentationEvent['type']): Transition {
  return { state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...patch } : a) }, events: [{ type, actor: actor.id }] };
}

function pick(state: World, actor: Actor, itemId: string): Transition {
  const item = state.items.find(i => i.id === itemId);
  if (!item || item.holder || item.room !== state.room || state.items.some(i => i.holder === actor.id)) {
    return { state, events: [] };
  }
  return {
    state: { ...state, items: state.items.map(i => i.id === itemId ? { ...i, holder: actor.id } : i) },
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
    ? { ...i, holder: null, room: actor.room, x: actor.x, y: actor.y } : i) } };
}

function actorAction(state: World, actor: Actor, action: Action): Transition {
  switch (action.type) {
    case 'move':
      return validPoint(action.point) ? changeActor(state, actor, { ...action.point, resting: false }, 'moved') : { state, events: [] };
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
  if (action.type === 'place') {
    if (!visibleItem(state, action.item) || !validPoint(action.point)) return { state, events: [] };
    return { state: { ...state, items: state.items.map(i => i.id === action.item
      ? { ...i, ...action.point, room: state.room, holder: null } : i) }, events: [{ type: 'dropped' }] };
  }
  if (action.type === 'room') return { state: { ...state, room: action.room, show: false }, events: [{ type: 'room' }] };
  if (action.type === 'show') return { state: { ...state, show: !state.show }, events: [{ type: 'show' }] };
  if (action.type === 'summon') {
    return {
      state: { ...state, actors: state.actors.map(a => ({ ...a, room: state.room })) }, events: [{ type: 'summoned' }],
    };
  }
  const actor = state.actors.find(a => a.id === action.actor && a.room === state.room);
  return actor ? actorAction(state, actor, action) : { state, events: [] };
}
