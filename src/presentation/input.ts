import { wheelNavigation } from './wheel-navigation';
import { neighbor } from '../domain/doors';
import { houseInput } from './house-input';
import type { HouseInput } from './house-input';
import { roomWidth } from '../domain/geometry';
import type { ActorId, Point, World } from '../domain/types';
import { createPlayGesture } from './play-gesture';
import type { PlayInput } from './play-gesture';

export interface BuildInput { enabled: () => boolean; gesture: ReturnType<typeof createPlayGesture> }
export function bindInput(canvas: HTMLCanvasElement, getState: () => World, select: (id: ActorId) => void, move: (point: Point) => void, play?: PlayInput, build?: BuildInput, house?: HouseInput, wrap: (gesture: ReturnType<typeof createPlayGesture>) => ReturnType<typeof createPlayGesture> = g => g) {
  const gesture = createPlayGesture(getState, select, move, play);
  const wrappedPlay = wrap(gesture), wrappedBuild = build ? wrap(build.gesture) : wrappedPlay;
  const current = () => build?.enabled() ? wrappedBuild : wrappedPlay;
  const router = house ? houseInput(canvas, getState, current, house) : null;
  const wheel = house ? wheelNavigation({ width: () => canvas.getBoundingClientRect().width,
    neighbor: direction => neighbor(getState(), direction), preview: house.pan, visit: room => house.dispatch({ type: 'room', room }),
    street: () => !!getState().streetWidth, camera: () => house.camera?.() ?? 0, setCamera: x => house.setCamera?.(x), maximum: () => (getState().streetWidth ?? 1000) - 1000 }) : null;
  canvas.addEventListener('wheel', event => { if (wheel?.wheel(event)) event.preventDefault(); }, { passive: false });
  const cancel = () => { canvas.parentElement?.closest('#app')?.classList.remove('gesturing'); wheel?.cancel(); router?.cancel(); gesture.cancel(); build?.gesture.cancel(); };
  const pixels = (e: PointerEvent) => ({ x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY });
  const point = (event: PointerEvent): Point => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (getState().streetWidth ? 1000 : roomWidth(getState())) / bounds.width + (house?.camera?.() ?? 0), y: (event.clientY - bounds.top) * 600 / bounds.height };
  };
  canvas.addEventListener('pointerdown', event => {
    wheel?.cancel();
    if (router ? router.start(event.pointerId, point(event), pixels(event)) : current().start(event.pointerId, point(event))) { canvas.setPointerCapture(event.pointerId); canvas.parentElement?.closest('#app')?.classList.add('gesturing'); }
  });
  canvas.addEventListener('pointermove', event => router ? router.update(event.pointerId, point(event), pixels(event)) : current().update(event.pointerId, point(event)));
  canvas.addEventListener('pointerup', event => {
    const box = canvas.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) cancel();
    if (router) router.end(event.pointerId, point(event), pixels(event)); else current().end(event.pointerId, point(event));
    canvas.parentElement?.closest('#app')?.classList.remove('gesturing');
  });
  const cancelledPointer = (event: PointerEvent) => { cancel(); router?.end(event.pointerId, point(event), pixels(event)); };
  canvas.addEventListener('pointercancel', cancelledPointer);
  canvas.addEventListener('lostpointercapture', cancelledPointer);
  window.addEventListener('blur', () => { cancel(); router?.reset?.(); });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
  return cancel;
}
