import type { ActorId, Point, World } from '../domain/types';
import { createGesture } from './gestures';

export function bindInput(canvas: HTMLCanvasElement, getState: () => World, select: (id: ActorId) => void, move: (point: Point) => void) {
  const gesture = createGesture(move);
  const point = (event: PointerEvent): Point => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * 1000 / bounds.width, y: (event.clientY - bounds.top) * 600 / bounds.height };
  };
  canvas.addEventListener('pointerdown', event => {
    if (!gesture.start(event.pointerId)) return;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    const state = getState();
    const hit = [...state.actors].reverse().find(a => a.room === state.room && Math.abs(a.x - p.x) < 45 && p.y <= a.y + 20 && p.y >= a.y - 140);
    if (hit) select(hit.id);
    else move(p);
  });
  canvas.addEventListener('pointermove', event => gesture.move(event.pointerId, point(event)));
  canvas.addEventListener('pointerup', event => gesture.end(event.pointerId));
  canvas.addEventListener('pointercancel', () => gesture.cancel());
  canvas.addEventListener('lostpointercapture', () => gesture.cancel());
  window.addEventListener('blur', () => gesture.cancel());
}
