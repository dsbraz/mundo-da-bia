import { plotAt } from '../domain/neighborhood-geometry';
import type { Neighborhood, NeighborhoodAction, Location } from '../domain/neighborhood-types';
import type { ActorId, ItemId, Point, World } from '../domain/types';
import type { VisibleWorld } from './targets';
import { actorAt, grabActor, sourceAt } from './targets';
import { doorAt, doorDropAt, destinationPoint, type Door } from './neighborhood-doors';
import { onFloor } from './floor-band';
type Gesture = { start: (id: number, p: Point) => boolean; update: (id: number, p: Point) => void; end: (id: number, p: Point) => void; cancel: () => void; transferring?: () => boolean };
interface Actions {
  drop?: (actor: ActorId, point: Point) => boolean;
  /** A tap on a door: the chosen character walks through it (true), or false to only visit. */
  enter?: (destination: Location) => boolean;
  town: () => Neighborhood; world: () => World; building: () => boolean;
  dispatch: (action: NeighborhoodAction) => void; plot: (plot: number) => void;
  preview: (action: NeighborhoodAction | null) => void; progress: (value: number) => void;
  /** The door the dragged character's feet are over lights up (null: none). */
  glow?: (door: Door | null) => void;
  /** A character let go on a door went through it. */
  outcome?: (value: string) => void;
}
interface Active { id: number; start: Point; offset: Point; near?: ActorId | undefined; actor?: ActorId | undefined; item?: ItemId | undefined; destination?: Location | undefined; ready: boolean; claimed: boolean; door?: Door | undefined }
export function neighborhoodGesture(base: Gesture, actions: Actions): Gesture {
  let active: Active | null = null, timer: ReturnType<typeof setInterval> | undefined;
  function stop() { clearInterval(timer); timer = undefined; actions.progress(0); }
  function cancel() { const previewed = active?.ready, lit = active?.door; stop(); active = null; base.cancel(); if (previewed) actions.preview(null); if (lit) actions.glow?.(null); }
  /** The door under the character's feet, as drawn or past the floor's edge (never just under the finger: the feet decide). */
  function feetDoor(a: Active, point: Point) {
    const raw = { x: point.x + a.offset.x, y: point.y + a.offset.y };
    return [onFloor(actions.world(), raw), raw].map(p => doorDropAt(actions.town(), p)).find(Boolean);
  }
  /** A character let go on a door goes through it at once. */
  function through(a: Active, point: Point) {
    const door = a.actor && moved(a, point) ? feetDoor(a, point) : undefined;
    if (!door) return false;
    a.destination = door.location; const action = transfer(a); cancel(); actions.dispatch(action); actions.outcome?.('crossed'); return true;
  }
  function light(a: Active, point: Point) {
    const door = feetDoor(a, point);
    if (door?.name !== a.door?.name) { a.door = door; actions.glow?.(door ?? null); }
  }
  function transfer(a: Active): NeighborhoodAction {
    return { type: 'transport', ...(a.actor ? { actor: a.actor } : { item: a.item! }), location: a.destination!, point: destinationPoint(actions.town(), a.destination!) };
  }
  function update(id: number, point: Point) {
    if (active?.id !== id || active.ready) return;
    base.update(id, point);
    if (adopted(active, point)) { light(active, point); return; }
    if (!active.item) return;
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
      // Off the drawing but inside a body's capsule: the character is taken only if the finger moves (a tap stays a tap).
      const exact = token ? undefined : actorAt(world, point), found = exact ?? (token ? undefined : grabActor(world, point)), actor = exact?.id;
      active = { id, start: point, offset: found ? { x: found.x - point.x, y: found.y - point.y } : { x: 0, y: 0 }, ready: false, claimed: claimed(world, point, token), ...(actions.building() ? {} : { actor, near: found?.id, item: loose(world, token) }) };
      if (startBase(active, point, actions)) base.start(id, point);
      return true;
    }, update,
    end(id, point) {
      if (active?.id !== id) return;
      const a = active;
      if (a.ready) { const action = transfer(a); cancel(); actions.dispatch(action); return; }
      if (through(a, point)) return;
      if (dropActor(a, point, actions)) { cancel(); return; }
      const tapped = backgroundTap(a, point) ? backgroundAction(actions, point) : null;
      if (tapped) { cancel(); tapped(); return; }
      base.end(id, point); cancel();
    }, cancel, transferring: () => active?.ready ?? false,
  };
}
/** A tap on the bare scene: through a door (walking there in play, or just visiting), or choosing a plot; null when it is neither. */
function backgroundAction(actions: Actions, point: Point): (() => void) | null {
  const door = actions.building() ? undefined : doorAt(actions.town(), point);
  if (door) return () => { if (!actions.enter?.(door.location)) actions.dispatch({ type: 'visit', location: door.location }); };
  return plotTap(actions, point) ? () => actions.plot(plotAt(point.x)) : null;
}
function loose(world: World, token: ReturnType<typeof sourceAt>): ItemId | undefined {
  return token?.kind === 'item' && world.items.some(i => i.id === token.id && !i.holder && i.spot === 'floor') ? token.id : undefined;
}

const moved = (active: Active, point: Point) => Math.hypot(point.x - active.start.x, point.y - active.start.y) >= 12;
/** The dragged character: touched, or near-missed and moved by the finger. */
function adopted(active: Active, point: Point) {
  if (!active.actor && active.near && moved(active, point)) active.actor = active.near;
  return !!active.actor;
}
function dropActor(active: Active, point: Point, actions: Actions) { return !!active.actor && moved(active, point) && !!actions.drop?.(active.actor, point); }

function backgroundTap(active: Active, point: Point) { return !active.claimed && !active.actor && !active.item && Math.hypot(point.x - active.start.x, point.y - active.start.y) < 12; }

function startBase(active: Active, point: Point, actions: Actions) {
  return actions.building() || active.claimed || !doorAt(actions.town(), point) || active.near || active.item;
}

/** On the street, Create mode picks any plot; Play mode only answers on a free plot's ground and sign. */
function plotTap(actions: Actions, point: Point) {
  const town = actions.town();
  if (town.location.kind !== 'street') return false;
  if (actions.building()) return true;
  const plot = plotAt(point.x);
  return plot >= 0 && plot < town.plots && point.y >= 270 && point.y <= 455 && !town.buildings.some(b => b.plot === plot);
}
function claimed(world: VisibleWorld, point: Point, token: ReturnType<typeof sourceAt>) {
  return !!token || (world.occludingDepth?.(point) ?? 0) > 150;
}
