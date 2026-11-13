import type { ActorId, Need, PieceKind, Point, World } from '../domain/types';
/** What a refusal shows: the drawing of what is missing, the face of who already has it, the door when the piece is in another room.
 *  `label` only reaches screen readers: the bubble never shows text. */
export interface Missing { need: Need; by?: ActorId; door?: boolean; label: string;
  /** With a door: a touch on the bubble takes her to the room where the piece is (W3L-15). */
  go?: () => void }
type Frame = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;
export function missingParts(missing: Missing): string[] {
  return [`/art/needs.svg#${missing.need}`, ...(missing.by ? [`/icons/${missing.by}.svg`] : []), ...(missing.door ? ['/art/needs.svg#door'] : [])];
}
/** Where the missing piece is: in this room, in another room of the house (the bubble adds a door) or nowhere (its Create card glows). */
export function missingWay(state: Pick<World, 'room' | 'layout'>, want: PieceKind | undefined): 'here' | 'door' | 'create' {
  const pieces = want ? state.layout.pieces.filter(p => p.kind === want) : [];
  if (!want || pieces.some(p => p.room === state.room)) return 'here';
  return pieces.length ? 'door' : 'create';
}
/** The bubble's tip (screen pixels), kept so the whole bubble (about 200 x 120 px, above the tip) stays inside the scene. */
export function bubblePlace(at: Point, scene: Frame): Point {
  return { x: Math.max(scene.left + 100, Math.min(scene.right - 100, at.x)), y: Math.max(scene.top + 120, Math.min(scene.bottom, at.y)) };
}
/** One bubble at a time, over the scene, gone after a moment. */
export function missingBubble(host: HTMLElement, scene: () => Frame) {
  let shown: HTMLElement | null = null, timer = 0;
  return (missing: Missing, at: Point) => {
    shown?.remove(); window.clearTimeout(timer);
    const bubble = document.createElement('div');
    bubble.className = 'missing-bubble'; bubble.setAttribute('role', 'img'); bubble.setAttribute('aria-label', missing.label);
    missingParts(missing).forEach((src, index) => {
      const image = document.createElement('img'); image.src = src; image.alt = ''; image.draggable = false;
      image.className = index === 0 ? 'need' : src.startsWith('/icons/') ? 'face' : 'door';
      bubble.append(image);
    });
    const place = bubblePlace(at, scene());
    bubble.style.left = `${place.x}px`; bubble.style.top = `${place.y}px`;
    if (navigator.webdriver) Object.assign(bubble.dataset, { need: missing.need, by: missing.by ?? '', door: String(!!missing.door) });
    if (missing.go) tappable(bubble, missing.go);
    host.append(bubble); shown = bubble;
    timer = window.setTimeout(() => { bubble.remove(); if (shown === bubble) shown = null; }, missing.go ? 4000 : 2400);
  };
}
/** The bubble becomes a button: a touch goes where the door points (and the bubble is gone). */
function tappable(bubble: HTMLElement, go: () => void) {
  bubble.classList.add('tappable'); bubble.setAttribute('role', 'button'); bubble.tabIndex = 0; bubble.style.pointerEvents = 'auto'; bubble.style.cursor = 'pointer';
  const press = (event: Event) => { event.preventDefault(); event.stopPropagation(); bubble.remove(); go(); };
  bubble.addEventListener('click', press);
  bubble.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') press(event); });
}
