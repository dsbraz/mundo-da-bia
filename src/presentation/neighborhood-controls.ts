import { houseHandles } from './house-handles';
import { buildingChooser } from './building-chooser';
import { floorCount } from '../domain/modules';
import { buildingActions } from './building-actions';
import { houseActions } from './house-actions';
import { facadeSvg, svgUrl } from './architecture-art';
import { actors, items } from '../content/catalog';
import { itemKind } from '../domain/item-kind';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import type { ActorId, ItemId } from '../domain/types';
import { doors, destinationPoint } from './neighborhood-doors';
function button(text: string, action: () => void) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = action; return b;
}
export function neighborhoodControls(root: HTMLElement, get: () => Neighborhood, dispatch: (a: NeighborhoodAction) => void, selected: () => ActorId, close: () => void, pan: (dx: number) => void, extend: (id: number) => void) {
  const deletion = houseActions(root, get, dispatch);
  const list = document.createElement('section'); list.id = 'neighborhood-list';
  const title = document.createElement('h3'); title.textContent = 'Nosso bairro';
  root.querySelector('[data-home-panel="map organize"]')!.append(title, list);
  const carry = button('♧ Levar pela porta', () => carryDialog(root, get(), { actor: selected() }, dispatch));
  root.querySelector('#actor-context')!.append(carry);
  const accessible = document.createElement('div'); accessible.className = 'scene-controls'; root.append(accessible);
  const plotDialog = document.createElement('dialog'); plotDialog.id = 'plot-dialog'; root.append(plotDialog);
  const handles = houseHandles(root, get, dispatch, plot, pan);
  const currentActions = button('Ampliar · Mover · Excluir', () => { const town = get(), where = town.location; if (where.kind === 'interior') plot(town.buildings.find(b => b.id === where.building)!.plot); });
  currentActions.id = 'current-building-actions'; root.querySelector('#home-name')!.after(currentActions);
  function plot(index: number) {
    const town = get(); const existing = town.buildings.find(b => b.plot === index);
    if (index < 0 || index >= town.plots) return;
    plotDialog.replaceChildren();
    if (existing) buildingActions(plotDialog, root, town, existing, dispatch, close, extend);
    else buildingChooser(plotDialog, model => dispatch({ type: 'construct', plot: index, model }));
    plotDialog.showModal();
  }
  function refresh(building: boolean, camera: number) {
    const town = get(); const where = town.location; deletion(); handles(building);
    currentActions.hidden = where.kind === 'street';
    if (where.kind === 'interior') currentActions.setAttribute('aria-label', `Ampliar, mover ou excluir ${town.buildings.find(b => b.id === where.building)!.name}`);
    root.classList.toggle('street', where.kind === 'street');
    list.replaceChildren(...town.buildings.map(b => {
      const card = document.createElement('article'); card.className = 'room-card';
      const visit = button(`⌂ ${b.name}`, () => { dispatch({ type: 'visit', location: { kind: 'interior', building: b.id, room: b.entry } }); close(); });
      const image = document.createElement('img'); image.src = svgUrl(facadeSvg(b.model, floorCount(b.layout))); image.alt = ''; visit.prepend(image); card.append(visit);
      const manage = button('Ampliar · Mover · Excluir', () => plot(b.plot)); manage.setAttribute('aria-label', `Ações de ${b.name}: ampliar, mover e excluir`); manage.className = 'building-manage'; card.append(manage);
      if (building && where.kind === 'street') card.append(button('✎ Fachada', () => plot(b.plot)));
      return card;
    }));
    root.querySelector('#street-plots')!.replaceChildren(...Array.from({ length: town.plots }, (_, i) => button(town.buildings.find(b => b.plot === i)?.name ?? `✦ Terreno ${i + 1}`, () => plot(i))));
    const options = doors(town); carry.hidden = !options.length || building;
    accessible.replaceChildren(...options.map(d => {
      const b = button(`Visitar ${d.name}`, () => dispatch({ type: 'visit', location: d.location })); b.className = 'scene-target'; b.dataset.worldX = String(d.point.x); b.dataset.worldY = String(d.point.y);
      const rect = root.querySelector('canvas')?.getBoundingClientRect();
      if (rect) { b.style.left = `${rect.left + (d.point.x - camera) / (where.kind === 'street' ? 1000 : roomWidth(town)) * rect.width}px`; b.style.top = `${rect.top + d.point.y / 600 * rect.height}px`; }
      return b;
    }));
    if (where.kind === 'street' && building) for (let i = 0; i < town.plots; i++) list.append(button(`✦ Terreno ${i + 1}`, () => plot(i)));
  }
  function choosePlot() {
    const town = get();
    const free = Array.from({ length: town.plots }, (_, i) => i).find(i => !town.buildings.some(b => b.plot === i));
    if (free !== undefined) { plot(free); return; }
    plotDialog.replaceChildren(button('Todos os terrenos estão ocupados. Voltar', () => plotDialog.close())); plotDialog.showModal();
  }
  return { refresh, plot, choosePlot, carryItem: (item: ItemId) => carryDialog(root, get(), { item }, dispatch) };
}
function roomWidth(town: Neighborhood) {
  const where = town.location;
  if (where.kind === 'street') return 1000;
  return { small: 1000, medium: 1200, large: 1400 }[town.buildings.find(b => b.id === where.building)!.layout.rooms[where.room]!.size];
}
function carryDialog(root: HTMLElement, town: Neighborhood, entity: { actor: ActorId } | { item: ItemId }, dispatch: (a: NeighborhoodAction) => void) {
  const dialog = document.createElement('dialog');
  if ('actor' in entity) { const title = document.createElement('h2'); title.textContent = `Levar ${town.actors.find(a => a.id === entity.actor)?.name ?? actors[entity.actor].name} e seu objeto`; dialog.append(title); }
  if ('item' in entity) { const title = document.createElement('h2'); title.textContent = items[itemKind(town.items.find(i => i.id === entity.item)!)].name; dialog.append(title); }
  doors(town).forEach(d => dialog.append(button(`Levar para ${d.name}`, () => { dispatch({ type: 'transport', ...entity, location: d.location, point: destinationPoint(town, d.location) }); dialog.close(); })));
  dialog.append(button('Voltar', () => dialog.close())); dialog.onclose = () => dialog.remove(); root.append(dialog); dialog.showModal();
}
