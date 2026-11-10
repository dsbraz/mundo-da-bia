import type { Building, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { floorCount } from '../domain/modules';
import { facadeSvg, svgUrl } from './architecture-art';

function button(label: string, click: () => void) {
  const result = document.createElement('button'); result.textContent = label; result.onclick = click; return result;
}
export function moveHouse(root: HTMLElement, town: Neighborhood, house: Building, dispatch: (action: NeighborhoodAction) => void) {
  const dialog = document.createElement('dialog'); dialog.id = 'move-house-dialog'; dialog.setAttribute('aria-label', 'Mudar casa de terreno');
  function choose() {
    const title = document.createElement('h2'); title.textContent = `Mudar ${house.name} de terreno`;
    const hint = document.createElement('p'); hint.textContent = 'Escolha um terreno vazio ou outra casa para trocar de lugar. Tudo dentro das casas acompanha a mudança.';
    const plots = document.createElement('div'); plots.className = 'house-plots';
    for (let plot = 0; plot < town.plots; plot++) {
      const occupant = town.buildings.find(b => b.plot === plot);
      const card = button(`Terreno ${plot + 1} · ${occupant?.name ?? 'vazio'}`, () => preview(plot, occupant));
      if (occupant) { const image = document.createElement('img'); image.src = svgUrl(facadeSvg(occupant.model, floorCount(occupant.layout))); image.alt = ''; card.prepend(image); }
      else { const garden = document.createElement('img'); garden.src = '/icons/ui-plot.svg'; garden.alt = ''; garden.className = 'empty-plot'; garden.setAttribute('aria-hidden', 'true'); card.prepend(garden); }
      card.disabled = plot === house.plot; card.setAttribute('aria-pressed', String(card.disabled)); plots.append(card);
    }
    dialog.replaceChildren(title, hint, plots, button('Voltar para organizar', () => dialog.close()));
  }
  function preview(plot: number, occupant?: Building) {
    const title = document.createElement('h2'); title.textContent = occupant ? `Trocar ${house.name} com ${occupant.name}?` : `Mover ${house.name} para o terreno ${plot + 1}?`;
    const explanation = document.createElement('p'); explanation.textContent = occupant
      ? `${house.name} vai para o terreno ${plot + 1}. ${occupant.name} vai para o terreno ${house.plot + 1}.`
      : `O terreno ${house.plot + 1} ficará livre. Os cômodos, móveis e personagens continuam na casa.`;
    const picture = document.createElement('img'); picture.src = svgUrl(facadeSvg(house.model, floorCount(house.layout))); picture.alt = house.name; picture.className = 'moving-house';
    const confirm = button('Confirmar mudança', () => { dispatch({ type: 'move-building', building: house.id, plot }); dialog.close(); });
    dialog.replaceChildren(title, picture, explanation, button('Cancelar mudança', () => { choose(); dialog.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus(); }), confirm); confirm.focus();
  }
  choose(); dialog.onclose = () => dialog.remove(); root.append(dialog); dialog.showModal();
}
