import { screenToWorld } from './viewport';
import type { Point } from '../domain/types';
let owner: HTMLButtonElement | null = null;
let cancelActive = () => {};
export function cancelTrayDrag() { cancelActive(); }
/** The nearest ancestor that can scroll vertically: a finger sliding up or down over its buttons scrolls it. */
function scrollerOf(button: HTMLElement): HTMLElement | null {
  for (let node = button.parentElement; node; node = node.parentElement) if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) return node;
  return null;
}
const inside = (element: HTMLElement, x: number, y: number) => { const r = element.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
type Gesture = 'none' | 'scroll' | 'drag';
/** A first move that is mostly vertical over a scrollable tray scrolls it; leaving the tray, or a sideways move, carries the piece. */
function decide(scroller: HTMLElement | null, dx: number, dy: number): Gesture {
  return scroller && Math.abs(dy) > Math.abs(dx) ? 'scroll' : 'drag';
}
export function trayDrag(button: HTMLButtonElement, _width: () => number, drop: (point: Point) => void, enabled: () => boolean) {
  let pointer: number | null = null; let start = { x: 0, y: 0 }; let dragged = false; let ghost: HTMLImageElement | null = null;
  let gesture: Gesture = 'none'; let scroller: HTMLElement | null = null; let scrollStart = 0;
  const cancel = () => { if (pointer !== null) dragged = true; pointer = null; gesture = 'none'; button.closest('#app')?.classList.remove('gesturing'); ghost?.remove(); ghost = null; if (owner === button) { owner = null; cancelActive = () => {}; } };
  const carry = (e: PointerEvent) => {
    if (!ghost) { ghost = button.querySelector('img')!.cloneNode() as HTMLImageElement; ghost.className = 'catalog-ghost'; document.body.append(ghost); }
    button.closest('#app')?.classList.add('gesturing');
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
  };
  button.addEventListener('pointerdown', e => {
    if (owner || button.disabled || !enabled()) { dragged = true; return; }
    owner = button; cancelActive = cancel; scroller = scrollerOf(button); scrollStart = scroller?.scrollTop ?? 0;
    pointer = e.pointerId; start = { x: e.clientX, y: e.clientY }; dragged = false; gesture = 'none'; button.setPointerCapture(pointer);
  });
  button.addEventListener('pointermove', e => {
    if (pointer !== e.pointerId) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (gesture === 'none') { if (Math.hypot(dx, dy) < 8) return; gesture = decide(scroller, dx, dy); }
    dragged = true;
    if (gesture === 'scroll' && scroller && !inside(scroller, e.clientX, e.clientY)) gesture = 'drag';
    if (gesture === 'scroll') scroller!.scrollTop = scrollStart - dy; else carry(e);
  });
  button.addEventListener('pointerup', e => {
    if (pointer !== e.pointerId) return;
    const canvas = document.querySelector('canvas')!; const bounds = canvas.getBoundingClientRect();
    if (gesture === 'drag' && enabled() && e.clientX >= bounds.left && e.clientX <= bounds.right && e.clientY >= bounds.top && e.clientY <= bounds.bottom) {
      drop(screenToWorld(canvas, { x: e.clientX, y: e.clientY }));
    }
    pointer = null; cancel();
  });
  button.addEventListener('click', e => { if (dragged && e.detail > 0) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  button.addEventListener('pointercancel', cancel); button.addEventListener('lostpointercapture', cancel);
  window.addEventListener('blur', cancel); window.addEventListener('keydown', e => { if (e.key === 'Escape') { dragged = true; cancel(); } });
}
