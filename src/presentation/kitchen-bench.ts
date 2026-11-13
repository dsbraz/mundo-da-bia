import type { Ingredient, Utensil } from '../domain/ingredients';
import { utensils } from '../domain/ingredients';
import type { Outcome } from '../domain/recipes';
import type { Point } from '../domain/types';
import { benchText, ingredientNames, utensilNames } from '../content/kitchen';
import { bowlBox, sheet, sheetPart, steamBox } from './art-sheet';
import { worldToScreen } from './viewport';

/** One pantry entry: a crop carries how many units the basket holds (1 to 6), drawn as a pile of icons, never as a number;
 *  `empty`: a basic the house ran out of, drawn as a silhouette (W3L-23). */
export interface PantryEntry { id: Ingredient; pile?: number | undefined; empty?: boolean }
/** `lack`: a silhouette utensil was tapped (this piece does not have it, W3L-16); `restock`: a silhouette ingredient (it comes from the market, W3L-23). */
export interface BenchActions {
  cook: (bowl: Ingredient[], utensil: Utensil) => void; close: () => void; book: () => void; lack: (utensil: Utensil) => void; restock: (id: Ingredient) => void;
}
/** The cooking animation; nothing waits for it (the bowl is free again at once). */
export const cookMs = 1200;
export const ingredientIcon = (id: Ingredient | 'lanche') => id === 'peixe' || id === 'lanche' ? `/icons/${id}.svg` : `/icons/ing-${id}.svg`;
const places = 3, wobbleMs = 700, coverBox = { width: 120, height: 100 };

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, label?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className;
  if (label) node.setAttribute('aria-label', label);
  if (node instanceof HTMLButtonElement) node.type = 'button';
  return node;
}
function picture(src: string, className = '') { const image = element('img', className); image.alt = ''; image.draggable = false; if (src) image.src = src; return image; }

/** The kitchen bench beside the scene: a bowl with 3 places, the pantry by picture and the 4 utensils (§3.2). Callbacks only. */
export function kitchenBench(root: HTMLElement, actions: BenchActions) {
  const panel = element('section', 'kitchen-bench', benchText.region); panel.id = 'kitchen-bench'; panel.hidden = true;
  const close = element('button', 'bench-close illustrated', benchText.close); close.style.setProperty('--button-icon', "url('/icons/ui-close.svg')");
  const book = element('button', 'bench-book', benchText.book), cover = picture(''); book.append(cover);
  const bowlArea = element('div', 'bench-bowl'); bowlArea.dataset.bowl = '';
  const bowlArt = picture(''), steam = picture('', 'bench-steam'); steam.hidden = true;
  const slots = Array.from({ length: places }, (_, i) => { const slot = element('button', 'bowl-slot', benchText.empty); slot.dataset.slot = String(i); return slot; });
  const tools = utensils.map(id => { const b = element('button', 'bench-utensil', utensilNames[id]); b.dataset.utensil = id; b.append(picture(`/icons/ut-${id}.svg`)); return b; });
  const shelf = element('div', 'bench-pantry'); shelf.setAttribute('role', 'group');
  const top = element('div', 'bench-top'), toolRow = element('div', 'bench-utensils');
  top.append(close, book); bowlArea.append(bowlArt, ...slots, steam); toolRow.append(...tools);
  panel.append(top, bowlArea, toolRow, shelf); root.append(panel);
  let bowl: Ingredient[] = [], ghost: Ingredient | null = null, timers: number[] = [];

  function later(ms: number, run: () => void) { timers.push(window.setTimeout(run, ms)); }
  function renderBowl() {
    slots.forEach((slot, i) => {
      const id = bowl[i], hinted = !id && i === bowl.length ? ghost : null;
      slot.replaceChildren(...(id ?? hinted ? [picture(ingredientIcon((id ?? hinted)!), hinted ? 'ghost' : '')] : []));
      slot.dataset.ingredient = id ?? ''; slot.dataset.ghost = hinted ?? '';
      slot.setAttribute('aria-label', id ? benchText.remove(ingredientNames[id]) : benchText.empty);
    });
    panel.dataset.bowl = bowl.join(' ');
  }
  function add(id: Ingredient) { if (bowl.length < places && !bowl.includes(id)) { bowl = [...bowl, id]; ghost = null; renderBowl(); } }
  function stock(entries: PantryEntry[]) {
    shelf.replaceChildren(...entries.map(entry => entry.empty ? emptyButton(entry.id, actions.restock) : pantryButton(entry, add, () => bowlArea.getBoundingClientRect())));
    bowl = bowl.filter(id => entries.some(e => e.id === id && !e.empty)); renderBowl();
  }
  slots.forEach((slot, i) => slot.addEventListener('click', () => { if (bowl[i]) { bowl = bowl.filter((_, n) => n !== i); ghost = null; renderBowl(); } }));
  tools.forEach((tool, i) => tool.addEventListener('click', () => {
    if (tool.dataset.absent === 'true') actions.lack(utensils[i]!); else if (bowl.length) actions.cook([...bowl], utensils[i]!); else flash(bowlArea, 'nudge', wobbleMs);
  }));
  close.addEventListener('click', () => actions.close()); book.addEventListener('click', () => actions.book());
  function flash(target: HTMLElement, name: string, ms: number) { target.classList.remove(name); void target.offsetWidth; target.classList.add(name); later(ms, () => target.classList.remove(name)); }
  function show(outcome: Outcome) {
    if (outcome.kind === 'dish') { bowl = []; ghost = null; panel.dataset.cooking = outcome.recipe; flash(bowlArea, 'cooking', cookMs); later(cookMs, () => { panel.dataset.cooking = ''; }); }
    if (outcome.kind === 'utensil') { panel.dataset.wobble = outcome.utensil; flash(tools[utensils.indexOf(outcome.utensil)]!, 'wobble', wobbleMs); }
    if (outcome.kind === 'ghost') ghost = outcome.ingredient;
    if (outcome.kind === 'steam') { steam.hidden = false; panel.dataset.steam = 'true'; flash(steam, 'puff', cookMs); later(cookMs, () => { steam.hidden = true; panel.dataset.steam = ''; }); }
    renderBowl();
  }
  return {
    /** Opens beside the scene, on the side away from `anchor` (the bench piece, in world coordinates) so the dish stays in view. */
    open(entries: PantryEntry[], anchor: Point, here: readonly Utensil[] = utensils) {
      tools.forEach((tool, i) => { tool.dataset.absent = String(!here.includes(utensils[i]!)); });
      if (!bowlArt.src) void sheet('kitchen').then(source => { bowlArt.src = sheetPart(source, ['bowl'], bowlBox); steam.src = sheetPart(source, ['steam'], steamBox); });
      if (!cover.src) void sheet('book').then(source => { cover.src = sheetPart(source, ['cover'], coverBox); });
      const canvas = root.querySelector('canvas'), world = root.querySelector('#world')!.getBoundingClientRect();
      const x = canvas ? worldToScreen(canvas, anchor).x : world.left;
      panel.dataset.side = x > world.left + world.width / 2 ? 'left' : 'right';
      bowl = []; ghost = null; stock(entries); panel.hidden = false;
    },
    close() { panel.hidden = true; timers.forEach(clearTimeout); timers = []; panel.dataset.cooking = ''; panel.dataset.steam = ''; panel.dataset.wobble = ''; steam.hidden = true; },
    refresh: stock, show, isOpen: () => !panel.hidden,
  };
}
/** A basic the house ran out of: its silhouette, and a tap shows where it comes from. */
function emptyButton(id: Ingredient, restock: (id: Ingredient) => void) {
  const button = element('button', 'bench-ingredient', benchText.outOf(ingredientNames[id])); button.dataset.ingredient = id; button.dataset.empty = 'true';
  button.append(picture(ingredientIcon(id))); button.addEventListener('click', () => restock(id));
  return button;
}
/** A pantry button: a tap puts the ingredient in the bowl, and so does dragging it there. */
function pantryButton(entry: PantryEntry, add: (id: Ingredient) => void, bowl: () => DOMRect) {
  const button = element('button', 'bench-ingredient', ingredientNames[entry.id]); button.dataset.ingredient = entry.id;
  button.append(picture(ingredientIcon(entry.id)));
  if (entry.pile) { const pile = element('span', 'pile'); pile.append(...Array.from({ length: entry.pile - 1 }, () => picture(ingredientIcon(entry.id)))); button.append(pile); }
  let start: Point | null = null, ghost: HTMLImageElement | null = null, dragged = false;
  button.addEventListener('pointerdown', event => { start = { x: event.clientX, y: event.clientY }; dragged = false; button.setPointerCapture(event.pointerId); });
  button.addEventListener('pointermove', event => {
    if (!start || (!ghost && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8)) return;
    ghost ??= document.body.appendChild(picture(ingredientIcon(entry.id), 'bench-ghost'));
    dragged = true; ghost.style.left = `${event.clientX}px`; ghost.style.top = `${event.clientY}px`;
  });
  const finish = (event: PointerEvent, drop: boolean) => {
    const box = bowl(), over = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (drop && dragged && over) add(entry.id);
    ghost?.remove(); ghost = null; start = null; window.setTimeout(() => { dragged = false; });
  };
  button.addEventListener('pointerup', event => finish(event, true));
  button.addEventListener('pointercancel', event => finish(event, false));
  button.addEventListener('click', () => { if (!dragged) add(entry.id); });
  return button;
}
