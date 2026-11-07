import type { Piece } from '../domain/types';
export function positionInspector(root: HTMLElement, piece: Piece | undefined, width: number) {
  if (!piece) return;
  const box = root.querySelector('canvas')?.getBoundingClientRect(); if (!box) return;
  const panel = root.querySelector<HTMLElement>('#build-inspector')!;
  panel.style.left = `${Math.max(12, Math.min(root.clientWidth - 308, box.left + piece.x / width * box.width - 120))}px`;
  panel.style.top = `${Math.max(82, Math.min(root.clientHeight - 250, box.top + piece.y / 600 * box.height - 160))}px`;
  panel.style.bottom = 'auto';
}
