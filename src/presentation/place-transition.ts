import type { Point } from '../domain/types';
import { reducedMotion } from './motion';

/** How a place change looks (W3L-04): a door closes and opens an iris on the doors, the map and "Ir" fade, a swipe finishes its slide. */
export type PlaceKind = 'door' | 'fade' | 'swipe';
export interface PlaceStep { kind: PlaceKind; at?: Point | undefined; during?: ((ms: number) => void) | undefined }
/** Milliseconds of each half: covering, then uncovering after the new place is painted under the cover. Reduced motion: one short fade. */
export function placeTimes(kind: PlaceKind, reduced: boolean): { close: number; open: number } {
  if (reduced) return { close: 0, open: 120 };
  if (kind === 'door') return { close: 220, open: 260 };
  if (kind === 'swipe') return { close: 200, open: 0 };
  return { close: 180, open: 220 };
}
type Phase = 'closing' | 'painted' | 'opening' | '';
/** One place change at a time. `paint` runs while the scene is covered; `arrival` says where the opening iris starts (the arrival door).
 *  A tap during the closing is held and replayed once the new place shows; during the opening it goes through. */
export function placeTransition(world: HTMLElement, canvas: () => HTMLCanvasElement | null) {
  const cover = document.createElement('div'), iris = document.createElement('div');
  cover.className = 'place-cover'; iris.className = 'place-iris'; cover.append(iris); cover.hidden = true; world.append(cover);
  let phase: Phase = '', held: Pick<PointerEvent, 'clientX' | 'clientY'> | null = null;
  const mark = (value: Phase) => { phase = value; const c = canvas(); if (c) c.dataset.transition = value; };
  world.addEventListener('pointerdown', event => { if (phase !== 'closing') return; held = { clientX: event.clientX, clientY: event.clientY }; event.stopImmediatePropagation(); }, true);
  world.addEventListener('pointerup', event => { if (phase === 'closing') event.stopImmediatePropagation(); }, true);
  function shape(step: PlaceStep, covered: boolean, ms: number) {
    const reduced = reducedMotion(), round = step.kind === 'door' && !reduced && !!step.at, box = world.getBoundingClientRect();
    cover.dataset.kind = round ? 'iris' : step.kind === 'swipe' && !reduced ? 'swipe' : 'fade';
    cover.style.setProperty('--ms', `${ms}ms`);
    if (round) { const at = step.at!; iris.style.left = `${at.x - box.left}px`; iris.style.top = `${at.y - box.top}px`; }
    cover.style.setProperty('--size', covered ? '0px' : `${Math.ceil(Math.hypot(box.width, box.height) * 2.2)}px`);
    cover.classList.toggle('covered', covered);
  }
  function replay() {
    const c = canvas(), tap = held; held = null; if (!c || !tap) return;
    const init = { clientX: tap.clientX, clientY: tap.clientY, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, button: 0 };
    c.dispatchEvent(new PointerEvent('pointerdown', init)); c.dispatchEvent(new PointerEvent('pointerup', init));
  }
  return {
    busy: () => phase === 'closing',
    /** Covers, runs `paint`, uncovers; `done` after the cover is gone. */
    run(step: PlaceStep, paint: () => void, arrival: () => Point | undefined = () => undefined) {
      const times = placeTimes(step.kind, reducedMotion());
      cover.hidden = false; shape(step, false, 0); mark('closing');
      void cover.offsetWidth; shape(step, true, times.close); step.during?.(times.close);
      window.setTimeout(() => {
        paint(); mark('painted');
        const back = { ...step, at: arrival() ?? step.at };
        shape(back, true, 0); void cover.offsetWidth;
        window.setTimeout(() => {
          mark('opening'); shape(back, false, times.open); replay();
          window.setTimeout(() => { cover.hidden = true; mark(''); }, times.open);
        }, 16);
      }, times.close);
    },
  };
}
