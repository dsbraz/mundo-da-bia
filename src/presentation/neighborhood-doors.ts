import { doorway } from './door-geometry';
import { plotStart } from '../domain/neighborhood-geometry';
import type { Location, Neighborhood } from '../domain/neighborhood-types';
import type { Point } from '../domain/types';
import { streetArrival } from './street-opening';
export function doors(town: Neighborhood): { location: Location; name: string; point: Point }[] {
  const location = town.location;
  if (location.kind === 'street') return town.buildings.map(b => ({ location: { kind: 'interior', building: b.id, room: b.entry }, name: b.name, point: { x: plotStart(b.plot) + doorway.facade.x + doorway.facade.width / 2, y: doorway.facade.y + doorway.facade.height / 2 } }));
  const building = town.buildings.find(b => b.id === location.building)!;
  return location.room === building.entry ? [{ location: { kind: 'street' }, name: 'Rua', point: { x: doorway.interior.x + doorway.interior.width / 2, y: doorway.interior.y + doorway.interior.height / 2 } }] : [];
}
const interiorDoor = doorway.interior.x + doorway.interior.width / 2, facadeDoor = doorway.facade.x + doorway.facade.width / 2;
/** Whoever enters a house stands in front of its "Rua" door (they walk out of the doorway to here); another room, by its left side. */
export function destinationPoint(town: Neighborhood, destination: Location): Point {
  if (destination.kind === 'interior') return town.buildings.find(b => b.id === destination.building)?.entry === destination.room ? { x: interiorDoor, y: 480 } : { x: 160, y: 520 };
  const current = town.location;
  const building = current.kind === 'interior' ? town.buildings.find(b => b.id === current.building) : undefined;
  return { x: building ? streetArrival(town, building.plot) : 220, y: 520 };
}
export function doorAt(town: Neighborhood, point: Point) {
  const geometry = town.location.kind === 'street' ? doorway.facade : doorway.interior;
  return doors(town).find(d => Math.abs(d.point.x - point.x) <= geometry.width / 2 && Math.abs(d.point.y - point.y) <= geometry.height / 2);
}
/** Where the chosen character walks before going through the door to `destination` (the facade door on the street, the "Rua" door inside). */
export function doorFront(town: Neighborhood, destination: Location): Point {
  const building = destination.kind === 'interior' ? town.buildings.find(b => b.id === destination.building) : undefined;
  return building ? { x: plotStart(building.plot) + facadeDoor, y: doorway.facade.y + doorway.facade.height + 5 } : { x: interiorDoor, y: doorway.interior.y + doorway.interior.height + 22 };
}
/** The doorway sill someone arriving from `previous` walks out of, or null when this place has no such door. */
export function doorStep(town: Neighborhood, previous: Location): Point | null {
  const where = town.location;
  if (where.kind === 'interior') return town.buildings.find(b => b.id === where.building)!.entry === where.room ? { x: interiorDoor, y: doorway.interior.y + doorway.interior.height + 2 } : null;
  const from = previous.kind === 'interior' ? town.buildings.find(b => b.id === previous.building) : undefined;
  return from ? { x: plotStart(from.plot) + facadeDoor, y: Math.round(doorway.facade.y + doorway.facade.height + 1) } : null;
}
