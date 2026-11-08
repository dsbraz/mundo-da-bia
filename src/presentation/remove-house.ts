import type { Building, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
export function removeHouse(root: HTMLElement, town: Neighborhood, house: Building, dispatch: (a: NeighborhoodAction) => void) {
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', `Excluir ${house.name}`);
  const title = document.createElement('h2'); title.textContent = `Excluir ${house.name}?`;
  const detail = document.createElement('p'); detail.textContent = town.buildings.length === 1
    ? 'Mantenha ao menos uma casa no bairro. Você pode esvaziar seus cômodos para recomeçar.'
    : 'Os cômodos e móveis desta casa serão retirados. A turma e os objetos portáteis vão para a rua.';
  const cancel = document.createElement('button'); cancel.textContent = 'Manter casa'; cancel.onclick = () => dialog.close();
  const confirm = document.createElement('button'); confirm.textContent = 'Excluir esta casa'; confirm.disabled = town.buildings.length === 1;
  confirm.onclick = () => { dispatch({ type: 'remove-building', building: house.id }); dialog.close(); };
  dialog.append(title, detail, cancel, confirm); dialog.onclose = () => dialog.remove(); root.append(dialog); dialog.showModal(); cancel.focus();
}
