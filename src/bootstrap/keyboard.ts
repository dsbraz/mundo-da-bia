import type { EditAction, Point, World } from '../domain/types';
import { onFloor } from '../presentation/floor-band';
import { standingSpot, walkingPath } from '../presentation/walking-path';
interface Keyboard {
  building: () => boolean; state: () => World; piece: () => number | null; actor: () => Point & { seat?: string | null };
  edit: (action: EditAction) => void; move: (point: Point) => void; stopWalk: () => void;
}
const offsets: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
export function bindKeyboard(root: HTMLElement, deps: Keyboard) {
  root.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    if (target.closest('input,select,button') && !target.matches('.scene-target')) return;
    const offset = offsets[(event as KeyboardEvent).key];
    const selected = deps.piece();
    if (deps.building()) {
      if (!offset || selected === null) return;
      event.preventDefault(); const piece = deps.state().layout.pieces.find(p => p.id === selected)!;
      deps.edit({ type: 'move', id: piece.id, point: { x: piece.x + offset[0], y: piece.y + offset[1] } });
      return;
    }
    if (!offset) return;
    event.preventDefault(); deps.stopWalk();
    const actor = deps.actor(), world = deps.state();
    const start = actor.seat ? standingSpot(world, onFloor(world, actor)) : actor;
    const point = onFloor(world, { x: start.x + offset[0], y: start.y + offset[1] });
    if (walkingPath(world, start, point)?.length === 1) deps.move(point);
  });
}
