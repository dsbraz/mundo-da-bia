import { portrait } from './portrait';
import { roomWidth } from '../domain/geometry';
import { actorAt } from './targets';
import { trayDrag } from './tray-drag';
import { lookImage } from './look-image';
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
  icon.src = actorIds.includes(id as ActorId) ? portrait(id as ActorId) : `/icons/${id}.svg`; icon.alt = ''; icon.width = 26; icon.height = 26;
  element.prepend(icon);
  return element;
}
export function createControls(root: HTMLElement, dispatch: (action: Action) => void, select: (id: ActorId) => void, getState: () => World, building: () => boolean) {
  let selected: ActorId = 'bia';
  const cast = actorIds.map(id => illustratedButton(id, actors[id].name, () => select(id), 'character'));
  root.querySelector('#cast')!.append(...cast);
  cast.forEach((b, index) => trayDrag(b, () => roomWidth(getState()), p => {
    const actor = actorIds[index]!; select(actor); dispatch({ type: 'travel', actor, room: getState().room });
    dispatch({ type: 'move', actor, point: { x: Math.max(60, Math.min(roomWidth(getState()) - 60, p.x)), y: Math.max(280, Math.min(540, p.y)) } });
  }, () => !building()));
  root.querySelector('#bring-here')!.addEventListener('click', () => dispatch({ type: 'travel', actor: selected, room: getState().room }));
  const wardrobe = lookIds.map(look => button(`${looks[look].icon} ${looks[look].name}`, () => dispatch({ type: 'dress', actor: selected, look })));
  wardrobe.forEach((b, index) => {
    const img = document.createElement('img'); img.src = lookImage(lookIds[index]!); img.alt = ''; b.prepend(img);
    trayDrag(b, () => roomWidth(getState()), point => { const actor = actorAt(getState(), point); if (actor) dispatch({ type: 'dress', actor: actor.id, look: lookIds[index]! }); }, () => !building());
  });
  root.querySelector('#looks')!.append(...wardrobe);
  const objects = itemIds.map(item => illustratedButton(item, items[item].name, () => dispatch({ type: 'pick', actor: selected, item })));
  objects.forEach((b, index) => trayDrag(b, () => roomWidth(getState()), point => {
    const actor = actorAt(getState(), point); const item = itemIds[index]!;
    dispatch(actor ? { type: 'give', actor: actor.id, item } : { type: 'place', item, point: { x: point.x, y: Math.max(280, Math.min(540, point.y + 28)) } });
  }, () => !building()));
  root.querySelector('#objects')!.append(...objects);
  const actions = [
    button('Oferecer comida', () => dispatch({ type: 'feed', actor: selected })),
    button('Descansar', () => dispatch({ type: 'rest', actor: selected })),
    button('Soltar objeto', () => dispatch({ type: 'drop', actor: selected })),
    button('♫ Começar show', () => dispatch({ type: 'show' }), 'primary'),
  ];
  root.querySelector('#actions')!.append(...actions);
  root.querySelector('#gather')!.addEventListener('click', () => dispatch({ type: 'summon' }));
  return (state: World, id: ActorId, saved: boolean) => {
    selected = id;
    const actor = state.actors.find(a => a.id === id)!;
    const present = actor.room === state.room;
    cast.forEach((b, i) => b.setAttribute('aria-pressed', String(actorIds[i] === id)));
    wardrobe.forEach((b, i) => { b.querySelector('img')!.src = lookImage(lookIds[i]!, id === 'leo' || id === 'rui'); b.disabled = !state.actors.some(a => a.kind === 'human' && a.room === state.room); b.setAttribute('aria-pressed', String(lookIds[i] === actor.look)); });
    objects.forEach((b, i) => { b.disabled = !present || state.items.some(item => item.holder === id) || visibleItem(state, itemIds[i]!)?.holder !== null; });
    const held = state.items.find(item => item.holder === id);
    actions[0]!.disabled = !present || held?.id !== (actor.kind === 'cat' ? 'peixe' : 'lanche');
    actions[1]!.disabled = !present;
    actions[1]!.textContent = actor.resting ? 'Acordar' : 'Descansar';
    actions[2]!.disabled = !present || !held;
    actions[3]!.textContent = state.show ? '♫ Encerrar show' : '♫ Começar show';
    root.querySelector('#selected')!.textContent = actors[id].name;
    root.querySelector<HTMLButtonElement>('#wardrobe-toggle')!.hidden = !present || actor.kind === 'cat';
    actions.forEach(b => { b.hidden = b.disabled; });
    root.querySelector<HTMLButtonElement>('#bring-here')!.disabled = present;
    positionContext(root, actor, state);
    root.querySelector('#save-status')!.textContent = saved ? '✓ Brincadeira salva' : 'Não foi possível salvar neste navegador';
    root.querySelector('#actor-status')!.textContent = actorStatus(actor, held);
  };
}

function actorStatus(actor: Actor, held: Item | undefined): string {
  return `${actor.fed ? 'Já comeu' : 'Pronto para explorar'} · ${actor.resting ? 'Descansando' : 'Pronto para brincar'}${held ? ` · Com ${items[held.id].name}` : ''}`;
}

function positionContext(root: HTMLElement, actor: Actor, state: World) {
  const canvas = root.querySelector('canvas'); if (!canvas) return;
  const box = canvas.getBoundingClientRect(); const panel = root.querySelector<HTMLElement>('#actor-context')!;
  panel.style.left = `${Math.max(12, Math.min(root.clientWidth - 280, box.left + (actor.x < 300 ? actor.x + 70 : actor.x - 120) / roomWidth(state) * box.width))}px`;
  panel.style.top = `${Math.max(82, box.top + (actor.y - 280) / 600 * box.height)}px`;
  panel.classList.toggle('absent', actor.room !== state.room);
}
