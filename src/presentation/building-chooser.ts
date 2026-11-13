import { buildingChoices, marketChoice } from '../content/buildings';
import { buildingModels } from '../domain/neighborhood-types';
import type { BuildingModel } from '../domain/neighborhood-types';
import { facadeSvg, svgUrl } from './architecture-art';
function button(label: string, run: () => void) { const b = document.createElement('button'); b.textContent = label; b.onclick = run; return b; }
function picture(model: BuildingModel, market = false) { const img = document.createElement('img'); img.src = svgUrl(facadeSvg(model, undefined, market)); img.alt = ''; img.width = 154; img.height = 168; return img; }
/** The cards in order: every model, and the shop's Mercado plan right after the shop (W3L-21). */
const choices = buildingModels.flatMap((model): { model: BuildingModel; market: boolean }[] => model === 'shop' ? [{ model, market: false }, { model, market: true }] : [{ model, market: false }]);
export function buildingChooser(dialog: HTMLDialogElement, build: (model: BuildingModel, plan?: 'market') => void) {
  function preview(model: BuildingModel, market: boolean) {
    const heading = document.createElement('h2'); heading.textContent = `Prévia · ${market ? marketChoice.preview : buildingChoices[model].preview}`;
    const confirm = button('Construir aqui', () => { dialog.close(); if (market) build(model, 'market'); else build(model); });
    dialog.replaceChildren(heading, picture(model, market), button('Voltar aos modelos', render), button('Cancelar', () => dialog.close()), confirm); confirm.focus();
  }
  function render() {
    const heading = document.createElement('h2'); heading.textContent = 'Um novo lugar';
    const filters = document.createElement('nav'); filters.className = 'building-filters'; filters.setAttribute('aria-label', 'Tipos de construção');
    const grid = document.createElement('div'); grid.className = 'building-models';
    for (const { model, market } of choices) {
      const info = market ? marketChoice : buildingChoices[model], card = button('', () => preview(model, market)); card.className = 'building-choice'; card.dataset.group = info.group;
      if (market) card.dataset.plan = 'market';
      card.setAttribute('aria-label', `${info.name} · ${info.description}`);
      const name = document.createElement('strong'); name.textContent = info.name;
      const description = document.createElement('small'); description.textContent = info.description;
      card.append(picture(model, market), name, description); grid.append(card);
    }
    for (const [group, name] of [['all', 'Todos'], ['homes', 'Moradia'], ['services', 'Serviços'], ['sports', 'Esportes']]) {
      const filter = button(name!, () => {
        filters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === filter)));
        grid.querySelectorAll<HTMLElement>('[data-group]').forEach(card => { card.hidden = group !== 'all' && card.dataset.group !== group; });
      }); filter.setAttribute('aria-pressed', String(group === 'all')); filters.append(filter);
    }
    dialog.replaceChildren(heading, filters, grid, button('Voltar', () => dialog.close()));
  }
  render();
}
