import type { ActorId, Point, World } from '../domain/types';
import { walkingPath } from './walking-path';
import { reducedMotion } from './motion';
interface Actions {
  state: () => World; selected: () => ActorId; preview: (id: ActorId | null, point: Point | null) => void;
  reject?: (point: Point) => void;
  commit: (id: ActorId, point: Point) => void; hint: (text: string) => void;
}
export function walking(actions: Actions) {
  let command = 0, velocity = 0;
  let frame = 0, position: Point | null = null, actor: ActorId | null = null;
  function clear() { cancelAnimationFrame(frame); frame = 0; position = null; actor = null; velocity = 0; }
  function cancel() {
    command++; const id = actor, point = position;
    clear();
    if (id && point) { actions.commit(id, point); actions.preview(null, null); }
  }
  function start(destination: Point, complete = () => {}) {
    const id = actions.selected(), world = actions.state(), resident = world.actors.find(a => a.id === id)!;
    const origin = actor === id && position ? position : resident;
    const path = walkingPath(world, origin, destination), continuingSpeed = velocity;
    cancel();
    if (resident.room !== world.room || !path) { actions.reject?.(destination); actions.hint('Ali não cabe. Que tal aqui?'); return; }
    const current = command;
    actor = id; position = { x: origin.x, y: origin.y }; let last = performance.now(), speed = continuingSpeed;
    function tick(now: number) {
      if (current !== command || !position) return;
      const elapsed = Math.min(50, now - last); last = now;
      const remaining = routeLength(position, path!);
      if (remaining < .01) { finish(); return; }
      speed = Math.min(.24, speed + elapsed * .0012, Math.sqrt(2 * .0012 * remaining));
      velocity = speed; let distance = speed * elapsed;
      while (path!.length && distance > 0) {
        const target = path![0]!, length = Math.hypot(target.x - position.x, target.y - position.y);
        if (length <= distance) { position = target; path!.shift(); distance -= length; }
        else { position = { x: position.x + (target.x - position.x) * distance / length, y: position.y + (target.y - position.y) * distance / length }; distance = 0; }
      }
      actions.preview(id, position);
      if (path!.length) frame = requestAnimationFrame(tick);
      else finish();
    }
    function finish() { clear(); actions.commit(id, destination); actions.preview(null, null); if (current === command) complete(); }
    if (reducedMotion()) finish();
    else frame = requestAnimationFrame(tick);
  }
  return { start, cancel };
}

function routeLength(start: Point, path: Point[]) {
  let length = 0, previous = start;
  for (const point of path) { length += Math.hypot(point.x - previous.x, point.y - previous.y); previous = point; }
  return length;
}
