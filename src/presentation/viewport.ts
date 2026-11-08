import type { Point } from '../domain/types';
const clamp = (value: number, maximum: number) => Math.max(0, Math.min(maximum, value));
export function framing(width: number, height: number, worldWidth: number, center: Point) {
  const scale = Math.max(width / worldWidth, height / 600);
  return { scale, x: clamp(center.x - width / scale / 2, worldWidth - width / scale), y: clamp(center.y - height / scale / 2, 600 - height / scale) };
}
export function viewport(canvas: HTMLCanvasElement, changed: () => void) {
  const parent = canvas.parentElement!;
  let center: Point = { x: 500, y: 360 }, width = 1000, room = '', manual = false;
  let view = { scale: 1, x: 0, y: 0 };
  function render() {
    view = framing(parent.clientWidth, parent.clientHeight, width, center);
    canvas.style.setProperty('--view-width', `${width * view.scale}px`);
    canvas.style.setProperty('--view-height', `${600 * view.scale}px`);
    canvas.style.setProperty('margin', '0', 'important');
    canvas.style.position = 'absolute'; canvas.style.left = `${-view.x * view.scale}px`; canvas.style.top = `${-view.y * view.scale}px`;
    center = { x: view.x + parent.clientWidth / view.scale / 2, y: view.y + parent.clientHeight / view.scale / 2 };
    changed();
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
    follow(point: Point) {
      if (manual) return;
      const half = { x: parent.clientWidth / view.scale * .25, y: parent.clientHeight / view.scale * .25 };
      const dx = point.x - center.x, dy = point.y - 70 - center.y;
      if (Math.abs(dx) > half.x) center.x += (dx - Math.sign(dx) * half.x) * .12;
      if (Math.abs(dy) > half.y) center.y += (dy - Math.sign(dy) * half.y) * .12;
      render();
    },
  };
}

export function positionTargets(root: HTMLElement) {
  const canvas = root.querySelector('canvas'); if (!canvas) return;
  const bounds = canvas.getBoundingClientRect(), width = canvas.width / 2;
  root.querySelectorAll<HTMLElement>('[data-world-x]').forEach(button => {
    button.style.left = `${bounds.left + (Number(button.dataset.worldX) - Number(canvas.dataset.cameraX ?? 0)) / width * bounds.width}px`;
    button.style.top = `${bounds.top + Number(button.dataset.worldY) / 600 * bounds.height}px`;
  });
}
