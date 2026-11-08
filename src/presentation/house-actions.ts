import { removeHouse } from './remove-house';
import { moveHouse } from './move-house';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';

export function houseActions(root: HTMLElement, get: () => Neighborhood, dispatch: (action: NeighborhoodAction) => void) {
  const remove = root.querySelector<HTMLButtonElement>('#delete-house')!;
  const current = () => {
    const town = get(), where = town.location;
    return town.buildings.find(b => where.kind === 'interior' && b.id === where.building) ?? town.buildings[0]!;
  };
  root.querySelector<HTMLButtonElement>('#move-house')!.onclick = () => moveHouse(root, get(), current(), dispatch);
  remove.onclick = () => removeHouse(root, get(), current(), dispatch);
  return () => {
    remove.disabled = get().buildings.length === 1;
    root.querySelector('#delete-house-hint')!.textContent = remove.disabled ? 'Mantenha ao menos uma casa no bairro. Você pode esvaziar seus cômodos para recomeçar.' : `Excluir “${current().name}” libera seu terreno.`;
    root.querySelector('#home-name')!.textContent = current().name;
  };
}
