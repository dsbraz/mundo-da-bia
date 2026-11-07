import type { EditAction, PieceKind } from '../domain/types';
export function catalogDrag(button: HTMLButtonElement, kind: PieceKind, edit: (action: EditAction) => void, width: () => number) {
  let active: { id: number; x: number; y: number } | null = null;
  let ghost: HTMLImageElement | null = null; let dragged = false;
  const cancel = () => { active = null; ghost?.remove(); ghost = null; };
  button.addEventListener('pointerdown', event => {
    if (active || button.disabled) return;
    active = { id: event.pointerId, x: event.clientX, y: event.clientY }; dragged = false;
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (active?.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) < 8) return;
    dragged = true;
    if (!ghost) { ghost = button.querySelector('img')!.cloneNode() as HTMLImageElement; ghost.className = 'catalog-ghost'; document.body.append(ghost); }
    ghost.style.left = `${event.clientX}px`; ghost.style.top = `${event.clientY}px`;
  });
  button.addEventListener('pointerup', event => {
    if (active?.id !== event.pointerId) return;
    if (dragged) drop(event, kind, width(), edit);
    cancel();
  });
  button.addEventListener('click', event => { if (dragged && event.detail > 0) { event.stopImmediatePropagation(); event.preventDefault(); } }, true);
  button.addEventListener('pointercancel', cancel); button.addEventListener('lostpointercapture', cancel);
  window.addEventListener('blur', cancel);
}
function drop(event: PointerEvent, kind: PieceKind, width: number, edit: (action: EditAction) => void) {
  const bounds = document.querySelector('canvas')!.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
  const point = { x: (event.clientX - bounds.left) * width / bounds.width, y: (event.clientY - bounds.top) * 600 / bounds.height };
  edit({ type: 'add', kind, point });
}
