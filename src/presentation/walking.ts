import type { ActorId, Point, World } from '../domain/types';
import { walkingPath } from './walking-path';
interface Actions {
  state: () => World; selected: () => ActorId; preview: (id: ActorId | null, point: Point | null) => void;
  commit: (id: ActorId, point: Point) => void; hint: (text: string) => void;
}
export function walking(actions: Actions) {
  let frame = 0, position: Point | null = null, actor: ActorId | null = null;
  function cancel() { cancelAnimationFrame(frame); frame = 0; position = null; actor = null; actions.preview(null, null); }
  function start(destination: Point, complete = () => {}) {
    const id = actions.selected(), world = actions.state(), resident = world.actors.find(a => a.id === id)!;
    const origin = actor === id && position ? position : resident;
    const path = walkingPath(world, origin, destination);
    cancel();
    if (resident.room !== world.room || !path) { actions.hint('Escolha um lugar livre no chão.'); return; }
    actor = id; position = { x: origin.x, y: origin.y }; let last = performance.now();
    function tick(now: number) {
      if (!position) return;
      let distance = Math.min(50, now - last) * .24; last = now;
      while (path!.length && distance > 0) {
        const target = path![0]!, length = Math.hypot(target.x - position.x, target.y - position.y);
        if (length <= distance) { position = target; path!.shift(); distance -= length; }
        else { position = { x: position.x + (target.x - position.x) * distance / length, y: position.y + (target.y - position.y) * distance / length }; distance = 0; }
      }
      actions.preview(id, position);
      if (path!.length) frame = requestAnimationFrame(tick);
      else { cancel(); actions.commit(id, destination); complete(); }
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { cancel(); actions.commit(id, destination); complete(); }
    else frame = requestAnimationFrame(tick);
  }
  return { start, cancel };
}
