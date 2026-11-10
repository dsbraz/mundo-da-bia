import type { Point, World } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { followElapsed, followFactor } from './motion';
const clamp = (value: number, maximum: number) => Math.max(0, Math.min(maximum, value));
/** Logical height the street shows (its lower part, y 110-600): the camera comes closer, facades and people at the same scale. */
export const streetFrame = 490;
/** Fills the scene: `frame` logical units tall (the whole 600 indoors), never wider than the world; the rest is reached by panning. */
export function framing(width: number, height: number, worldWidth: number, center: Point, frame = 600) {
  const scale = Math.max(height / frame, width / worldWidth);
  return { scale, x: offset(center.x, worldWidth, width / scale), y: offset(center.y, 600, height / scale) };
}
export interface Span { left: number; right: number }
export const pieceSpans = (state: World): Span[] => state.layout.pieces.filter(p => p.room === state.room).map(p => ({ left: p.x, right: p.x + pieceBounds[p.kind].width }));
/** Each character in the current room as the width of its selection ring (cats are narrower). */
export const peopleSpans = (state: World): Span[] => state.actors.filter(a => a.room === state.room).map(a => ({ left: a.x - (a.kind === 'cat' ? 35 : 42), right: a.x + (a.kind === 'cat' ? 35 : 42) }));
/** Where a place opens: always with `must` (the chosen character, with its margin) in view when it fits, then the window with the most
 *  whole people, then the most whole furniture by width (a bed outweighs a lamp); ties lean toward the people. */
export function openingX(spans: Span[], visible: number, world: number, must?: Span, people: Span[] = []) {
  const middle = (world - visible) / 2;
  if (visible >= world) return middle;
  const options = Array.from({ length: Math.floor((world - visible) / 10) + 1 }, (_, i) => i * 10).concat(world - visible);
  const fits = (x: number, s: Span) => s.left >= x && s.right <= x + visible;
  const allowed = options.filter(x => !must || fits(x, must));
  const whole = (x: number) => people.filter(s => fits(x, s)).length * personWeight + spans.filter(s => fits(x, s)).reduce((sum, s) => sum + s.right - s.left, 0);
  // Ties lean toward the people (centred on them), or the middle of the place without anyone.
  const lean = people.length ? people.reduce((sum, s) => sum + s.left + s.right, 0) / people.length / 2 - visible / 2 : middle;
  return (allowed.length ? allowed : options).reduce((best, x) => whole(x) > whole(best) || whole(x) === whole(best) && Math.abs(x - lean) < Math.abs(best - lean) ? x : best);
}
/** Wider than any room, so one more whole person always beats any amount of furniture. */
export const personWeight = 10_000;
/** The chosen character stays this many screen pixels away from the scene's edge when a place opens. */
export const openingMargin = 24;
/** One follow step toward a target `gap` away; within half a unit it lands on it, so the camera comes to rest instead of creeping. */
const ease = (gap: number, step: number) => Math.abs(gap) < .5 ? gap : gap * step;
function offset(center: number, world: number, visible: number) {
  return visible >= world ? (world - visible) / 2 : clamp(center - visible / 2, world - visible);
}
export function viewport(canvas: HTMLCanvasElement, changed: (width: number, height: number, x: number, y: number) => void) {
  const parent = canvas.parentElement!;
  let center: Point = { x: 500, y: 360 }, width = 1000, frame = 600, room = '', manual = false, followed: number | null = null;
  let opening: { spans: Span[]; must?: Span | undefined; people: Span[] } | null = null;
  let view = { scale: 1, x: 0, y: 0 };
  // `center` is the intended focus and survives resizes (a tray opening and closing must not drift the view);
  // panning and following start from what is actually shown.
  const shown = () => { center = { x: view.x + parent.clientWidth / view.scale / 2, y: view.y + parent.clientHeight / view.scale / 2 }; };
  function render() {
    view = framing(parent.clientWidth, parent.clientHeight, width, center, frame);
    if (opening) {
      const visible = parent.clientWidth / view.scale, margin = openingMargin / view.scale, must = opening.must;
      center.x = openingX(opening.spans, visible, width, must && { left: must.left - margin, right: must.right + margin }, opening.people) + visible / 2; opening = null;
      view = framing(parent.clientWidth, parent.clientHeight, width, center, frame);
    }
    canvas.style.setProperty('--view-width', `${parent.clientWidth}px`);
    canvas.style.setProperty('--view-height', `${parent.clientHeight}px`);
    canvas.style.setProperty('margin', '0', 'important');
    canvas.style.position = 'absolute'; canvas.style.left = '0'; canvas.style.top = '0';
    canvas.dataset.viewX = String(view.x); canvas.dataset.viewY = String(view.y);
    canvas.dataset.viewWidth = String(parent.clientWidth / view.scale);
    canvas.dataset.viewHeight = String(parent.clientHeight / view.scale);
    changed(parent.clientWidth / view.scale, parent.clientHeight / view.scale, view.x, view.y);
  }
  new ResizeObserver(render).observe(parent);
  return {
    render,
    /** `spans` (pieces), `must` (the chosen character) and `people` pick where a newly entered place opens; without them it opens on its 1000-wide core. */
    scene(key: string, logicalWidth: number, logicalHeight = 600, spans: Span[] = [], must?: Span, people: Span[] = []) {
      width = logicalWidth; frame = logicalHeight;
      if (room !== key) { room = key; center = { x: Math.min(width, 1000) / 2, y: 360 }; manual = false; opening = spans.length || must || people.length ? { spans, must, people } : null; }
      render();
    },
    pan(dx: number, dy: number) { manual = true; shown(); center.x -= dx / view.scale; center.y -= dy / view.scale; render(); },
    resume() { manual = false; },
    /** Eases toward `point`, letting it move freely within `slack` (a fraction of the view) of the centre; 0 centres it. */
    follow(point: Point, now = performance.now(), slack = .25) {
      if (manual) return;
      const step = followFactor(followElapsed(now, followed)); followed = now; shown();
      const half = { x: parent.clientWidth / view.scale * slack, y: parent.clientHeight / view.scale * slack };
      const dx = point.x - center.x, dy = point.y - 70 - center.y;
      if (Math.abs(dx) > half.x) center.x += ease(dx - Math.sign(dx) * half.x, step);
      if (Math.abs(dy) > half.y) center.y += ease(dy - Math.sign(dy) * half.y, step);
      render();
    },
  };
}

export function screenScale(canvas: HTMLCanvasElement) {
  return canvas.getBoundingClientRect().width / Number(canvas.dataset.viewWidth ?? canvas.width / 2);
}
export function screenToWorld(canvas: HTMLCanvasElement, point: Point): Point {
  const box = canvas.getBoundingClientRect(), scale = screenScale(canvas);
  return { x: (point.x - box.left) / scale + Number(canvas.dataset.viewX ?? 0) + Number(canvas.dataset.cameraX ?? 0),
    y: (point.y - box.top) / scale + Number(canvas.dataset.viewY ?? 0) };
}
export function worldToScreen(canvas: HTMLCanvasElement, point: Point): Point {
  const box = canvas.getBoundingClientRect(), scale = screenScale(canvas);
  return { x: box.left + (point.x - Number(canvas.dataset.viewX ?? 0) - Number(canvas.dataset.cameraX ?? 0)) * scale,
    y: box.top + (point.y - Number(canvas.dataset.viewY ?? 0)) * scale };
}
export function positionTargets(root: HTMLElement) {
  const canvas = root.querySelector('canvas'); if (!canvas) return;
  root.querySelectorAll<HTMLElement>('[data-world-x]').forEach(button => {
    const point = worldToScreen(canvas, { x: Number(button.dataset.worldX), y: Number(button.dataset.worldY) });
    button.style.left = `${point.x}px`; button.style.top = `${point.y}px`;
  });
}
