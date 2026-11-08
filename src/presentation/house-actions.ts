import { moveHouse } from './move-house';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';

export function houseActions(root: HTMLElement, get: () => Neighborhood, dispatch: (action: NeighborhoodAction) => void) {
  const remove = root.querySelector<HTMLButtonElement>('#delete-house')!;
  const current = () => {
    const town = get(), where = town.location;
    return town.buildings.find(b => where.kind === 'interior' && b.id === where.building) ?? town.buildings[0]!;
  };
  root.querySelector<HTMLButtonElement>('#move-house')!.onclick = () => moveHouse(root, get(), current(), dispatch);
  remove.onclick = () => {
    const house = current(), dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', `Excluir ${house.name}`);
    const title = document.createElement('h2'); title.textContent = `Excluir ${house.name}?`;
    const detail = document.createElement('p'); detail.textContent = 'Os cômodos e móveis desta casa serão retirados. A turma e os objetos portáteis vão para a rua.';
    const cancel = document.createElement('button'); cancel.textContent = 'Manter casa'; cancel.onclick = () => dialog.close();
    const confirm = document.createElement('button'); confirm.textContent = 'Excluir esta casa';
    confirm.onclick = () => { dispatch({ type: 'remove-building', building: house.id }); dialog.close(); };
    dialog.append(title, detail, cancel, confirm); dialog.onclose = () => dialog.remove(); root.append(dialog); dialog.showModal(); cancel.focus();
  };
  return () => {
    remove.disabled = get().buildings.length === 1;
    root.querySelector('#delete-house-hint')!.textContent = remove.disabled ? 'Mantenha ao menos uma casa no bairro. Você pode esvaziar seus cômodos para recomeçar.' : `Excluir “${current().name}” libera seu terreno.`;
    root.querySelector('#home-name')!.textContent = current().name;
  };
}
