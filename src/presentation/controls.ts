import { fixture } from '../domain/layout';
import { itemKind } from '../domain/item-kind';
import { objectControls } from './object-controls';
import { actorNames } from './actor-names';
import { portrait } from './portrait';
import { roomWidth } from '../domain/geometry';
import { actorAt } from './targets';
import { trayDrag } from './tray-drag';
import { lookImage } from './look-image';
import { actors, items, looks } from '../content/catalog';
import { actorIds, lookIds } from '../domain/types';
import type { Action, Actor, ActorId, Item, ItemId, World } from '../domain/types';

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
export function createControls(root: HTMLElement, dispatch: (action: Action) => void, select: (id: ActorId) => void, getState: () => World, building: () => boolean, carryItem: (item: ItemId) => void, canCarry: () => boolean) {
  let selected: ActorId = 'bia';
  const cast = actorIds.map(id => illustratedButton(id, actors[id].name, () => select(id), 'character'));
  const name = actorNames(root, dispatch, getState);
  root.querySelector('#cast')!.append(...cast.map((card, i) => { const group = document.createElement('article'); group.className = 'character-card'; group.append(card, button('✎ Nome', () => name(actorIds[i]!))); return group; }));
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
  const refreshObjects = objectControls(root, dispatch, getState, () => selected, building, carryItem, canCarry);
  const actions = [
    button('Oferecer comida', () => dispatch({ type: 'feed', actor: selected })),
    button('Descansar', () => rest(getState(), selected, dispatch)),
    button('Soltar objeto', () => dispatch({ type: 'drop', actor: selected })),
    button('♫ Começar show', () => dispatch({ type: 'show' }), 'primary'),
  ];
  root.querySelector('#actions')!.append(...actions);
  root.querySelector('#gather')!.addEventListener('click', () => dispatch({ type: 'summon' }));
  return (state: World, id: ActorId, saved: boolean) => {
    selected = id;
    const actor = state.actors.find(a => a.id === id)!;
    const present = actor.room === state.room;
    cast.forEach((b, i) => { b.setAttribute('aria-pressed', String(actorIds[i] === id)); b.lastChild!.textContent = state.actors.find(a => a.id === actorIds[i])!.name ?? actors[actorIds[i]!].name; });
    wardrobe.forEach((b, i) => { b.querySelector('img')!.src = lookImage(lookIds[i]!, id === 'leo' || id === 'rui'); b.disabled = !state.actors.some(a => a.kind === 'human' && a.room === state.room); b.setAttribute('aria-pressed', String(lookIds[i] === actor.look)); });
    refreshObjects();
    const held = state.items.find(item => item.holder === id);
    actions[0]!.disabled = !present || (held && itemKind(held)) !== (actor.kind === 'cat' ? 'peixe' : 'lanche');
    actions[1]!.disabled = !present;
    actions[1]!.textContent = restLabel(state, actor);
    actions[2]!.disabled = !present || !held;
    actions[3]!.textContent = state.show ? '♫ Encerrar show' : '♫ Começar show';
    root.querySelector('#selected')!.textContent = actor.name ?? actors[id].name;
    root.querySelector<HTMLButtonElement>('#wardrobe-toggle')!.hidden = !present || actor.kind === 'cat';
    actions.forEach(b => { b.hidden = b.disabled; });
    root.querySelector<HTMLButtonElement>('#bring-here')!.disabled = present;
    positionContext(root, actor, state);
    root.querySelector('#save-status')!.textContent = saved ? '✓ Brincadeira salva' : 'Não foi possível salvar neste navegador';
    root.querySelector('#actor-status')!.textContent = actorStatus(actor, held);
  };
}

function actorStatus(actor: Actor, held: Item | undefined): string {
  return `${actor.fed ? 'Já comeu' : 'Pronto para explorar'} · ${actor.resting ? 'Descansando' : 'Pronto para brincar'}${held ? ` · Com ${items[itemKind(held)].name}` : ''}`;
}

export function positionContext(root: HTMLElement, actor: Actor, state: World) {
  const canvas = root.querySelector('canvas'); if (!canvas) return;
  const box = canvas.getBoundingClientRect(); const panel = root.querySelector<HTMLElement>('#actor-context')!;
  panel.style.left = `${Math.max(12, Math.min(root.clientWidth - 280, box.left + ((actor.x < 300 ? actor.x + 70 : actor.x - 120) - Number(canvas.dataset.cameraX ?? 0)) / (state.streetWidth ? 1000 : roomWidth(state)) * box.width))}px`;
  const head = actor.kind === 'cat' ? 105 : 190;
  panel.style.top = `${Math.max(82, box.top + (actor.y - head) / 600 * box.height - (panel.offsetHeight || 150) - 12)}px`;
  panel.classList.toggle('absent', actor.room !== state.room);
}

function rest(state: World, actor: ActorId, dispatch: (action: Action) => void) {
  const value = state.actors.find(a => a.id === actor)!;
  if (!value.resting && fixture(state, 'bed')?.room === state.room) dispatch({ type: 'sit', actor, seat: 'bed' });
  else dispatch({ type: 'rest', actor });
}

function restLabel(state: World, actor: Actor) {
  if (actor.resting) return 'Acordar';
  return fixture(state, 'bed')?.room === state.room ? 'Deitar na cama' : 'Descansar';
}
