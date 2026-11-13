import type { ActorId, Need, PieceKind, Point, World } from '../domain/types';
/** What a refusal shows: the drawing of what is missing, the face of who already has it, the door when the piece is in another room.
 *  `label` only reaches screen readers: the bubble never shows text. */
export interface Missing { need: Need; by?: ActorId; door?: boolean; label: string;
  /** With a door: a touch on the bubble takes her to the room where the piece is (W3L-15). */
  go?: () => void }
type Frame = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;
/** Lot 4's drawings live in their own sheet. */
const lotFour: readonly Need[] = ['stove', 'counter', 'market', 'checkout'];
export function missingParts(missing: Missing): string[] {
  return [`/art/${lotFour.includes(missing.need) ? 'market' : 'needs'}.svg#${missing.need}`, ...(missing.by ? [`/icons/${missing.by}.svg`] : []), ...(missing.door ? ['/art/needs.svg#door'] : [])];
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
type Box = { left: number; top: number; right: number; bottom: number };
/** Where the bubble's tip goes so the bubble (`size`, drawn `lift` px above the tip: 40 for the thought's little clouds, 16 for this one)
 *  stays clear of the open character menu: beside the menu (right, else left, within `width`) when it would sit under it. */
export function besideMenu(tip: Point, size: { width: number; height: number }, menu: Box | null, width: number, lift = 40): Point {
  const box = { left: tip.x - size.width / 2, right: tip.x + size.width / 2, top: tip.y - lift - size.height, bottom: tip.y - lift };
  if (!menu || box.right <= menu.left || box.left >= menu.right || box.bottom <= menu.top || box.top >= menu.bottom) return tip;
  const right = menu.right + 12 + size.width / 2;
  return { x: right + size.width / 2 <= width ? right : menu.left - 12 - size.width / 2, y: tip.y };
}
/** One bubble at a time, over the scene, gone after a moment; never over the open action ring. */
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
    if (navigator.webdriver) Object.assign(bubble.dataset, { need: missing.need, by: missing.by ?? '', door: String(!!missing.door) });
    if (missing.go) tappable(bubble, missing.go);
    host.append(bubble); shown = bubble;
    const menu = host.querySelector<HTMLElement>('#actor-context')?.getBoundingClientRect();
    const place = besideMenu(bubblePlace(at, scene()), { width: bubble.offsetWidth, height: bubble.offsetHeight }, menu?.width ? menu : null, window.innerWidth, 16);
    bubble.style.left = `${place.x}px`; bubble.style.top = `${place.y}px`;
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
