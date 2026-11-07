import { houseInput } from './house-input';
import type { HouseInput } from './house-input';
import { roomWidth } from '../domain/geometry';
import type { ActorId, Point, World } from '../domain/types';
import { createPlayGesture } from './play-gesture';
import type { PlayInput } from './play-gesture';

export interface BuildInput { enabled: () => boolean; gesture: ReturnType<typeof createPlayGesture> }
export function bindInput(canvas: HTMLCanvasElement, getState: () => World, select: (id: ActorId) => void, move: (point: Point) => void, play?: PlayInput, build?: BuildInput, house?: HouseInput) {
  const gesture = createPlayGesture(getState, select, move, play);
  const current = () => build?.enabled() ? build.gesture : gesture;
  const router = house ? houseInput(canvas, getState, current, house) : null;
  const cancel = () => { canvas.parentElement?.closest('#app')?.classList.remove('gesturing'); router?.cancel(); gesture.cancel(); build?.gesture.cancel(); };
  const pixels = (e: PointerEvent) => ({ x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY });
  const point = (event: PointerEvent): Point => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * roomWidth(getState()) / bounds.width, y: (event.clientY - bounds.top) * 600 / bounds.height };
  };
  canvas.addEventListener('pointerdown', event => {
    if (router ? router.start(event.pointerId, point(event), pixels(event)) : current().start(event.pointerId, point(event))) { canvas.setPointerCapture(event.pointerId); canvas.parentElement?.closest('#app')?.classList.add('gesturing'); }
  });
  canvas.addEventListener('pointermove', event => router ? router.update(event.pointerId, point(event), pixels(event)) : current().update(event.pointerId, point(event)));
  canvas.addEventListener('pointerup', event => {
    if (router) router.end(event.pointerId, point(event), pixels(event)); else current().end(event.pointerId, point(event));
    canvas.parentElement?.closest('#app')?.classList.remove('gesturing');
  });
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  window.addEventListener('blur', cancel);
  window.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
  return cancel;
}
