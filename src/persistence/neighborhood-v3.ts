import { initialProgress, nextItemAfter, recipeIds } from '../domain/progress';
import { buildingModels } from '../domain/neighborhood-types';
import type { LegacyNeighborhood, Neighborhood } from '../domain/neighborhood-types';
import { lookIds, pieceKinds, roomTemplates } from '../domain/types';
import { seatedTown } from './seats';
import { itemKinds } from '../domain/item-kind';
import { member, record } from './values';
import { knownPlant } from './progress-validation';
import { knownCast } from './cast';
import { stocked } from './stock-validation';
import { knownBags } from './bag-validation';

/** v2 → v3: the same neighborhood, with the starting progress and item numbering after its items. The old flowerbed's `watered`
 *  became the four plots and no longer counts: it stays in the save (earlier v3 builds require it) and is always false (§4.3). */
export function upgradeToV3(town: LegacyNeighborhood): Neighborhood {
  return { ...unwatered(town), progress: initialProgress(), nextItem: nextItemAfter(town.items) };
}
/** Without the session's needs (§3.1) and a grown-up's work shift (W3L-25), which are never saved nor loaded. */
export function unfelt<T>(actor: T): T {
  if (!record(actor) || (!Object.hasOwn(actor, 'needs') && !Object.hasOwn(actor, 'work'))) return actor;
  const rest = { ...actor }; delete rest.needs; delete rest.work; return rest as T;
}
export const unwatered = <T extends LegacyNeighborhood>(town: T): T => ({ ...town, outdoor: { ...town.outdoor, watered: false } });
/** Unknown looks become the default one; objects of unknown kinds and dishes of unknown recipes drop out (whoever held them is left empty-handed);
 *  seats are read (W3L-06: old ids converted, unknown ones null); the cast is this build's (W3L-18, `cast.ts`). */
export function knownContent(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.actors) || !Array.isArray(value.items)) return value;
  const unknown = (entry: unknown, field: string, known: readonly string[]) => record(entry) && !member(known, entry[field]);
  return seatedTown(knownCast({ ...value, actors: value.actors.map(a => unknown(a, 'look', lookIds) ? { ...a, look: 'sol' } : a),
    items: knownBags(value.items.filter(i => !unknown(i, 'kind', itemKinds) && !(record(i) && i.kind === 'prato' && !member(recipeIds, i.recipe)))) }));
}
/** Save v3: rebuilt with only known fields, and what this build does not know drops out alone; structure is left for validation. */
export function knownTown(value: unknown): unknown {
  if (!record(value)) return value;
  const { outdoor, buildings, actors, items, location, plots, nextBuilding } = value;
  return knownContent({ outdoor, buildings: Array.isArray(buildings) ? buildings.map(knownBuilding) : buildings,
    actors: Array.isArray(actors) ? actors.map(unfelt) : actors, items, location, plots, nextBuilding });
}
function knownBuilding(value: unknown): unknown {
  if (!record(value) || !record(value.layout)) return value;
  const { rooms, pieces } = value.layout;
  return stocked({ ...value, model: member(buildingModels, value.model) ? value.model : 'house',
    layout: { ...value.layout, rooms: record(rooms) ? Object.fromEntries(Object.entries(rooms).map(([id, room]) => [id, knownTemplate(room)])) : rooms,
      pieces: Array.isArray(pieces) ? pieces.filter(p => !record(p) || member(pieceKinds, p.kind)).map(knownPiece) : pieces } });
}
function knownTemplate(room: unknown): unknown {
  return record(room) && !member(roomTemplates, room.template) ? { ...room, template: 'empty' } : room;
}
/** A plant stays only on a planter and only when this build knows it. */
function knownPiece(piece: unknown): unknown {
  if (!record(piece) || !Object.hasOwn(piece, 'plant')) return piece;
  const { plant, ...rest } = piece, known = piece.kind === 'planter' ? knownPlant(plant) : null;
  return known ? { ...rest, plant: known } : rest;
}
