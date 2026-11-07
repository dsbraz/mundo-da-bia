import { itemKind } from '../domain/item-kind';
import { visibleItem } from '../domain/objects';
import type { Action, ActorId, Item, ItemId, World } from '../domain/types';
import { items } from '../content/catalog';
import { trayDrag } from './tray-drag';
import { roomWidth } from '../domain/geometry';
import { actorAt } from './targets';
interface Callbacks { dispatch: (a: Action) => void; get: () => World; selected: () => ActorId; building: () => boolean; carry: (id: ItemId) => void; canCarry: () => boolean }
export function objectControls(root: HTMLElement, dispatch: Callbacks['dispatch'], get: Callbacks['get'], selected: Callbacks['selected'], building: Callbacks['building'], carry: Callbacks['carry'], canCarry: Callbacks['canCarry']) {
  const cards = new Map<ItemId, ReturnType<typeof objectCard>>();
  return () => {
    const state = get();
    const entries = state.items.map(item => {
      if (!cards.has(item.id)) cards.set(item.id, objectCard(item, { dispatch, get, selected, building, carry, canCarry }));
      const card = cards.get(item.id)!;
      card.pick.disabled = !canPick(state, item, selected());
      card.transport.hidden = !canCarry() || !!item.holder || item.spot !== 'floor' || item.room !== state.room;
      return card.root;
    });
    const container = root.querySelector('#objects')!;
    if (entries.some((entry, i) => container.children[i] !== entry) || entries.length !== container.children.length) container.replaceChildren(...entries);
  };
}
function objectCard(item: Item, actions: Callbacks) {
  const button = document.createElement('button'); button.type = 'button';
  const icon = document.createElement('img'); icon.src = `/icons/${itemKind(item)}.svg`; icon.alt = ''; icon.width = 26; icon.height = 26;
  button.append(icon, document.createTextNode(items[itemKind(item)].name));
  button.onclick = () => actions.dispatch({ type: 'pick', actor: actions.selected(), item: item.id });
  trayDrag(button, () => roomWidth(actions.get()), point => {
    const target = actorAt(actions.get(), point);
    actions.dispatch(target ? { type: 'give', actor: target.id, item: item.id } : { type: 'place', item: item.id, point: { x: point.x, y: Math.max(280, Math.min(540, point.y + 28)) } });
  }, () => !actions.building());
  const card = document.createElement('article'); card.className = 'character-card';
  const transport = document.createElement('button'); transport.textContent = '♧ Levar pela porta'; transport.onclick = () => actions.carry(item.id);
  card.append(button, transport);
  return { root: card, pick: button, transport };
}

function canPick(state: World, item: Item, actor: ActorId) {
  return !!visibleItem(state, item.id) && !item.holder && state.actors.some(a => a.id === actor && a.room === state.room) && !state.items.some(i => i.holder === actor);
}
