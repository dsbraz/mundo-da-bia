import { localWorld } from '../domain/neighborhood';
import type { Building, Location, Neighborhood } from '../domain/neighborhood-types';
import { buildingModels } from '../domain/neighborhood-types';
import { actorIds, itemIds, paletteIds } from '../domain/types';
import { sameLocation, validLocation } from '../domain/location';
import { member, positiveId, record, roomId } from './values';
import { validLayout } from './layout-validation';
import { actor, item, consistentWorld } from './validation';
export function encodeNeighborhood(town: Neighborhood) { return JSON.stringify({ version: 1, town }); }
export function decodeNeighborhood(raw: string | null): Neighborhood | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!record(value) || value.version !== 1 || !validTown(value.town)) return null;
    return value.town;
  } catch { return null; }
}
function location(value: unknown): value is Location {
  if (!record(value)) return false;
  return value.kind === 'street' || (value.kind === 'interior' && positiveId(value.building) && roomId(value.room));
}
function building(value: unknown): value is Building {
  if (!record(value) || !positiveId(value.id) || !validLayout(value.layout)) return false;
  return typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 48
    && member(buildingModels, value.model) && member(paletteIds, value.color)
    && buildingPosition(value, value.layout);
}
function buildingPosition(value: Record<string, unknown>, layout: Building['layout']) {
  return Number.isInteger(value.plot) && Number(value.plot) >= 0 && roomId(value.entry) && Object.hasOwn(layout.rooms, value.entry) && typeof value.show === 'boolean';
}
function resident(value: unknown): boolean {
  return record(value) && location(value.location) && actor({ ...value, x: 500 }) && typeof value.x === 'number' && Number.isFinite(value.x);
}
function object(value: unknown): boolean {
  if (!record(value) || !location(value.location) || !member(itemIds, value.kind)) return false;
  return typeof value.id === 'string' && /^[1-9]\d*:(lanche|peixe|microfone|ursinho)$/.test(value.id)
    && item({ ...value, id: value.kind, x: 500 }) && typeof value.x === 'number' && Number.isFinite(value.x);
}
function unique(values: unknown[]): boolean { return new Set(values).size === values.length; }
function validTown(value: unknown): value is Neighborhood {
  if (!record(value) || !Array.isArray(value.buildings) || !value.buildings.length || !value.buildings.every(building)) return false;
  if (!validEntities(value)) return false;
  if (!townHeader(value)) return false;
  const town = value as unknown as Neighborhood;
  return identities(town) && consistent(town) && furnitureConsistent(town);
}
function identities(town: Neighborhood) {
  return unique(town.buildings.map(b => b.id)) && unique(town.buildings.map(b => b.plot))
    && unique(town.actors.map(a => a.id)) && unique(town.items.map(i => i.id));
}
function consistent(town: Neighborhood): boolean {
  if (!validLocation(town, town.location) || !town.buildings.every(b => b.id < town.nextBuilding && b.plot < town.plots)) return false;
  const entities = [...town.actors, ...town.items];
  if (!entities.every(e => validLocation(town, e.location) && validPosition(town, e))) return false;
  const held = town.items.filter(i => i.holder);
  return unique(held.map(i => i.holder)) && held.every(i => {
    const holder = town.actors.find(a => a.id === i.holder);
    return !!holder && sameLocation(holder.location, i.location) && i.spot === 'floor';
  });
}
function validPosition(town: Neighborhood, entity: { x: number; room: string; location: Location }): boolean {
  const where = entity.location;
  if (where.kind === 'street') return entity.room === 'sala' && entity.x >= 60 && entity.x <= town.plots * 440 - 60;
  const room = town.buildings.find(b => b.id === where.building)!.layout.rooms[where.room]!;
  return entity.room === where.room && entity.x >= 60 && entity.x <= { small: 1000, medium: 1200, large: 1400 }[room.size] - 60;
}

function validEntities(value: Record<string, unknown>) {
  return Array.isArray(value.actors) && value.actors.length === actorIds.length && value.actors.every(resident)
    && Array.isArray(value.items) && value.items.every(object);
}
function townHeader(value: Record<string, unknown>) {
  return positiveId(value.nextBuilding) && positiveId(value.plots) && value.plots >= 4 && value.plots % 2 === 0 && location(value.location);
}

function furnitureConsistent(town: Neighborhood): boolean {
  if (town.actors.some(a => a.location.kind === 'street' && a.seat !== null)) return false;
  if (town.items.some(i => i.location.kind === 'street' && i.spot !== 'floor')) return false;
  return town.buildings.every(b => {
    const world = localWorld({ ...town, location: { kind: 'interior', building: b.id, room: b.entry } });
    return consistentWorld({ ...world, actors: world.actors.filter(a => a.room !== 'room-0') });
  });
}
