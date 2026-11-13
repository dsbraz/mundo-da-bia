import { doorway } from './door-geometry';
import { plotStart } from '../domain/neighborhood-geometry';
import type { Location, Neighborhood } from '../domain/neighborhood-types';
import type { Point } from '../domain/types';
import { sameLocation } from '../domain/location';
import { streetArrival } from './street-opening';
import { passageDepth, passages, stairsDepth, type PassageKind, type Rect } from './room-passages';
/** A way out of the place shown: a facade door, the "Rua" door, a side doorway or stairs. `box`: drawn and touched there;
 *  `front`: where one stands to go through it; `sill`: where one vanishes into it and comes out of it. */
export interface Door { location: Location; name: string; point: Point; box: Rect; kind: 'door' | PassageKind; front: Point; sill: Point }
const interiorDoor = doorway.interior.x + doorway.interior.width / 2, facadeDoor = doorway.facade.x + doorway.facade.width / 2;
const center = (box: Rect): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
export function doors(town: Neighborhood): Door[] {
  const location = town.location;
  if (location.kind === 'street') return town.buildings.map(b => {
    const box = { ...doorway.facade, x: plotStart(b.plot) + doorway.facade.x };
    return { location: { kind: 'interior', building: b.id, room: b.entry }, name: b.name, point: center(box), box, kind: 'door', front: { x: plotStart(b.plot) + facadeDoor, y: doorway.facade.y + doorway.facade.height + 5 }, sill: { x: plotStart(b.plot) + facadeDoor, y: Math.round(doorway.facade.y + doorway.facade.height + 1) } };
  });
  const building = town.buildings.find(b => b.id === location.building)!;
  const street: Door[] = location.room === building.entry ? [{ location: { kind: 'street' }, name: 'Rua', point: center(doorway.interior), box: doorway.interior, kind: 'door', front: { x: interiorDoor, y: doorway.interior.y + doorway.interior.height + 22 }, sill: { x: interiorDoor, y: doorway.interior.y + doorway.interior.height + 2 } }] : [];
  return street.concat(passages(building.layout, location.room).map(p => ({ location: { ...location, room: p.room }, name: building.layout.rooms[p.room]!.name, point: center(p.box), box: p.box, kind: p.kind, front: p.front, sill: p.sill })));
}
/** The door of the place `town` shows that leads to `to` (on the street, the facade of `to`'s building, whichever its room). */
const doorTo = (town: Neighborhood, to: Location) => doors(town).find(d => town.location.kind === 'street' ? d.location.kind === 'interior' && to.kind === 'interior' && d.location.building === to.building : sameLocation(d.location, to));
/** Whoever enters a place comes out of the door that leads back where they were: the "Rua" door from the street, the matching doorway
 *  or stairs from another room. Without one (the Map), a house opens by its "Rua" door and another room by its left side. */
export function destinationPoint(town: Neighborhood, destination: Location): Point {
  if (destination.kind === 'interior') {
    const back = doorTo({ ...town, location: destination }, town.location);
    if (back && back.kind !== 'door') return { x: back.front.x, y: Math.max(back.front.y, 480) };
    return town.buildings.find(b => b.id === destination.building)?.entry === destination.room ? { x: interiorDoor, y: 480 } : { x: 160, y: 520 };
  }
  const current = town.location;
  const building = current.kind === 'interior' ? town.buildings.find(b => b.id === current.building) : undefined;
  return { x: building ? streetArrival(town, building.plot) : 220, y: 520 };
}
const inside = (box: Rect, point: Point, below = 0) => point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height + below;
export function doorAt(town: Neighborhood, point: Point) {
  return doors(town).find(d => inside(d.box, point));
}
/** The door a dragged character's feet at `feet` stand in: the doorway, or the strip of floor right in front of its sill. */
export function doorDropAt(town: Neighborhood, feet: Point): Door | undefined {
  return doors(town).find(d => inside(d.box, feet, 24));
}
/** The doorway's box (scene units) of `door`, as drawn on this place; a doorway or stairs, drawn in front of the furniture, with the
 *  depth its light must sit above. */
export function doorBox(_town: Neighborhood, door: Door): Rect & { depth?: number } { return door.kind === 'door' ? door.box : { ...door.box, depth: (door.kind === 'up' ? stairsDepth : passageDepth) + 1 }; }
/** Where the chosen character walks before going through the door to `destination` (the facade door on the street, the "Rua" door,
 *  a doorway or the stairs inside). */
export function doorFront(town: Neighborhood, destination: Location): Point {
  return (doorTo(town, destination) ?? doors(town)[0])?.front ?? { x: interiorDoor, y: doorway.interior.y + doorway.interior.height + 22 };
}
/** The doorway sill someone arriving from `previous` walks out of, or null when this place has no such door (a house's "Rua" door
 *  still serves whoever arrives there by the Map). */
export function doorStep(town: Neighborhood, previous: Location): Point | null {
  const back = doorTo(town, previous);
  if (back) return back.sill;
  const where = town.location;
  return where.kind === 'interior' ? doorTo(town, { kind: 'street' })?.sill ?? null : null;
}
