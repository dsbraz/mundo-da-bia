import { actorIds, itemIds, lookIds, roomIds } from '../domain/types';
import type { Actor, Item, World } from '../domain/types';
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
    && typeof value.fed === 'boolean' && typeof value.resting === 'boolean' && position(value);
}
function item(value: unknown): value is Item {
  if (!record(value)) return false;
  return member(itemIds, value.id) && member(roomIds, value.room)
    && (value.holder === null || member(actorIds, value.holder)) && position(value);
}
function complete<T extends { id: string }>(value: unknown, ids: readonly string[], check: (entry: unknown) => entry is T): value is T[] {
  return Array.isArray(value) && value.length === ids.length && value.every(check)
    && new Set(value.map(entry => entry.id)).size === ids.length;
}
export function validWorld(value: unknown): value is World {
  if (!record(value) || !member(roomIds, value.room) || typeof value.show !== 'boolean') return false;
  if (!complete(value.actors, actorIds, actor) || !complete(value.items, itemIds, item)) return false;
  const holders = value.items.map(i => i.holder).filter(id => id !== null);
  return new Set(holders).size === holders.length;
}
export function savedWorld(value: unknown): World | null {
  if (!record(value) || value.version !== 1 || !validWorld(value.state)) return null;
  return value.state;
}
