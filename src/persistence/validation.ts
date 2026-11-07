import { actorIds, itemIds, lookIds, roomIds, seatIds, spots } from '../domain/types';
import type { Actor, Item, World } from '../domain/types';
import { seats } from '../domain/furniture';
import { validPoint } from '../domain/world';

type RecordValue = Record<string, unknown>;
function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function member<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.some(id => id === value);
}
function position(value: RecordValue): boolean {
  return typeof value.x === 'number' && typeof value.y === 'number' && validPoint({ x: value.x, y: value.y });
}
function actor(value: unknown): value is Actor {
  if (!record(value) || !member(actorIds, value.id)) return false;
  const kind = actorIds.indexOf(value.id) < 4 ? 'human' : 'cat';
  return value.kind === kind && member(roomIds, value.room) && member(lookIds, value.look)
    && validSeat(value.seat)
    && typeof value.fed === 'boolean' && typeof value.resting === 'boolean' && position(value);
}
function item(value: unknown): value is Item {
  if (!record(value)) return false;
  return member(itemIds, value.id) && member(roomIds, value.room)
    && itemSpot(value)
    && (value.holder === null || member(actorIds, value.holder)) && position(value);
}
function complete<T extends { id: string }>(value: unknown, ids: readonly string[], check: (entry: unknown) => entry is T): value is T[] {
  return Array.isArray(value) && value.length === ids.length && value.every(check)
    && new Set(value.map(entry => entry.id)).size === ids.length;
}
export function validWorld(value: unknown): value is World {
  if (!record(value) || !member(roomIds, value.room) || typeof value.show !== 'boolean' || !home(value.home)) return false;
  if (!complete(value.actors, actorIds, actor) || !complete(value.items, itemIds, item)) return false;
  const holders = value.items.map(i => i.holder).filter(id => id !== null);
  const occupied = value.actors.flatMap(a => a.seat ? [a.seat] : []);
  return new Set(holders).size === holders.length && new Set(occupied).size === occupied.length
    && value.actors.every(a => a.seat === null || seatPosition(a));
}
function seatPosition(actor: Actor): boolean {
  const point = seats[actor.seat!];
  return actor.room === point.room && actor.x === point.x && actor.y === point.y;
}
function home(value: unknown): boolean {
  return record(value) && typeof value.lamp === 'boolean' && typeof value.fridge === 'boolean' && typeof value.drawer === 'boolean';
}
export function savedWorld(value: unknown): World | null {
  if (!record(value)) return null;
  if (value.version === 1) return legacyWorld(value.state);
  if (value.version !== 2 || !validWorld(value.state)) return null;
  return value.state;
}
function legacyWorld(value: unknown): World | null {
  if (!record(value) || !Array.isArray(value.actors) || !Array.isArray(value.items)) return null;
  const state = {
    ...value, home: { lamp: true, fridge: true, drawer: false },
    actors: value.actors.map(a => record(a) ? { ...a, seat: null } : a),
    items: value.items.map(i => record(i) ? { ...i, spot: 'floor' } : i),
  };
  return validWorld(state) ? state : null;
}
function validSeat(value: unknown): boolean { return value === null || member(seatIds, value); }
function itemSpot(value: RecordValue): boolean {
  if (!member(spots, value.spot)) return false;
  if (value.spot === 'floor') return true;
  if (value.room !== 'sala' || value.holder !== null) return false;
  return value.spot !== 'fridge' || value.id === 'lanche' || value.id === 'peixe';
}
