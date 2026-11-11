import { initialProgress, nextItemAfter } from '../domain/progress';
import { buildingModels } from '../domain/neighborhood-types';
import type { LegacyNeighborhood, Neighborhood } from '../domain/neighborhood-types';
import { itemIds, lookIds, pieceKinds, roomTemplates, seatIds } from '../domain/types';
import { member, record } from './values';
import { knownPlant } from './progress-validation';

/** v2 → v3: the same neighborhood, with the starting progress and item numbering after its items. */
export function upgradeToV3(town: LegacyNeighborhood): Neighborhood {
  return { ...town, progress: initialProgress(), nextItem: nextItemAfter(town.items) };
}
const itemKinds = [...itemIds, 'bola'];
/** Unknown looks become the default one and objects of unknown kinds drop out (whoever held them is left empty-handed). */
export function knownContent(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.actors) || !Array.isArray(value.items)) return value;
  const unknown = (entry: unknown, field: string, known: readonly string[]) => record(entry) && !member(known, entry[field]);
  return { ...value, actors: value.actors.map(a => unknown(a, 'look', lookIds) ? { ...a, look: 'sol' } : a),
    items: value.items.filter(i => !unknown(i, 'kind', itemKinds)) };
}
/** Save v3: rebuilt with only known fields, and what this build does not know drops out alone; structure is left for validation. */
export function knownTown(value: unknown): unknown {
  if (!record(value)) return value;
  const { outdoor, buildings, actors, items, location, plots, nextBuilding } = value;
  return seated(knownContent({ outdoor, buildings: Array.isArray(buildings) ? buildings.map(knownBuilding) : buildings, actors, items, location, plots, nextBuilding }));
}
function knownBuilding(value: unknown): unknown {
  if (!record(value) || !record(value.layout)) return value;
  const { rooms, pieces } = value.layout;
  return { ...value, model: member(buildingModels, value.model) ? value.model : 'house',
    layout: { ...value.layout, rooms: record(rooms) ? Object.fromEntries(Object.entries(rooms).map(([id, room]) => [id, knownTemplate(room)])) : rooms,
      pieces: Array.isArray(pieces) ? pieces.filter(p => !record(p) || member(pieceKinds, p.kind)).map(knownPiece) : pieces } };
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
/** A seat this build does not know belonged to a piece that dropped out: whoever sat there stands where they were. */
function seated(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.actors)) return value;
  return { ...value, actors: value.actors.map(a => record(a) && a.seat !== null && !member(seatIds, a.seat) ? { ...a, seat: null } : a) };
}
