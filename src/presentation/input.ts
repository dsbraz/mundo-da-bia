import { screenToWorld, screenScale } from './viewport';
import { cameraGesture } from './camera-gesture';
import { wheelNavigation } from './wheel-navigation';
import { neighbor } from '../domain/doors';
import { houseInput } from './house-input';
import type { HouseInput } from './house-input';
import type { ActorId, Point, World } from '../domain/types';
import { createPlayGesture } from './play-gesture';
import type { PlayInput } from './play-gesture';

export interface BuildInput { enabled: () => boolean; gesture: ReturnType<typeof createPlayGesture> }
export function bindInput(canvas: HTMLCanvasElement, getState: () => World, select: (id: ActorId) => void, move: (point: Point) => void, play?: PlayInput, build?: BuildInput, house?: HouseInput, wrap: (gesture: ReturnType<typeof createPlayGesture>) => ReturnType<typeof createPlayGesture> = g => g) {
  const scaledPlay = play && { ...play, screenScale: () => {
    return { x: screenScale(canvas), y: screenScale(canvas) };
  } };
  const gesture = createPlayGesture(getState, select, move, scaledPlay);
  const wrappedPlay = wrap(gesture), wrappedBuild = build ? wrap(build.gesture) : wrappedPlay;
  const current = () => build?.enabled() ? wrappedBuild : wrappedPlay;
  const baseRouter = house ? houseInput(canvas, getState, current, house) : null;
  const router = house?.view && baseRouter ? cameraGesture(baseRouter, house.view.background, house.view.pan) : baseRouter;
  const wheel = house ? wheelNavigation({ width: () => canvas.getBoundingClientRect().width,
    neighbor: direction => neighbor(getState(), direction), preview: house.pan, visit: room => house.dispatch({ type: 'room', room }),
    street: () => !!getState().streetWidth, camera: () => house.camera?.() ?? 0, setCamera: x => house.setCamera?.(x), maximum: () => (getState().streetWidth ?? 1000) - 1000 }) : null;
  canvas.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) return;
    if (house?.view) { house.view.pan(-event.deltaX, -event.deltaY); event.preventDefault(); }
    else if (wheel?.wheel(event)) event.preventDefault();
  }, { passive: false });
  const cancel = () => { canvas.parentElement?.closest('#app')?.classList.remove('gesturing'); wheel?.cancel(); router?.reset?.(); gesture.cancel(); build?.gesture.cancel(); };
  const pixels = (e: PointerEvent) => ({ x: e.clientX - (canvas.parentElement ?? canvas).getBoundingClientRect().left, y: e.clientY });
  const point = (event: PointerEvent): Point => screenToWorld(canvas, { x: event.clientX, y: event.clientY });
  canvas.addEventListener('pointerdown', event => {
    wheel?.cancel(); play?.hover?.(null);
    if (router ? router.start(event.pointerId, point(event), pixels(event)) : current().start(event.pointerId, point(event))) { canvas.setPointerCapture(event.pointerId); canvas.parentElement?.closest('#app')?.classList.add('gesturing'); }
  });
  canvas.addEventListener('pointermove', event => {
    if (!event.buttons) play?.hover?.(point(event));
    if (router) router.update(event.pointerId, point(event), pixels(event)); else current().update(event.pointerId, point(event));
  });
  canvas.addEventListener('pointerleave', () => play?.hover?.(null));
  canvas.addEventListener('pointerup', event => {
    const box = (canvas.parentElement ?? canvas).getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) cancel();
    if (router) router.end(event.pointerId, point(event), pixels(event)); else current().end(event.pointerId, point(event));
    canvas.parentElement?.closest('#app')?.classList.remove('gesturing');
  });
  const cancelledPointer = (event: PointerEvent) => {
    if (router && 'cancelPointer' in router && typeof router.cancelPointer === 'function') {
      if (router.cancelPointer(event.pointerId)) canvas.parentElement?.closest('#app')?.classList.remove('gesturing');
    } else { cancel(); router?.end(event.pointerId, point(event), pixels(event)); }
  };
  canvas.addEventListener('pointercancel', cancelledPointer);
  canvas.addEventListener('lostpointercapture', cancelledPointer);
  window.addEventListener('blur', () => { cancel(); router?.reset?.(); });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
  return cancel;
}
