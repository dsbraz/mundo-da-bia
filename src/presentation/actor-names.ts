import { actors } from '../content/catalog';
import type { Action, ActorId, World } from '../domain/types';
export function actorNames(root: HTMLElement, dispatch: (action: Action) => void, state: () => World) {
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2'); title.textContent = 'Nome do personagem';
  const input = document.createElement('input'); input.setAttribute('aria-label', 'Nome do personagem');
  const save = document.createElement('button'); save.textContent = 'Salvar nome';
  const reset = document.createElement('button'); reset.textContent = 'Restaurar nome original';
  const close = document.createElement('button'); close.textContent = 'Voltar';
  let selected: ActorId = 'bia';
  save.onclick = () => { dispatch({ type: 'name', actor: selected, name: input.value }); dialog.close(); };
  reset.onclick = () => { dispatch({ type: 'name', actor: selected, name: '' }); dialog.close(); };
  close.onclick = () => dialog.close();
  input.addEventListener('keydown', e => { if (e.key === 'Enter') save.click(); });
  dialog.append(title, input, save, reset, close); root.append(dialog);
  return (id: ActorId) => {
    selected = id; input.value = state().actors.find(a => a.id === id)?.name ?? actors[id].name;
    dialog.showModal(); input.focus(); input.select();
  };
}
