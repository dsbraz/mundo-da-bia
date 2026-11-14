import type { ActorId, Point } from '../domain/types';
import type { Suggestion } from '../domain/routine';
import { besideMenu, bubblePlace, placeBubble } from './missing-bubble';
import { worldToScreen } from './viewport';

/** The drawing of each suggestion of the day (W3L-27): the backpack, the briefcase, the ball, the plate and the pillow. */
const icons: Record<Suggestion, string> = { mochila: '/art/school.svg#mochila', pasta: '/art/school.svg#pasta', bola: '/icons/bola.svg',
  prato: '/art/needs.svg#food', travesseiro: '/art/needs.svg#pillow' };
export const suggestionIcon = (wish: Suggestion) => icons[wish];
export interface Wish { actor: ActorId; suggestion: Suggestion; label: string }
interface Deps<W extends Wish> {
  /** What the selected character's day suggests now, or null (Criar, the first 30 s, nowhere to go, someone else's bubble up). */
  wish: () => W | null;
  head: (id: ActorId) => Point | null; canvas: () => HTMLCanvasElement | null;
  /** A touch on the bubble: the Map opens with the place marked. */
  go: (wish: W) => void;
}
/** The dashed thought bubble of the routine: the same cloud as a need's, drawn dashed, and a touch on it opens the Map. It gives way to
 *  any other bubble (a need's thought or a refusal), so a need always wins. Ignoring it changes nothing. */
export function routineBubble<W extends Wish>(host: HTMLElement, deps: Deps<W>) {
  const bubble = document.createElement('div'), image = document.createElement('img');
  bubble.className = 'missing-bubble wish'; bubble.setAttribute('role', 'button'); bubble.tabIndex = 0;
  image.className = 'need'; image.alt = ''; image.draggable = false; bubble.append(image);
  let shown: W | null = null;
  const press = (event: Event) => { event.preventDefault(); event.stopPropagation(); if (shown) deps.go(shown); };
  bubble.addEventListener('click', press);
  bubble.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') press(event); });
  function place(wish: W | null): Point | null {
    if (!wish || host.querySelector('.missing-bubble:not(.wish)')) return null;
    const head = deps.head(wish.actor), canvas = deps.canvas();
    return head && canvas ? bubblePlace(worldToScreen(canvas, head), canvas.getBoundingClientRect()) : null;
  }
  function show(wish: W, at: Point) {
    if (!bubble.isConnected) host.append(bubble);
    const menu = host.querySelector<HTMLElement>('#actor-context')?.getBoundingClientRect() ?? null;
    placeBubble(bubble, at, besideMenu(at, { width: bubble.offsetWidth, height: bubble.offsetHeight }, menu?.width ? menu : null, window.innerWidth));
    if (image.getAttribute('src') !== icons[wish.suggestion]) image.src = icons[wish.suggestion];
    bubble.setAttribute('aria-label', wish.label);
    if (navigator.webdriver) Object.assign(bubble.dataset, { actor: wish.actor, suggestion: wish.suggestion });
  }
  function frame() {
    const wish = deps.wish(), at = place(wish);
    shown = at ? wish : null;
    if (at && wish) show(wish, at); else bubble.remove();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
