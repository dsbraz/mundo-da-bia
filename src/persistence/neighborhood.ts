import { validOutdoor } from './outdoor-validation';
import { upgradeNeighborhood } from './neighborhood-upgrade';
import { plotWidth, streetWidth } from '../domain/neighborhood-geometry';
import { localWorld } from '../domain/neighborhood';
import type { Building, LegacyNeighborhood, Location, Neighborhood } from '../domain/neighborhood-types';
import { buildingModels } from '../domain/neighborhood-types';
import { paletteIds } from '../domain/types';
import { itemKinds } from '../domain/item-kind';
import { sameLocation, validLocation } from '../domain/location';
import { nextItemAfter, recipeIds } from '../domain/progress';
import { member, positiveId, record, roomId } from './values';
import { knownContent, knownTown, unfelt, unwatered, upgradeToV3 } from './neighborhood-v3';
import { knownProgress } from './progress-validation';
import { validLayout } from './layout-validation';
import { actor, portable, consistentWorld } from './validation';
import { validBag } from './bag-validation';
/** The session's needs (§3.1) never reach the save: the bytes are the same with or without them. */
export function encodeNeighborhood(town: Neighborhood) { return JSON.stringify({ version: 3, town: { ...town, actors: town.actors.map(unfelt) } }); }
/** Envelopes v1 and v2 (upgraded to v3) and v3; null when the structure is not valid. */
export function decodeNeighborhood(raw: string | null): Neighborhood | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!record(value)) return null;
    if (value.version === 3) return decodeV3(value.town);
    if (value.version !== 1 && value.version !== 2) return null;
    const town = knownContent(value.town);
    if (!validTown(town) || !validVersion(town, value.version)) return null;
    return upgradeToV3(value.version === 1 ? upgradeNeighborhood(town) : town);
  } catch { return null; }
}
function decodeV3(value: unknown): Neighborhood | null {
  const town = knownTown(value);
  if (!record(value) || !validTown(town) || !validVersion(town, 3)) return null;
  const first = nextItemAfter(town.items);
  return { ...unwatered(town), progress: knownProgress(value.progress), nextItem: positiveId(value.nextItem) && value.nextItem >= first ? value.nextItem : first };
}
function validVersion(town: LegacyNeighborhood, version: number) {
  if (version === 1) return [...town.actors, ...town.items].every(entity => entity.location.kind !== 'street' || entity.x <= town.plots * plotWidth - 60);
  return validOutdoor(town) && town.buildings.every(b => b.layout.rooms[b.entry]!.cell === 0);
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
  if (!record(value) || !location(value.location) || !member(itemKinds, value.kind)) return false;
  return typeof value.id === 'string' && /^[1-9]\d*:[a-z]+$/.test(value.id) && value.id.slice(value.id.indexOf(':') + 1) === value.kind
    && dish(value) && portable({ ...value, x: 500 }) && typeof value.x === 'number' && Number.isFinite(value.x);
}
/** Only a dish names a recipe (always a known one) and only a dish may be fancy; only a bag has contents and a ribbon (W3L-22). */
function dish(value: Record<string, unknown>): boolean {
  const isDish = value.kind === 'prato';
  return (isDish ? member(recipeIds, value.recipe) : value.recipe === undefined) && (value.fancy === undefined || (isDish && value.fancy === true)) && validBag(value);
}
function unique(values: unknown[]): boolean { return new Set(values).size === values.length; }
function validTown(value: unknown): value is LegacyNeighborhood {
  if (!record(value) || !Array.isArray(value.buildings) || !value.buildings.length || !value.buildings.every(building)) return false;
  if (!validEntities(value)) return false;
  if (!townHeader(value)) return false;
  const town = value as unknown as LegacyNeighborhood;
  return identities(town) && consistent(town) && furnitureConsistent(town);
}
function identities(town: LegacyNeighborhood) {
  return unique(town.buildings.map(b => b.id)) && unique(town.buildings.map(b => b.plot))
    && unique(town.actors.map(a => a.id)) && unique(town.items.map(i => i.id));
}
function consistent(town: LegacyNeighborhood): boolean {
  if (!validLocation(town, town.location) || !town.buildings.every(b => b.id < town.nextBuilding && b.plot < town.plots)) return false;
  const entities = [...town.actors, ...town.items];
  if (!entities.every(e => validLocation(town, e.location) && validPosition(town, e))) return false;
  const held = town.items.filter(i => i.holder);
  return unique(held.map(i => i.holder)) && held.every(i => {
    const holder = town.actors.find(a => a.id === i.holder);
    return !!holder && sameLocation(holder.location, i.location) && i.spot === 'floor';
  });
}
function validPosition(town: LegacyNeighborhood, entity: { x: number; room: string; location: Location }): boolean {
  const where = entity.location;
  if (where.kind === 'street') return entity.room === 'sala' && entity.x >= 60 && entity.x <= streetWidth(town.plots) - 60;
  const room = town.buildings.find(b => b.id === where.building)!.layout.rooms[where.room]!;
  return entity.room === where.room && entity.x >= 60 && entity.x <= { small: 1000, medium: 1200, large: 1400 }[room.size] - 60;
}

function validEntities(value: Record<string, unknown>) {
  return Array.isArray(value.actors) && value.actors.every(resident)
    && Array.isArray(value.items) && value.items.every(object);
}
function townHeader(value: Record<string, unknown>) {
  return positiveId(value.nextBuilding) && positiveId(value.plots) && value.plots >= 4 && value.plots % 2 === 0 && location(value.location);
}

function furnitureConsistent(town: LegacyNeighborhood): boolean {
  if (town.actors.some(a => a.location.kind === 'street' && a.seat !== null)) return false;
  if (town.items.some(i => i.location.kind === 'street' && i.spot !== 'floor')) return false;
  return town.buildings.every(b => {
    const world = localWorld({ ...town, location: { kind: 'interior', building: b.id, room: b.entry } });
    return consistentWorld({ ...world, actors: world.actors.filter(a => a.room !== 'room-0') });
  });
}
