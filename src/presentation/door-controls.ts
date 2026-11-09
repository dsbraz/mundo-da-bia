import { worldToScreen, screenScale } from './viewport';
import type { ActorId, Point, World } from '../domain/types';
import { neighbor } from '../domain/doors';
import type { Direction } from '../domain/doors';
import { roomWidth } from '../domain/geometry';
import { roomPicture } from './quick-rooms';
export function doorAt(state: World, point: Point): Direction | undefined {
  if (point.x < 0 || point.x > roomWidth(state) || point.y < 280 || point.y > 450) return undefined;
  const side = point.x <= 75 ? 'left' : point.x >= roomWidth(state) - 75 ? 'right' : undefined;
  return side && neighbor(state, side) ? side : undefined;
}
export function doorControls(root: HTMLElement, go: (side: Direction) => void) {
  const nav = root.querySelector<HTMLElement>('#door-navigation')!; let width = 1000;
  const buttons = (['left', 'right'] as const).map(side => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.side = side;
    button.addEventListener('click', () => go(side)); nav.append(button); return button;
  });
  const position = () => {
    const canvas = root.querySelector('canvas'); if (!canvas) return;
    const point = worldToScreen(canvas, { x: 0, y: 280 }), scale = screenScale(canvas);
    nav.style.cssText = `left:${point.x}px;top:${point.y}px;width:${width * scale}px;height:${170 * scale}px;--door-width:${75 * scale}px;`;

  };
  new ResizeObserver(position).observe(root);
  return (state: World, selected: ActorId) => {
    width = roomWidth(state);
    buttons.forEach(button => {
      const id = neighbor(state, button.dataset.side as Direction); button.hidden = !id;
      if (!id) return;
      const room = state.layout.rooms[id]!;
      button.setAttribute('aria-label', `Porta para ${room.name}`); button.title = room.name;
      button.replaceChildren(roomPicture(room.template), document.createTextNode(button.dataset.side === 'left' ? '←' : '→'));
      button.disabled = !state.actors.some(a => a.id === selected && a.room === state.room);
    });
    requestAnimationFrame(position);
  };
}
export async function slideRoom(canvas: HTMLCanvasElement, direction: Direction, commit: () => void, duration: number) {
  const box = canvas.getBoundingClientRect(); const image = new Image(); image.src = canvas.toDataURL();
  image.className = 'room-transition'; image.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;`;
  document.body.append(image);
  try {
    commit();
    const offset = direction === 'right' ? box.width : -box.width;
    await Promise.all([
      image.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-offset}px)` }], { duration, easing: 'ease-in-out' }).finished,
      canvas.animate([{ transform: `translateX(${offset}px)` }, { transform: 'translateX(0)' }], { duration, easing: 'ease-in-out' }).finished,
    ]);
  } finally { image.remove(); }
}
