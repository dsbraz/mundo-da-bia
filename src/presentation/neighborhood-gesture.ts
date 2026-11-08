import { plotAt } from '../domain/neighborhood-geometry';
import type { Neighborhood, NeighborhoodAction, Location } from '../domain/neighborhood-types';
import type { ActorId, ItemId, Point, World } from '../domain/types';
import { actorAt, sourceAt } from './targets';
import { doorAt, destinationPoint } from './neighborhood-doors';
type Gesture = { start: (id: number, p: Point) => boolean; update: (id: number, p: Point) => void; end: (id: number, p: Point) => void; cancel: () => void; transferring?: () => boolean };
interface Actions {
  drop?: (actor: ActorId, point: Point) => boolean;
  town: () => Neighborhood; world: () => World; building: () => boolean;
  dispatch: (action: NeighborhoodAction) => void; plot: (plot: number) => void;
  preview: (action: NeighborhoodAction | null) => void; progress: (value: number) => void;
}
interface Active { id: number; start: Point; actor?: ActorId | undefined; item?: ItemId | undefined; destination?: Location | undefined; ready: boolean }
export function neighborhoodGesture(base: Gesture, actions: Actions): Gesture {
  let active: Active | null = null, timer: ReturnType<typeof setInterval> | undefined;
  function stop() { clearInterval(timer); timer = undefined; actions.progress(0); }
  function cancel() { const previewed = active?.ready; stop(); active = null; base.cancel(); if (previewed) actions.preview(null); }
  function transfer(a: Active): NeighborhoodAction {
    return { type: 'transport', ...(a.actor ? { actor: a.actor } : { item: a.item! }), location: a.destination!, point: destinationPoint(actions.town(), a.destination!) };
  }
  function update(id: number, point: Point) {
    if (active?.id !== id || active.ready) return;
    base.update(id, point);
    if (!active.actor && !active.item) return;
    const door = doorAt(actions.town(), point);
    if (JSON.stringify(door?.location) === JSON.stringify(active.destination)) return;
    stop(); active.destination = door?.location;
    if (!door) return;
    let elapsed = 0;
    timer = setInterval(() => {
      elapsed += 25; actions.progress(elapsed / 500);
      if (elapsed < 500 || !active) return;
      stop(); active.ready = true; base.cancel(); actions.preview(transfer(active));
    }, 25);
  }
  return {
    start(id, point) {
      if (active) return false;
      const world = actions.world(), token = sourceAt(world, point, false);
      const actor = token ? undefined : actorAt(world, point)?.id;
      active = { id, start: point, ready: false, ...(actions.building() ? {} : { actor, item: loose(world, token) }) };
      if (!doorAt(actions.town(), point) || actor || token) base.start(id, point);
      return true;
    }, update,
    end(id, point) {
      if (active?.id !== id) return;
      const a = active;
      if (a.ready) { const action = transfer(a); cancel(); actions.dispatch(action); return; }
      if (dropActor(a, point, actions)) { cancel(); return; }
      if (backgroundTap(a, point)) {
        const door = doorAt(actions.town(), point);
        if (door) { cancel(); actions.dispatch({ type: 'visit', location: door.location }); return; }
        if (actions.building() && actions.town().location.kind === 'street') { cancel(); actions.plot(plotAt(point.x)); return; }
      }
      base.end(id, point); cancel();
    }, cancel, transferring: () => active?.ready ?? false,
  };
}
function loose(world: World, token: ReturnType<typeof sourceAt>): ItemId | undefined {
  return token?.kind === 'item' && world.items.some(i => i.id === token.id && !i.holder && i.spot === 'floor') ? token.id : undefined;
}

function dropActor(active: Active, point: Point, actions: Actions) { return !!active.actor && Math.hypot(point.x - active.start.x, point.y - active.start.y) >= 12 && !!actions.drop?.(active.actor, point); }

function backgroundTap(active: Active, point: Point) { return !active.actor && !active.item && Math.hypot(point.x - active.start.x, point.y - active.start.y) < 12; }
