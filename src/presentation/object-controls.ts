import { visibleItem } from '../domain/objects';
import type { Action, ActorId, Item, ItemId, World } from '../domain/types';
import { trayDrag } from './tray-drag';
import { roomWidth } from '../domain/geometry';
import { actorAt } from './targets';
import { itemIcon, showItem } from './art-sheet';
import { itemName } from './panel';
interface Callbacks { dispatch: (a: Action) => void; get: () => World; selected: () => ActorId; building: () => boolean }
export function objectControls(root: HTMLElement, dispatch: Callbacks['dispatch'], get: Callbacks['get'], selected: Callbacks['selected'], building: Callbacks['building']) {
  const cards = new Map<ItemId, ReturnType<typeof objectCard>>();
  return () => {
    const state = get();
    const entries = state.items.map(item => {
      if (!cards.has(item.id)) cards.set(item.id, objectCard(item, { dispatch, get, selected, building }));
      const card = cards.get(item.id)!;
      card.pick.disabled = !canPick(state, item, selected());
      const picture = itemIcon(item); if (card.icon.getAttribute('src') !== picture) card.icon.src = picture;
      return card.root;
    });
    const container = root.querySelector('#objects')!;
    if (entries.some((entry, i) => container.children[i] !== entry) || entries.length !== container.children.length) container.replaceChildren(...entries);
  };
}
function objectCard(item: Item, actions: Callbacks) {
  const button = document.createElement('button'); button.type = 'button';
  const icon = document.createElement('img'); showItem(icon, item); icon.alt = ''; icon.width = 26; icon.height = 26;
  button.append(icon, document.createTextNode(itemName(item)));
  button.onclick = () => actions.dispatch({ type: 'pick', actor: actions.selected(), item: item.id });
  trayDrag(button, () => roomWidth(actions.get()), point => {
    const target = actorAt(actions.get(), point);
    actions.dispatch(target ? { type: 'give', actor: target.id, item: item.id } : { type: 'place', item: item.id, point: { x: point.x, y: Math.max(280, Math.min(540, point.y + 28)) } });
  }, () => !actions.building());
  const card = document.createElement('article'); card.className = 'character-card';
  card.append(button);
  return { root: card, pick: button, icon };
}

function canPick(state: World, item: Item, actor: ActorId) {
  return !!visibleItem(state, item.id) && !item.holder && state.actors.some(a => a.id === actor && a.room === state.room) && !state.items.some(i => i.holder === actor);
}
