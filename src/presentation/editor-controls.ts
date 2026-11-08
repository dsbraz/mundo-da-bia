import { roomWidth } from '../domain/geometry';
import { catalogDrag } from './catalog-drag';
import type { Album, EditAction, PieceKind } from '../domain/types';
import type { History } from '../domain/design';
import { paletteIds, pieceKinds } from '../domain/types';
import { fixtures } from '../domain/layout';
import { activeHouse } from '../domain/houses';
import { furnishings, palettes } from '../content/furnishings';
import { pieceImage } from './piece-assets';

export interface EditorActions {
  toggle: () => void; edit: (action: EditAction) => void; undo: () => void; redo: () => void;
  select: (id: number | null) => void; house: (id: number) => void;
  duplicate: (empty: boolean) => void; rename: (name: string) => void;
}
function on(root: HTMLElement, id: string, action: () => void) { root.querySelector(id)!.addEventListener('click', action); }
export function createEditorControls(root: HTMLElement, actions: EditorActions) {
  let selected: number | null = null; let width = 1000;
  on(root, '#build-toggle', actions.toggle);
  on(root, '#undo', actions.undo); on(root, '#redo', actions.redo);
  on(root, '#flip-piece', () => { if (selected !== null) actions.edit({ type: 'flip', id: selected }); });
  on(root, '#remove-piece', () => { if (selected !== null) actions.edit({ type: 'remove', id: selected }); });
  bindClear(root, actions);
  on(root, '#copy-house', () => actions.duplicate(false)); on(root, '#new-house', () => actions.duplicate(true));
  on(root, '#rename-house', () => actions.rename(root.querySelector<HTMLInputElement>('#house-name')!.value));
  const houseList = root.querySelector<HTMLSelectElement>('#house-list')!;
  houseList.addEventListener('change', () => actions.house(Number(houseList.value)));
  const catalog = createCatalog(root, actions.edit, () => width);
  const colors = paletteIds.map(color => {
    const button = document.createElement('button'); button.type = 'button';
    button.title = palettes[color].name; button.setAttribute('aria-label', `Cor ${palettes[color].name}`);
    button.style.background = palettes[color].base; button.className = 'swatch';
    button.addEventListener('click', () => { if (selected !== null) actions.edit({ type: 'color', id: selected, color }); });
    root.querySelector('#piece-colors')!.append(button); return button;
  });
  bindFinishes(root, actions.edit);
  return (album: Album, h: History, building: boolean, id: number | null) => {
    selected = id; const state = h.present; width = roomWidth(state); const piece = state.layout.pieces.find(p => p.id === id);
    root.classList.toggle('building', building);
    root.querySelector('#play-mode')!.setAttribute('aria-pressed', String(!building));
    root.querySelector<HTMLElement>('#build-history')!.hidden = !building;
    root.querySelector<HTMLElement>('#actor-context')!.hidden = building;
    root.querySelector<HTMLElement>('#build-inspector')!.hidden = !building || !piece;
    root.querySelector('#build-toggle')!.setAttribute('aria-pressed', String(building));
    root.querySelector<HTMLButtonElement>('#undo')!.disabled = !h.past.length;
    root.querySelector<HTMLButtonElement>('#redo')!.disabled = !h.future.length;
    root.querySelector<HTMLButtonElement>('#flip-piece')!.disabled = !piece;
    root.querySelector<HTMLButtonElement>('#remove-piece')!.disabled = !piece;
    root.querySelector('#piece-name')!.textContent = piece ? furnishings[piece.kind].name : 'Escolha uma peça na casa';
    colors.forEach((button, index) => { button.disabled = !piece; button.setAttribute('aria-pressed', String(piece?.color === paletteIds[index])); });
    catalog.forEach((button, kind) => { button.disabled = fixtures.includes(kind) && state.layout.pieces.some(p => p.kind === kind && p.room === state.room); button.title = button.disabled ? 'Já existe neste cômodo. Você pode usar outro em um novo cômodo.' : '';  });
    updateHouseList(root, album);
    for (const surface of ['wall', 'floor'] as const) root.querySelector<HTMLSelectElement>(`#finish-${surface}`)!.value = state.layout.rooms[state.room]![surface];
  };
}
function createCatalog(root: HTMLElement, edit: (action: EditAction) => void, width: () => number) {
  const buttons = new Map<PieceKind, HTMLButtonElement>();
  pieceKinds.forEach(kind => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'catalog-piece';
    const img = document.createElement('img'); img.src = pieceImage(kind, 'original', true); img.alt = '';
    const label = document.createElement('span'); label.textContent = furnishings[kind].name;
    button.append(img, label); button.setAttribute('aria-label', `Adicionar ${furnishings[kind].name}`);
    button.dataset.category = furnishings[kind].category;
    catalogDrag(button, kind, edit, width);
    button.addEventListener('click', () => edit({ type: 'add', kind, point: { x: width() / 2, y: 360 } }));
    root.querySelector('#piece-catalog')!.append(button); buttons.set(kind, button);
  });
  let category = 'moveis';
  const collection = root.querySelector<HTMLSelectElement>('#collection-filter')!;
  const filter = () => {
    root.querySelectorAll<HTMLButtonElement>('[data-category-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.categoryFilter === category)));
    root.querySelector<HTMLElement>('#finishes')!.hidden = category !== 'finishes';
    root.querySelector<HTMLElement>('#piece-catalog')!.hidden = category === 'finishes';
    buttons.forEach((b, kind) => {
      const decor = ['rug', 'plant', 'picture', 'cushion', 'neon'].includes(kind);
      b.hidden = (category === 'decoracao' ? !decor : decor) || (collection.value === 'neon' && b.dataset.category !== 'neon');
    });
  };
  root.querySelectorAll<HTMLButtonElement>('[data-category-filter]').forEach(b => b.addEventListener('click', () => { category = b.dataset.categoryFilter!; filter(); }));
  collection.addEventListener('change', filter); filter();
  return buttons;
}
function bindFinishes(root: HTMLElement, edit: (action: EditAction) => void) {
  for (const surface of ['wall', 'floor'] as const) {
    const select = root.querySelector<HTMLSelectElement>(`#finish-${surface}`)!;
    paletteIds.forEach(id => select.add(new Option(palettes[id].name, id)));
    select.addEventListener('change', () => {
      const value = paletteIds.find(id => id === select.value)!; edit({ type: 'finish', surface, value });
    });
  }
}
function updateHouseList(root: HTMLElement, album: Album) {
  const select = root.querySelector<HTMLSelectElement>('#house-list')!;
  select.replaceChildren(...album.houses.map(h => new Option(h.name, String(h.id)))); select.value = String(album.active);
  const input = root.querySelector<HTMLInputElement>('#house-name')!;
  if (document.activeElement !== input) input.value = activeHouse(album).name;
}

function bindClear(root: HTMLElement, actions: EditorActions) {
  const dialog = root.querySelector<HTMLDialogElement>('#clear-dialog')!;
  on(root, '#clear-room', () => { root.querySelector<HTMLDialogElement>('#room-dialog')!.close(); dialog.showModal(); });
  on(root, '#cancel-clear', () => dialog.close());
  on(root, '#confirm-clear', () => { if (!root.classList.contains('building')) actions.toggle(); actions.edit({ type: 'clear' }); dialog.close(); });
}
