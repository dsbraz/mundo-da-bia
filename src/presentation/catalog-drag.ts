import type { EditAction, PieceKind } from '../domain/types';
import { trayDrag } from './tray-drag';
export function catalogDrag(button: HTMLButtonElement, kind: PieceKind, edit: (action: EditAction) => void, width: () => number) {
  trayDrag(button, width, point => edit({ type: 'add', kind, point }), () => button.closest('#app')!.classList.contains('building'));
}
