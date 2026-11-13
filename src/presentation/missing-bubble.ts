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
 *  stays clear of the open character menu when it would sit under it: beside the head, level with it (right, else left, within `width`),
 *  so the tail reaches it (lot 6B); without room there, beside the menu. */
export function besideMenu(tip: Point, size: { width: number; height: number }, menu: Box | null, width: number, lift = 40): Point {
  const clear = (at: Point) => !menu || at.x + size.width / 2 <= menu.left || at.x - size.width / 2 >= menu.right || at.y - lift <= menu.top || at.y - lift - size.height >= menu.bottom;
  if (!menu || clear(tip)) return tip;
  const reach = size.width / 2 + 24, level = tip.y + lift + size.height / 2;
  const head = [tip.x + reach, tip.x - reach].find(x => x - size.width / 2 >= 0 && x + size.width / 2 <= width && clear({ x, y: level }));
  if (head !== undefined) return { x: head, y: level };
  const right = menu.right + 12 + size.width / 2;
  return { x: right + size.width / 2 <= width ? right : menu.left - 12 - size.width / 2, y: tip.y };
}
/** The tail's offsets (px from where it is drawn) so it points back to the head at `head` once the bubble's tip moved to `tip` (beside the
 *  menu, lot 6B): the near circle (or the point) 40% of the way, kept under the bubble (`width`), the far circle 70%, at most 44 px past it. */
export function tailToward(head: Point, tip: Point, width: number): { near: number; far: number } {
  const dx = head.x - tip.x, bound = (value: number, edge: number) => Math.round(Math.max(-edge, Math.min(edge, value)));
  return { near: bound(dx * .4, width / 2 - 20), far: bound(dx * .7, width / 2 + 44) };
}
/** Puts the bubble's tip at `tip` with its tail toward `head` (missing-bubble.css reads the offsets). */
export function placeBubble(bubble: HTMLElement, head: Point, tip: Point) {
  const tail = tailToward(head, tip, bubble.offsetWidth);
  bubble.style.left = `${tip.x}px`; bubble.style.top = `${tip.y}px`;
  bubble.style.setProperty('--tail-near', `${tail.near}px`); bubble.style.setProperty('--tail-far', `${tail.far}px`);
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
    const head = bubblePlace(at, scene());
    placeBubble(bubble, head, besideMenu(head, { width: bubble.offsetWidth, height: bubble.offsetHeight }, menu?.width ? menu : null, window.innerWidth, 16));
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
