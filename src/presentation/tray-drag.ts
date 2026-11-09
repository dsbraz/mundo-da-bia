import { screenToWorld } from './viewport';
import type { Point } from '../domain/types';
let owner: HTMLButtonElement | null = null;
let cancelActive = () => {};
export function cancelTrayDrag() { cancelActive(); }
export function trayDrag(button: HTMLButtonElement, _width: () => number, drop: (point: Point) => void, enabled: () => boolean) {
  let pointer: number | null = null; let start = { x: 0, y: 0 }; let dragged = false; let ghost: HTMLImageElement | null = null;
  const cancel = () => { if (pointer !== null) dragged = true; pointer = null; button.closest('#app')?.classList.remove('gesturing'); ghost?.remove(); ghost = null; if (owner === button) { owner = null; cancelActive = () => {}; } };
  button.addEventListener('pointerdown', e => {
    if (owner || button.disabled || !enabled()) { dragged = true; return; }
    owner = button; cancelActive = cancel;
    pointer = e.pointerId; start = { x: e.clientX, y: e.clientY }; dragged = false; button.setPointerCapture(pointer);
  });
  button.addEventListener('pointermove', e => {
    if (pointer !== e.pointerId || Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
    dragged = true;
    if (!ghost) { ghost = button.querySelector('img')!.cloneNode() as HTMLImageElement; ghost.className = 'catalog-ghost'; document.body.append(ghost); }
    button.closest('#app')?.classList.add('gesturing');
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
  });
  button.addEventListener('pointerup', e => {
    if (pointer !== e.pointerId) return;
    const canvas = document.querySelector('canvas')!; const bounds = canvas.getBoundingClientRect();
    if (dragged && enabled() && e.clientX >= bounds.left && e.clientX <= bounds.right && e.clientY >= bounds.top && e.clientY <= bounds.bottom) {
      drop(screenToWorld(canvas, { x: e.clientX, y: e.clientY }));
    }
    pointer = null; cancel();
  });
  button.addEventListener('click', e => { if (dragged && e.detail > 0) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  button.addEventListener('pointercancel', cancel); button.addEventListener('lostpointercapture', cancel);
  window.addEventListener('blur', cancel); window.addEventListener('keydown', e => { if (e.key === 'Escape') { dragged = true; cancel(); } });
}
