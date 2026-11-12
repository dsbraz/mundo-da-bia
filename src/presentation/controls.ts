import { fixture } from '../domain/layout';
import { panelButtons, statusBadges } from './panel';
import { panelControls, renderBadges } from './panel-controls';
import { objectControls } from './object-controls';
import { actorNames } from './actor-names';
import { portrait } from './portrait';
import { roomWidth } from '../domain/geometry';
import { actorAt } from './targets';
import { screenScale, worldToScreen } from './viewport';
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
function faceButton(element: HTMLButtonElement, label: string) {
  const text = document.createElement('span'); text.className = 'face-name';
  text.append(...Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE));
  element.append(text); element.setAttribute('aria-label', label); return element;
}
export interface PanelActions { looks: () => void; games: () => void }
export function createControls(root: HTMLElement, dispatch: (action: Action) => void, select: (id: ActorId) => void, getState: () => World, building: () => boolean, panelActions: PanelActions) {
  let selected: ActorId = 'bia';
  const cast = actorIds.map(id => illustratedButton(id, actors[id].name, () => select(id), 'character'));
  // The portrait strip shows only the faces (W3L-03): the name is the button's accessible name, its text is hidden there.
  const faces = actorIds.map(id => faceButton(illustratedButton(id, actors[id].name, () => select(id)), actors[id].name));
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
/** The action ring (W3L-03) floats above the selected character's head and their speech bubble, centred on them, whole inside the scene. */
export function positionContext(root: HTMLElement, actor: Actor, state: World) {
  const context = root.querySelector<HTMLElement>('#actor-context')!, canvas = root.querySelector('canvas');
  context.classList.toggle('absent', actor.room !== state.room);
  const world = root.querySelector('#world')?.getBoundingClientRect();
  if (!canvas || !world?.width) return;
  const app = root.getBoundingClientRect(), scale = screenScale(canvas), feet = worldToScreen(canvas, actor);
  const width = context.offsetWidth || ringWidth(context), height = context.offsetHeight || 84, tall = (actor.kind === 'cat' ? 170 : 300) * scale;
  const x = feet.x - width / 2, y = feet.y - tall - height;
  context.style.setProperty('--ring-x', `${Math.round(Math.max(world.left + 8, Math.min(world.right - width - 8, x)) - app.left)}px`);
  context.style.setProperty('--ring-y', `${Math.round(Math.max(world.top + 8, Math.min(world.bottom - height - 8, y)) - app.top)}px`);
}

/** The ring's width while it is hidden (a tray open): its big buttons, "mais", the gaps and the padding (drawer-ring.css). */
function ringWidth(context: HTMLElement) {
  const shown = context.querySelectorAll('.panel-button').length - (context.classList.contains('more') ? 0 : 1);
  return shown * 70 + 56 + 20;
}
function rest(state: World, actor: ActorId, dispatch: (action: Action) => void) {
  const value = state.actors.find(a => a.id === actor)!;
  if (!value.resting && fixture(state, 'bed')?.room === state.room) dispatch({ type: 'sit', actor, seat: 'bed' });
  else dispatch({ type: 'rest', actor });
}
