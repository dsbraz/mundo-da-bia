import { fixture } from '../domain/layout';
import type { Action, World } from '../domain/types';

export function homeControls(root: HTMLElement, dispatch: (action: Action) => void) {
  const targets = ['fridge', 'drawer', 'lamp'] as const;
  const buttons = targets.map(target => {
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => dispatch({ type: 'interact', target }));
    root.querySelector('#furniture')!.append(button);
    return button;
  });
  root.querySelectorAll<HTMLDetailsElement>('details.tray').forEach(tray => tray.addEventListener('toggle', () => {
    if (tray.open) root.querySelectorAll<HTMLDetailsElement>('details.tray').forEach(other => { if (other !== tray) other.open = false; });
  }));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') root.querySelectorAll<HTMLDetailsElement>('details.tray').forEach(tray => { tray.open = false; });
  });
  return (state: World) => {
    const labels = [state.home.fridge ? 'Fechar geladeira' : 'Abrir geladeira', state.home.drawer ? 'Fechar gaveta' : 'Abrir gaveta', state.home.lamp ? 'Apagar luz' : 'Acender luz'];
    buttons.forEach((button, index) => {
      button.textContent = labels[index]!; button.disabled = fixture(state, targets[index] === 'drawer' ? 'wardrobe' : targets[index]!)?.room !== state.room;
      button.setAttribute('aria-pressed', String(state.home[targets[index]!]));
    });
  };
}
