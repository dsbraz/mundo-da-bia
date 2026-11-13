import { panelButtons, statusBadges } from './panel';
import { panelControls, renderBadges } from './panel-controls';
import { objectControls } from './object-controls';
import { actorNames } from './actor-names';
import { portrait } from './portrait';
import { roomWidth } from '../domain/geometry';
import { pieceBounds } from '../domain/layout';
import { actorAt } from './targets';
import { screenScale, worldToScreen } from './viewport';
import { trayDrag } from './tray-drag';
import { lookImage } from './look-image';
import { actors, looks } from '../content/catalog';
import { cards } from '../content/personalities';
import { actorIds, lookIds } from '../domain/types';
import { isAdult, wardrobeOf } from '../domain/family';
import { masculine } from './actor-paint';
import type { Action, Actor, ActorId, Point, World } from '../domain/types';
import { uiText } from '../content/ui-text';
import { onFloor } from './floor-band';
import { ringClearance } from './pose';

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
  // W3L-12: each portrait knows who it is, for the small bubble of what someone elsewhere asks for.
  [...cast, ...faces].forEach((b, i) => { b.dataset.actor = actorIds[i % actorIds.length]!; });
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
    wear: () => panelActions.looks(), play: () => panelActions.games(), rest: () => dispatch({ type: 'rest', actor: selected }),
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
    // Each one's own wardrobe (W3L-24): a grown-up sees its 7 looks, a child never the grown-ups' uniforms.
    wardrobe.forEach((b, i) => { b.hidden = !wardrobeOf(id).includes(lookIds[i]!); b.querySelector('img')!.src = lookImage(lookIds[i]!, masculine(id), isAdult(id)); b.disabled = !state.actors.some(a => a.kind === 'human' && a.room === state.room); b.setAttribute('aria-pressed', String(lookIds[i] === actor.look)); });
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
  const size = { width: context.offsetWidth || ringWidth(context), height: context.offsetHeight || 84 }, tall = ringClearance(actor) * scale;
  // Half the widest speech bubble (340 px of text and its padding), so the ring beside the head leaves the line in view.
  const place = ringPlace(feet, size, tall, 186 * scale, world, shelfSigns(canvas, state));
  context.style.setProperty('--ring-x', `${Math.round(place.x - app.left)}px`);
  context.style.setProperty('--ring-y', `${Math.round(place.y - app.top)}px`);
}
type Frame = { left: number; top: number; right: number; bottom: number };
/** Where the ring's top-left corner goes (screen pixels): above the head and the speech line (`tall` above the feet), centred, inside the
 *  scene; when there is no room above (a high seat, such as a bed, on a short screen) beside the head instead, `half` away from its middle
 *  (right, else left), so the line said there is never under the ring (W3L-15). */
export function ringPlace(feet: Point, size: { width: number; height: number }, tall: number, half: number, world: Frame, clear: Frame[] = []): Point {
  const fit = (x: number) => Math.max(world.left + 8, Math.min(world.right - size.width - 8, x));
  const y = feet.y - tall - size.height;
  if (y >= world.top + 8) {
    const above = { x: fit(feet.x - size.width / 2), y: Math.min(world.bottom - size.height - 8, y) };
    // A market shelf's sign stays readable: the ring goes up to the top of the scene instead (W3L-21 art pass).
    return clear.some(sign => covers(above, size, sign)) ? { x: above.x, y: world.top + 8 } : above;
  }
  const right = feet.x + half;
  return { x: fit(right + size.width <= world.right - 8 ? right : feet.x - half - size.width), y: world.top + 8 };
}
const covers = (at: Point, size: { width: number; height: number }, box: Frame) =>
  at.x < box.right && at.x + size.width > box.left && at.y < box.bottom && at.y + size.height > box.top;
/** The market shelves' signs in the room, in screen pixels (the top 36 units of each shelf). */
function shelfSigns(canvas: HTMLCanvasElement, state: World): Frame[] {
  return state.layout.pieces.filter(p => p.room === state.room && p.kind === 'market-shelf').map(p => {
    const a = worldToScreen(canvas, p), b = worldToScreen(canvas, { x: p.x + pieceBounds[p.kind].width, y: p.y + 36 });
    return { left: a.x, top: a.y, right: b.x, bottom: b.y };
  });
}

/** The ring's width while it is hidden (a tray open): its big buttons, "mais", the gaps and the padding (drawer-ring.css). */
function ringWidth(context: HTMLElement) {
  const shown = context.querySelectorAll('.panel-button').length - (context.classList.contains('more') ? 0 : 1);
  return shown * 70 + 56 + 20;
}
