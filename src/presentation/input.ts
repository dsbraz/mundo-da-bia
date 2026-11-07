import type { ActorId, Point, World } from '../domain/types';
import { createPlayGesture } from './play-gesture';
import type { PlayInput } from './play-gesture';

export function bindInput(canvas: HTMLCanvasElement, getState: () => World, select: (id: ActorId) => void, move: (point: Point) => void, play?: PlayInput) {
  const gesture = createPlayGesture(getState, select, move, play);
  const point = (event: PointerEvent): Point => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * 1000 / bounds.width, y: (event.clientY - bounds.top) * 600 / bounds.height };
  };
  canvas.addEventListener('pointerdown', event => {
    if (gesture.start(event.pointerId, point(event))) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => gesture.update(event.pointerId, point(event)));
  canvas.addEventListener('pointerup', event => gesture.end(event.pointerId, point(event)));
  canvas.addEventListener('pointercancel', () => gesture.cancel());
  canvas.addEventListener('lostpointercapture', () => gesture.cancel());
  window.addEventListener('blur', () => gesture.cancel());
  window.addEventListener('keydown', event => { if (event.key === 'Escape') gesture.cancel(); });
  return gesture.cancel;
}
