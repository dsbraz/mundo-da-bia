import type { Point } from '../domain/types';
import { followElapsed, followFactor } from './motion';
const clamp = (value: number, maximum: number) => Math.max(0, Math.min(maximum, value));
export function framing(width: number, height: number, worldWidth: number, center: Point) {
  const scale = Math.min(width / Math.min(worldWidth, 1000), height / 600);
  return { scale, x: offset(center.x, worldWidth, width / scale), y: offset(center.y, 600, height / scale) };
}
function offset(center: number, world: number, visible: number) {
  return visible >= world ? (world - visible) / 2 : clamp(center - visible / 2, world - visible);
}
export function viewport(canvas: HTMLCanvasElement, changed: (width: number, height: number, x: number, y: number) => void) {
  const parent = canvas.parentElement!;
  let center: Point = { x: 500, y: 360 }, width = 1000, room = '', manual = false, followed: number | null = null;
  let view = { scale: 1, x: 0, y: 0 };
  function render() {
    view = framing(parent.clientWidth, parent.clientHeight, width, center);
    canvas.style.setProperty('--view-width', `${parent.clientWidth}px`);
    canvas.style.setProperty('--view-height', `${parent.clientHeight}px`);
    canvas.style.setProperty('margin', '0', 'important');
    canvas.style.position = 'absolute'; canvas.style.left = '0'; canvas.style.top = '0';
    center = { x: view.x + parent.clientWidth / view.scale / 2, y: view.y + parent.clientHeight / view.scale / 2 };
    canvas.dataset.viewX = String(view.x); canvas.dataset.viewY = String(view.y);
    canvas.dataset.viewWidth = String(parent.clientWidth / view.scale);
    canvas.dataset.viewHeight = String(parent.clientHeight / view.scale);
    changed(parent.clientWidth / view.scale, parent.clientHeight / view.scale, view.x, view.y);
  }
  new ResizeObserver(render).observe(parent);
  return {
    render,
    scene(key: string, logicalWidth: number) {
      width = logicalWidth;
      if (room !== key) { room = key; center = { x: width / 2, y: 360 }; manual = false; }
      render();
    },
    pan(dx: number, dy: number) { manual = true; center.x -= dx / view.scale; center.y -= dy / view.scale; render(); },
    resume() { manual = false; },
    follow(point: Point, now = performance.now()) {
      if (manual) return;
      const step = followFactor(followElapsed(now, followed)); followed = now;
      const half = { x: parent.clientWidth / view.scale * .25, y: parent.clientHeight / view.scale * .25 };
      const dx = point.x - center.x, dy = point.y - 70 - center.y;
      if (Math.abs(dx) > half.x) center.x += (dx - Math.sign(dx) * half.x) * step;
      if (Math.abs(dy) > half.y) center.y += (dy - Math.sign(dy) * half.y) * step;
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
