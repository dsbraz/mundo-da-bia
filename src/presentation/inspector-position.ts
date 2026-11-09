import { worldToScreen } from './viewport';
import type { Piece } from '../domain/types';
export function positionInspector(root: HTMLElement, piece: Piece | undefined) {
  if (!piece) return;
  const canvas = root.querySelector('canvas'); if (!canvas) return;
  const point = worldToScreen(canvas, piece);
  const panel = root.querySelector<HTMLElement>('#build-inspector')!;
  panel.style.left = `${Math.max(12, Math.min(root.clientWidth - 308, point.x - 120))}px`;
  panel.style.top = `${Math.max(82, Math.min(root.clientHeight - 250, point.y - 160))}px`;
  panel.style.bottom = 'auto';
}
