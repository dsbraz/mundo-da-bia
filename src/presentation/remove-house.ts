import type { Building, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { grownUpGate, undoToast } from './grown-up-gate';
export function removeHouse(root: HTMLElement, town: Neighborhood, house: Building, dispatch: (a: NeighborhoodAction) => void, undo: () => void) {
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', `Excluir ${house.name}`); dialog.className = 'remove-house';
  const title = document.createElement('h2'); title.textContent = `Excluir ${house.name}?`;
  const detail = document.createElement('p'); detail.textContent = town.buildings.length === 1
    ? 'Mantenha ao menos uma casa no bairro. Você pode esvaziar seus cômodos para recomeçar.'
    : 'Para um adulto: segure o botão até o círculo fechar. A turma e os objetos vão para a rua.';
  const cancel = document.createElement('button'); cancel.textContent = 'Manter casa'; cancel.className = 'keep-house'; cancel.onclick = () => dialog.close();
  const confirm = document.createElement('button'); confirm.textContent = 'Segure para excluir'; confirm.disabled = town.buildings.length === 1;
  grownUpGate(confirm, () => { dispatch({ type: 'remove-building', building: house.id }); dialog.close(); undoToast(root, `${house.name} saiu do bairro.`, undo); });
  dialog.append(title, detail, cancel, confirm); dialog.onclose = () => dialog.remove(); root.append(dialog); dialog.showModal(); cancel.focus();
}
