import { fixture } from '../domain/layout';
import { panelButtons, statusBadges } from './panel';
import { panelControls, renderBadges } from './panel-controls';
import { objectControls } from './object-controls';
import { actorNames } from './actor-names';
import { portrait } from './portrait';
import { roomWidth } from '../domain/geometry';
import { actorAt } from './targets';
import { trayDrag } from './tray-drag';
import { lookImage } from './look-image';
import { actors, looks } from '../content/catalog';
import { cards } from '../content/personalities';
import { actorIds, lookIds } from '../domain/types';
import type { Action, Actor, ActorId, World } from '../domain/types';
import { uiText } from '../content/ui-text';
import { onFloor } from './floor-band';

function button(label: string, run: () => void, className = ''): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button'; element.textContent = label; element.className = className;
  element.addEventListener('click', run);
  return element;
}
function illustratedButton(id: string, label: string, run: () => void, className = ''): HTMLButtonElement {
  const element = button(label, run, className);
  const icon = document.createElement('img');
  icon.src = actorIds.includes(id as ActorId) ? portrait(id as ActorId) : `/icons/${id}.svg`; icon.alt = ''; icon.width = 26; icon.height = 26; icon.draggable = false;
  element.prepend(icon);
  return element;
}
export interface PanelActions { looks: () => void; games: () => void }
export function createControls(root: HTMLElement, dispatch: (action: Action) => void, select: (id: ActorId) => void, getState: () => World, building: () => boolean, panelActions: PanelActions) {
  let selected: ActorId = 'bia';
  const cast = actorIds.map(id => illustratedButton(id, actors[id].name, () => select(id), 'character'));
  const faces = actorIds.map(id => illustratedButton(id, actors[id].name, () => select(id)));
  root.querySelector('#play-hint .hint-cast')!.append(...faces);
  const name = actorNames(root, dispatch, getState);
  root.querySelector('#cast')!.append(...cast.map((card, i) => castCard(card, actorIds[i]!, () => name(actorIds[i]!))));
  cast.forEach((b, index) => trayDrag(b, () => roomWidth(getState()), p => {
    const actor = actorIds[index]!; select(actor); dispatch({ type: 'travel', actor, room: getState().room });
    dispatch({ type: 'move', actor, point: onFloor(getState(), p) });
  }, () => !building()));
  const wardrobe = lookIds.map(look => button(looks[look].name, () => dispatch({ type: 'dress', actor: selected, look })));
  wardrobe.forEach((b, index) => {
    const img = document.createElement('img'); img.src = lookImage(lookIds[index]!); img.alt = ''; b.prepend(img);
    trayDrag(b, () => roomWidth(getState()), point => { const actor = actorAt(getState(), point); if (actor) dispatch({ type: 'dress', actor: actor.id, look: lookIds[index]! }); }, () => !building());
  });
  root.querySelector('#looks')!.append(...wardrobe);
  const refreshObjects = objectControls(root, dispatch, getState, () => selected, building);
  const panel = panelControls(root.querySelector('#actions')!, {
    wear: () => panelActions.looks(), play: () => panelActions.games(), rest: () => rest(getState(), selected, dispatch),
    drop: () => dispatch({ type: 'drop', actor: selected }), eat: () => dispatch({ type: 'feed', actor: selected }),
  });
  root.querySelector('#gather')!.addEventListener('click', () => dispatch({ type: 'summon' }));
  return (state: World, id: ActorId, saved: boolean) => {
    selected = id;
    const actor = state.actors.find(a => a.id === id)!;
    cast.forEach((b, i) => {
      const member = state.actors.find(a => a.id === actorIds[i])!, picture = portrait(member.id, member.look), image = b.querySelector('img')!;
      b.setAttribute('aria-pressed', String(member.id === id)); b.lastChild!.textContent = member.name ?? actors[member.id].name;
      b.nextElementSibling!.setAttribute('aria-label', uiText.name.rename(member.name ?? actors[member.id].name));
      if (image.getAttribute('src') !== picture) { image.src = picture; faces[i]!.querySelector('img')!.src = picture; }
      faces[i]!.lastChild!.textContent = member.name ?? actors[member.id].name;
    });
    wardrobe.forEach((b, i) => { b.querySelector('img')!.src = lookImage(lookIds[i]!, id === 'leo' || id === 'rui'); b.disabled = !state.actors.some(a => a.kind === 'human' && a.room === state.room); b.setAttribute('aria-pressed', String(lookIds[i] === actor.look)); });
    refreshObjects();
    panel(panelButtons(state, actor));
    root.querySelector('#selected')!.textContent = actor.name ?? actors[id].name;
    positionContext(root, actor, state);
    root.querySelector('#save-status')!.textContent = saved ? '✓ Brincadeira salva' : 'Não foi possível salvar neste navegador';
    renderBadges(root.querySelector('#actor-status')!, statusBadges(state, actor, actor.name ?? actors[id].name));
  };
}

/** A Turma card: the portrait button, the pencil right after it (renaming) and the character's motto under them. */
function castCard(card: HTMLButtonElement, id: ActorId, rename: () => void) {
  const group = document.createElement('article'), pencil = button('', rename, 'rename illustrated'), motto = document.createElement('p');
  group.className = 'character-card'; pencil.style.setProperty('--button-icon', "url('/icons/ui-pencil.svg')");
  motto.className = 'motto'; motto.textContent = cards[id].motto;
  group.append(card, pencil, motto);
  return group;
}
export function positionContext(root: HTMLElement, actor: Actor, state: World) {
  root.querySelector<HTMLElement>('#actor-context')!.classList.toggle('absent', actor.room !== state.room);
}

function rest(state: World, actor: ActorId, dispatch: (action: Action) => void) {
  const value = state.actors.find(a => a.id === actor)!;
  if (!value.resting && fixture(state, 'bed')?.room === state.room) dispatch({ type: 'sit', actor, seat: 'bed' });
  else dispatch({ type: 'rest', actor });
}
