import { initialLayout, fixture } from '../domain/layout';
import { validLayout } from './layout-validation';
import { member, record } from './values';
import type { RecordValue } from './values';
import { actorIds, itemIds, lookIds, roomIds, seatIds, spots } from '../domain/types';
import type { Actor, Item, World } from '../domain/types';
import { seatPoint, spotKind } from '../domain/furniture';
import { validPoint } from '../domain/world';

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
  if (!validLayout(value.layout)) return false;
  if (!complete(value.actors, actorIds, actor) || !complete(value.items, itemIds, item)) return false;
  return consistentWorld(value as unknown as World);
}
function consistentWorld(value: World): boolean {
  const holders = value.items.map(i => i.holder).filter(id => id !== null);
  const occupied = value.actors.flatMap(a => a.seat ? [a.seat] : []);
  return new Set(holders).size === holders.length && new Set(occupied).size === occupied.length
    && value.actors.every(a => a.seat === null || seatPosition(value as unknown as World, a))
    && value.items.every(i => i.spot === 'floor' || fixture(value as unknown as World, spotKind(i.spot))?.room === i.room);
}
function seatPosition(state: World, actor: Actor): boolean {
  const point = seatPoint(state, actor.seat!);
  return !!point && actor.room === point.room && actor.x === point.x && actor.y === point.y;
}
function home(value: unknown): boolean {
  return record(value) && typeof value.lamp === 'boolean' && typeof value.fridge === 'boolean' && typeof value.drawer === 'boolean';
}
export function savedWorld(value: unknown): World | null {
  if (!record(value)) return null;
  if (value.version === 1) return legacyWorld(value.state);
  if (value.version === 2 && record(value.state)) {
    const state = { ...value.state, layout: initialLayout() };
    return validWorld(state) ? state : null;
  }
  if (value.version !== 3 || !validWorld(value.state)) return null;
  return value.state;
}
function legacyWorld(value: unknown): World | null {
  if (!record(value) || !Array.isArray(value.actors) || !Array.isArray(value.items)) return null;
  const state = {
    ...value, layout: initialLayout(), home: { lamp: true, fridge: true, drawer: false },
    actors: value.actors.map(a => record(a) ? { ...a, seat: null } : a),
    items: value.items.map(i => record(i) ? { ...i, spot: 'floor' } : i),
  };
  return validWorld(state) ? state : null;
}
function validSeat(value: unknown): boolean { return value === null || member(seatIds, value); }
function itemSpot(value: RecordValue): boolean {
  if (!member(spots, value.spot)) return false;
  if (value.spot === 'floor') return true;
  if (value.holder !== null) return false;
  return value.spot !== 'fridge' || value.id === 'lanche' || value.id === 'peixe';
}
