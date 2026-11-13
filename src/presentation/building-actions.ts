import type { Building, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { buildingFacadeSvg, svgUrl } from './architecture-art';
import { moveHouse } from './move-house';
import { removeHouse } from './remove-house';
import { paletteIds } from '../domain/types';
import { palettes } from '../content/furnishings';
function button(label: string, click: () => void) {
  const result = document.createElement('button'); result.textContent = label; result.onclick = click; return result;
}
export function buildingActions(dialog: HTMLDialogElement, root: HTMLElement, town: Neighborhood, house: Building, dispatch: (a: NeighborhoodAction) => void, closeMap: () => void, extend: (id: number) => void, undo: () => void) {
  const title = document.createElement('h2'); title.textContent = house.name;
  const image = document.createElement('img'); image.src = svgUrl(buildingFacadeSvg(house)); image.alt = ''; image.className = 'building-portrait';
  const actions = document.createElement('div'); actions.className = 'building-actions';
  actions.append(
    button(`Entrar em ${house.name}`, () => { dialog.close(); closeMap(); dispatch({ type: 'visit', location: { kind: 'interior', building: house.id, room: house.entry } }); }),
    button(`Ampliar ${house.name}`, () => { dialog.close(); closeMap(); extend(house.id); }),
    button(`Mover ${house.name}`, () => { dialog.close(); moveHouse(root, town, house, dispatch); }),
    button(`Excluir ${house.name}…`, () => { dialog.close(); removeHouse(root, town, house, dispatch, undo); }),
  );
  const settings = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Nome e cores'; settings.append(summary);
  const input = document.createElement('input'); input.value = house.name; input.maxLength = 48; input.setAttribute('aria-label', 'Nome da construção');
  settings.append(input, button('Salvar nome', () => { dispatch({ type: 'facade', building: house.id, name: input.value }); dialog.close(); }));
  paletteIds.forEach(color => { const choice = button(`Cor ${palettes[color].name}`, () => { dispatch({ type: 'facade', building: house.id, color }); dialog.close(); }); choice.style.background = palettes[color].base; settings.append(choice); });
  dialog.append(title, image, actions, settings, button('Voltar', () => dialog.close()));
}
