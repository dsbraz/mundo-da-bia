import { itemKind } from './item-kind';
import { availableSpot, foodHome } from './furniture';
import type { Actor, Item, ItemId, Transition, World } from './types';
import { eat, wake } from './care';
import { refuse } from './missing';

export function visibleItem(state: World, id: ItemId): Item | undefined {
  return state.items.find(item => item.id === id && (item.holder
    ? state.actors.some(actor => actor.id === item.holder && actor.room === state.room)
    : item.room === state.room && availableSpot(state, item.spot)));
}

export function give(state: World, actor: Actor, id: ItemId): Transition {
  const item = visibleItem(state, id);
  if (item?.kind === 'prato') return eat(state, actor, item);
  const occupied = state.items.some(i => i.holder === actor.id && i.id !== id);
  if (!item) return refuse(state, 'place', actor.id);
  if (occupied) return refuse(state, 'hands', actor.id);
  const kind = itemKind(item);
  const food = kind === 'lanche' || kind === 'peixe';
  if (food && kind !== (actor.kind === 'cat' ? 'peixe' : 'lanche')) return refuse(state, 'food', actor.id);
  return deliver(state, actor, item, food);
}

function deliver(state: World, actor: Actor, item: Item, food: boolean): Transition {
  const show = itemKind(item) === 'microfone' && actor.kind === 'human';
  return {
    state: {
      ...state, show: state.show || show,
      actors: state.actors.map(a => a.id === actor.id ? { ...a, ...wake(a), ...(food ? { fed: true } : {}) } : a),
      items: state.items.map(i => i.id === item.id ? { ...i, ...(food ? foodHome(state, i, actor, true) : { room: actor.room, holder: actor.id, spot: 'floor' as const }) } : i),
    },
    events: [{ type: food ? 'fed' : 'picked', actor: actor.id }, ...(show ? [{ type: 'show' as const }] : [])],
  };
}
