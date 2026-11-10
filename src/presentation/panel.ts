import { fixture } from '../domain/layout';
import { itemKind } from '../domain/item-kind';
import { items } from '../content/catalog';
import type { Actor, ItemId, World } from '../domain/types';

/** The five fixed panel slots, always in this order; unavailable ones stay in place, dimmed. */
export const panelSlots = ['wear', 'play', 'rest', 'drop', 'eat'] as const;
export type PanelSlot = typeof panelSlots[number];
export interface PanelButton { slot: PanelSlot; label: string; icon: string; enabled: boolean }
export interface StatusBadge { icon: string; label: string }

const icon = (name: string) => `/icons/ui-panel-${name}.svg`;
export const neededFood = (actor: Actor): ItemId => actor.kind === 'cat' ? 'peixe' : 'lanche';

export function panelButtons(state: World, actor: Actor): PanelButton[] {
  const present = actor.room === state.room;
  const held = state.items.find(item => item.holder === actor.id);
  const food = neededFood(actor);
  return [
    { slot: 'wear', label: 'Vestir', icon: icon('wear'), enabled: present && actor.kind === 'human' },
    { slot: 'play', label: 'Brincar', icon: icon('play'), enabled: present && actor.kind === 'human' },
    { slot: 'rest', label: restLabel(state, actor), icon: icon(actor.resting ? 'wake' : 'rest'), enabled: present },
    { slot: 'drop', label: 'Soltar', icon: icon('drop'), enabled: present && !!held },
    { slot: 'eat', label: 'Comer', icon: `/icons/${food}.svg`, enabled: present && !!held && itemKind(held) === food },
  ];
}

function restLabel(state: World, actor: Actor) {
  if (actor.resting) return 'Acordar';
  return fixture(state, 'bed')?.room === state.room ? 'Deitar' : 'Descansar';
}

export function statusBadges(state: World, actor: Actor, name: string): StatusBadge[] {
  const held = state.items.find(item => item.holder === actor.id);
  return [
    ...(actor.fed ? [{ icon: icon('fed'), label: `${name} está de barriga cheia` }] : []),
    ...(actor.resting ? [{ icon: icon('rest'), label: `${name} está descansando` }] : []),
    ...(held ? [{ icon: `/icons/${itemKind(held)}.svg`, label: `${name} está com ${items[itemKind(held)].name}` }] : []),
  ];
}
