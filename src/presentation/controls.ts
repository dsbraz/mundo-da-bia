import { visibleItem } from '../domain/objects';
import { actors, items, looks } from '../content/catalog';
import { actorIds, itemIds, lookIds } from '../domain/types';
import type { Action, Actor, ActorId, Item, World } from '../domain/types';

function button(label: string, run: () => void, className = ''): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button'; element.textContent = label; element.className = className;
  element.addEventListener('click', run);
  return element;
}
function illustratedButton(id: string, label: string, run: () => void, className = ''): HTMLButtonElement {
  const element = button(label, run, className);
  const icon = document.createElement('img');
  icon.src = `/icons/${id}.svg`; icon.alt = ''; icon.width = 26; icon.height = 26;
  element.prepend(icon);
  return element;
}
export function createControls(root: HTMLElement, dispatch: (action: Action) => void, select: (id: ActorId) => void) {
  let selected: ActorId = 'bia';
  const cast = actorIds.map(id => illustratedButton(id, actors[id].name, () => select(id), 'character'));
  root.querySelector('#cast')!.append(...cast);
  const wardrobe = lookIds.map(look => button(`${looks[look].icon} ${looks[look].name}`, () => dispatch({ type: 'dress', actor: selected, look })));
  root.querySelector('#looks')!.append(...wardrobe);
  const objects = itemIds.map(item => illustratedButton(item, items[item].name, () => dispatch({ type: 'pick', actor: selected, item })));
  root.querySelector('#objects')!.append(...objects);
  const actions = [
    button('♡ Oferecer comida', () => dispatch({ type: 'feed', actor: selected })),
    button('☾ Descansar', () => dispatch({ type: 'rest', actor: selected })),
    button('↓ Soltar objeto', () => dispatch({ type: 'drop', actor: selected })),
    button('♫ Começar show', () => dispatch({ type: 'show' }), 'primary'),
  ];
  root.querySelector('#actions')!.append(...actions);
  root.querySelector('#gather')!.addEventListener('click', () => dispatch({ type: 'summon' }));
  return (state: World, id: ActorId, saved: boolean) => {
    selected = id;
    const actor = state.actors.find(a => a.id === id)!;
    const present = actor.room === state.room;
    cast.forEach((b, i) => b.setAttribute('aria-pressed', String(actorIds[i] === id)));
    wardrobe.forEach((b, i) => { b.disabled = !present || actor.kind === 'cat'; b.setAttribute('aria-pressed', String(lookIds[i] === actor.look)); });
    objects.forEach((b, i) => { b.disabled = !present || state.items.some(item => item.holder === id) || visibleItem(state, itemIds[i]!)?.holder !== null; });
    const held = state.items.find(item => item.holder === id);
    actions[0]!.disabled = !present || held?.id !== (actor.kind === 'cat' ? 'peixe' : 'lanche');
    actions[1]!.disabled = !present;
    actions[1]!.textContent = actor.resting ? '☀ Acordar' : '☾ Descansar';
    actions[2]!.disabled = !present || !held;
    actions[3]!.textContent = state.show ? '♫ Encerrar show' : '♫ Começar show';
    root.querySelector('#selected')!.textContent = `${actors[id].name} · ${present ? 'vamos brincar!' : 'em outro cômodo — toque em Reunir'}`;
    root.querySelector('#save-status')!.textContent = saved ? '✓ Brincadeira salva' : 'Não foi possível salvar neste navegador';
    root.querySelector('#actor-status')!.textContent = actorStatus(actor, held);
  };
}

function actorStatus(actor: Actor, held: Item | undefined): string {
  return `${actor.fed ? 'Já comeu' : 'Pronto para explorar'} · ${actor.resting ? 'Descansando' : 'Pronto para brincar'}${held ? ` · Com ${items[held.id].name}` : ''}`;
}
