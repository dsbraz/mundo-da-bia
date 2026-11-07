import { roomWidth } from '../domain/geometry';
import type { ActorId, Point, World } from '../domain/types';
import { createPlayGesture } from './play-gesture';
import type { PlayInput } from './play-gesture';

export interface BuildInput { enabled: () => boolean; gesture: ReturnType<typeof createPlayGesture> }
export function bindInput(canvas: HTMLCanvasElement, getState: () => World, select: (id: ActorId) => void, move: (point: Point) => void, play?: PlayInput, build?: BuildInput) {
  const gesture = createPlayGesture(getState, select, move, play);
  const current = () => build?.enabled() ? build.gesture : gesture;
  const cancel = () => { gesture.cancel(); build?.gesture.cancel(); };
  const point = (event: PointerEvent): Point => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * roomWidth(getState()) / bounds.width, y: (event.clientY - bounds.top) * 600 / bounds.height };
  };
  canvas.addEventListener('pointerdown', event => {
    if (current().start(event.pointerId, point(event))) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => current().update(event.pointerId, point(event)));
  canvas.addEventListener('pointerup', event => current().end(event.pointerId, point(event)));
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  window.addEventListener('blur', cancel);
  window.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
  return cancel;
}
