import { doorway } from './door-geometry';
import { plotStart } from '../domain/neighborhood-geometry';
import type { Location, Neighborhood } from '../domain/neighborhood-types';
import type { Point } from '../domain/types';
export function doors(town: Neighborhood): { location: Location; name: string; point: Point }[] {
  const location = town.location;
  if (location.kind === 'street') return town.buildings.map(b => ({ location: { kind: 'interior', building: b.id, room: b.entry }, name: b.name, point: { x: plotStart(b.plot) + doorway.facade.x + doorway.facade.width / 2, y: doorway.facade.y + doorway.facade.height / 2 } }));
  const building = town.buildings.find(b => b.id === location.building)!;
  return location.room === building.entry ? [{ location: { kind: 'street' }, name: 'Rua', point: { x: doorway.interior.x + doorway.interior.width / 2, y: doorway.interior.y + doorway.interior.height / 2 } }] : [];
}
export function destinationPoint(town: Neighborhood, destination: Location): Point {
  if (destination.kind === 'interior') return { x: 160, y: 520 };
  const current = town.location;
  const building = current.kind === 'interior' ? town.buildings.find(b => b.id === current.building) : undefined;
  return { x: building ? plotStart(building.plot) + 220 : 220, y: 520 };
}
export function doorAt(town: Neighborhood, point: Point) {
  const geometry = town.location.kind === 'street' ? doorway.facade : doorway.interior;
  return doors(town).find(d => Math.abs(d.point.x - point.x) <= geometry.width / 2 && Math.abs(d.point.y - point.y) <= geometry.height / 2);
}
