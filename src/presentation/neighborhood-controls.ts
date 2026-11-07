import { items } from '../content/catalog';
import { itemKind } from '../domain/item-kind';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { buildingModels } from '../domain/neighborhood-types';
import type { ActorId, ItemId } from '../domain/types';
import { paletteIds } from '../domain/types';
import { palettes } from '../content/furnishings';
import { doors, destinationPoint } from './neighborhood-doors';
function button(text: string, action: () => void) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = action; return b;
}
export function neighborhoodControls(root: HTMLElement, get: () => Neighborhood, dispatch: (a: NeighborhoodAction) => void, selected: () => ActorId, close: () => void) {
  const list = document.createElement('section'); list.id = 'neighborhood-list';
  const title = document.createElement('h3'); title.textContent = 'Nosso bairro';
  root.querySelector('#room-map')!.before(title, list);
  const street = button('♧ Visitar a rua', () => { dispatch({ type: 'visit', location: { kind: 'street' } }); close(); });
  title.after(street);
  const carry = button('♧ Levar pela porta', () => carryDialog(root, get(), { actor: selected() }, dispatch));
  root.querySelector('#actor-context')!.append(carry);
  const accessible = document.createElement('div'); accessible.className = 'scene-controls'; root.append(accessible);
  const plotDialog = document.createElement('dialog'); plotDialog.id = 'plot-dialog'; root.append(plotDialog);
  function plot(index: number) {
    const town = get(); const existing = town.buildings.find(b => b.plot === index);
    if (index < 0 || index >= town.plots) return;
    plotDialog.replaceChildren();
    if (existing) facadeEditor(plotDialog, existing, dispatch);
    else buildingModels.forEach(model => plotDialog.append(button({ house: '⌂ Casa · sala e quarto', apartment: '▤ Prédio · entrada e dois ambientes', shop: '▧ Loja · salão e fundos' }[model], () => { dispatch({ type: 'construct', plot: index, model }); plotDialog.close(); })));
    plotDialog.append(button('Voltar', () => plotDialog.close())); plotDialog.showModal();
  }
  function refresh(building: boolean, camera: number) {
    const town = get(); const where = town.location;
    root.classList.toggle('street', where.kind === 'street');
    list.replaceChildren(...town.buildings.map(b => {
      const card = document.createElement('article'); card.className = 'room-card';
      card.append(button(`⌂ ${b.name}`, () => { dispatch({ type: 'visit', location: { kind: 'interior', building: b.id, room: b.entry } }); close(); }));
      if (building && where.kind === 'street') card.append(button('✎ Fachada', () => plot(b.plot)));
      return card;
    }));
    root.querySelector('#street-plots')!.replaceChildren(...Array.from({ length: town.plots }, (_, i) => button(town.buildings.find(b => b.plot === i)?.name ?? `✦ Terreno ${i + 1}`, () => plot(i))));
    const options = doors(town); carry.hidden = !options.length || building;
    accessible.replaceChildren(...options.map(d => {
      const b = button(`Visitar ${d.name}`, () => dispatch({ type: 'visit', location: d.location })); b.className = 'scene-target';
      const rect = root.querySelector('canvas')?.getBoundingClientRect();
      if (rect) { b.style.left = `${rect.left + (d.point.x - camera) / (where.kind === 'street' ? 1000 : roomWidth(town)) * rect.width}px`; b.style.top = `${rect.top + d.point.y / 600 * rect.height}px`; }
      return b;
    }));
    if (where.kind === 'street' && building) for (let i = 0; i < town.plots; i++) list.append(button(`✦ Terreno ${i + 1}`, () => plot(i)));
  }
  return { refresh, plot, carryItem: (item: ItemId) => carryDialog(root, get(), { item }, dispatch) };
}
function roomWidth(town: Neighborhood) {
  const where = town.location;
  if (where.kind === 'street') return 1000;
  return { small: 1000, medium: 1200, large: 1400 }[town.buildings.find(b => b.id === where.building)!.layout.rooms[where.room]!.size];
}
function facadeEditor(dialog: HTMLDialogElement, b: Neighborhood['buildings'][number], dispatch: (a: NeighborhoodAction) => void) {
  const input = document.createElement('input'); input.value = b.name; input.maxLength = 48; input.setAttribute('aria-label', 'Nome da construção');
  dialog.append(input, button('Salvar nome', () => { dispatch({ type: 'facade', building: b.id, name: input.value }); dialog.close(); }));
  paletteIds.forEach(color => { const choice = button(`Cor ${palettes[color].name}`, () => { dispatch({ type: 'facade', building: b.id, color }); dialog.close(); }); choice.style.background = palettes[color].base; dialog.append(choice); });
}
function carryDialog(root: HTMLElement, town: Neighborhood, entity: { actor: ActorId } | { item: ItemId }, dispatch: (a: NeighborhoodAction) => void) {
  const dialog = document.createElement('dialog');
  if ('item' in entity) { const title = document.createElement('h2'); title.textContent = items[itemKind(town.items.find(i => i.id === entity.item)!)].name; dialog.append(title); }
  doors(town).forEach(d => dialog.append(button(`Levar para ${d.name}`, () => { dispatch({ type: 'transport', ...entity, location: d.location, point: destinationPoint(town, d.location) }); dialog.close(); })));
  dialog.append(button('Voltar', () => dialog.close())); dialog.onclose = () => dialog.remove(); root.append(dialog); dialog.showModal();
}
