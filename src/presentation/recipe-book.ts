import type { Progress } from '../domain/progress';
import { bookPages } from '../domain/recipe-book';
import type { BookEntry, BookPage } from '../domain/recipe-book';
import { bookText, dishNames, ingredientNames, utensilNames } from '../content/kitchen';
import { dishBox, dishParts, sheet, sheetPart } from './art-sheet';
import type { Box } from './art-sheet';
import { ingredientIcon } from './kitchen-bench';

const spreadBox: Box = { width: 400, height: 260 }, ribbonBox: Box = { width: 24, height: 60 }, secretsBox: Box = { width: 64, height: 64 };
type PageId = BookPage['id'];
interface Sheets { dishes: string; book: string }

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, label?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className;
  if (label) node.setAttribute('aria-label', label);
  if (node instanceof HTMLButtonElement) node.type = 'button';
  return node;
}
function picture(src: string, className = '') { const image = element('img', className); image.alt = ''; image.draggable = false; image.src = src; return image; }

/** The recipe book (§3.2): a page per utensil and, after the first secret, a secrets page. Read by picture: no numbers, no counts. */
export function recipeBook(root: HTMLElement, progress: () => Progress) {
  const panel = element('section', 'recipe-book', bookText.region); panel.id = 'recipe-book'; panel.hidden = true;
  const tabs = element('nav', 'book-tabs', bookText.pages), close = element('button', 'book-close illustrated', bookText.close);
  close.style.setProperty('--button-icon', "url('/icons/ui-close.svg')");
  const spread = element('div', 'book-spread'), paper = picture('', 'book-paper');
  const pages = [element('div', 'book-page'), element('div', 'book-page')];
  const top = element('div', 'book-top'); top.append(tabs, close);
  spread.append(paper, ...pages); panel.append(top, spread); root.append(panel);
  let current: PageId = 'tabua', art: Sheets | null = null, loading: Promise<void> | null = null;
  close.addEventListener('click', () => hide());

  function render() {
    if (!art || panel.hidden) return;
    const book = bookPages(progress()), page = book.find(p => p.id === current) ?? book[0]!;
    current = page.id; panel.dataset.page = page.id;
    tabs.replaceChildren(...book.map(p => tab(p.id, art!, p.id === current, () => { current = p.id; render(); })));
    const half = Math.ceil(page.entries.length / 2);
    pages[0]!.replaceChildren(...page.entries.slice(0, half).map(e => card(e, art!)));
    pages[1]!.replaceChildren(...page.entries.slice(half).map(e => card(e, art!)));
  }
  function load() {
    loading ??= Promise.all([sheet('dishes'), sheet('book')]).then(([dishes, book]) => { art = { dishes, book }; paper.src = sheetPart(book, ['spread'], spreadBox); });
    return loading.then(render);
  }
  /** Over the scene only (never over the docked tray): centred on `#world`, as wide as it allows. */
  function place() {
    const world = root.querySelector('#world')?.getBoundingClientRect(), app = root.getBoundingClientRect();
    if (!world || panel.hidden) return;
    panel.style.left = `${world.left - app.left + world.width / 2}px`; panel.style.width = `${Math.min(760, world.width - 24)}px`;
  }
  window.addEventListener('resize', place);
  function hide() { panel.hidden = true; root.classList.remove('book-open'); root.querySelector('#book-toggle')?.setAttribute('aria-expanded', 'false'); }
  return {
    /** Opens on `page` (or where the child left it). */
    open(page?: PageId) {
      if (page) current = page;
      panel.hidden = false; place(); root.classList.add('book-open'); root.querySelector('#book-toggle')?.setAttribute('aria-expanded', 'true');
      return load();
    },
    close: hide, isOpen: () => !panel.hidden,
    /** Redraws after a change (a new recipe lights up its page). */
    refresh: render,
  };
}
function tab(id: PageId, art: Sheets, pressed: boolean, choose: () => void) {
  const button = element('button', 'book-tab', id === 'segredos' ? bookText.secrets : utensilNames[id]);
  button.dataset.page = id; button.setAttribute('aria-pressed', String(pressed));
  button.append(picture(id === 'segredos' ? sheetPart(art.book, ['secrets'], secretsBox) : `/icons/ut-${id}.svg`));
  button.addEventListener('click', choose);
  return button;
}
/** A known recipe: the coloured dish, its ingredients and utensil, and the ribbon once it came out fancy. Otherwise its silhouette
 *  with the utensil and the clue ingredient (all of them when a letter card revealed it). */
function card(entry: BookEntry, art: Sheets) {
  const figure = element('figure', 'book-entry', entry.known ? dishNames[entry.recipe] : bookText.unknown);
  figure.setAttribute('role', 'img');
  figure.dataset.recipe = entry.recipe; figure.dataset.known = String(entry.known);
  figure.append(picture(sheetPart(art.dishes, dishParts(entry.recipe, entry.fancy), dishBox, !entry.known), 'book-dish'));
  const recipe = element('div', 'book-recipe');
  recipe.append(...entry.ingredients.map(id => { const icon = picture(ingredientIcon(id)); icon.title = ingredientNames[id]; icon.dataset.ingredient = id; return icon; }));
  recipe.append(picture(`/icons/ut-${entry.utensil}.svg`, 'book-utensil'));
  figure.append(recipe);
  if (entry.fancy) { figure.dataset.fancy = 'true'; figure.append(picture(sheetPart(art.book, ['ribbon'], ribbonBox), 'book-ribbon')); }
  return figure;
}
