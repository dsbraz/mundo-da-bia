import { fixture } from '../domain/layout';
import { itemKind } from '../domain/item-kind';
import { items } from '../content/catalog';
import { dishNames } from '../content/kitchen';
import { edible } from '../domain/care';
import { dishOf, itemIcon } from './art-sheet';
import type { Actor, Item, ItemId, World } from '../domain/types';

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
  return [
    { slot: 'wear', label: 'Vestir', icon: icon('wear'), enabled: present && actor.kind === 'human' },
    { slot: 'play', label: 'Jogar', icon: icon('play'), enabled: present && !state.streetWidth && state.actors.some(a => a.kind === 'human' && a.room === state.room) },
    { slot: 'rest', label: restLabel(state, actor), icon: icon(actor.resting ? 'wake' : 'rest'), enabled: present },
    { slot: 'drop', label: 'Soltar', icon: icon('drop'), enabled: present && !!held },
    { slot: 'eat', label: 'Comer', ...eatButton(actor, held), enabled: present && !!held && (itemKind(held) === neededFood(actor) || edible(actor, held)) },
  ];
}

/** Comer shows the dish in hand, else the food this actor eats. */
const eatButton = (actor: Actor, held: Item | undefined) => ({ icon: held && dishOf(held) ? itemIcon(held) : `/icons/${neededFood(actor)}.svg` });
function restLabel(state: World, actor: Actor) {
  if (actor.resting) return 'Acordar';
  return fixture(state, 'bed')?.room === state.room ? 'Deitar' : 'Descansar';
}

export function statusBadges(state: World, actor: Actor, name: string): StatusBadge[] {
  const held = state.items.find(item => item.holder === actor.id);
  return [
    ...(actor.fed ? [{ icon: icon('fed'), label: `${name} está de barriga cheia` }] : []),
    ...(actor.resting ? [{ icon: icon('rest'), label: `${name} está descansando` }] : []),
    ...(held ? [{ icon: itemIcon(held), label: `${name} está com ${itemName(held)}` }] : []),
  ];
}
/** What an object is called: a dish by its recipe. */
export function itemName(item: Item): string {
  const dish = dishOf(item);
  return dish ? dishNames[dish.recipe] : items[itemKind(item)].name;
}
