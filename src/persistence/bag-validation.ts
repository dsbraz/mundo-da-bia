import { bagLimit, goodIds } from '../domain/market';
import { member, record } from './values';

/** A bag read from the save (§4): unknown goods drop out, past 6 the rest drops out, a ribbon that is not yes or no is no ribbon;
 *  any other object loses the bag's fields. */
function knownBag(item: unknown): unknown {
  if (!record(item)) return item;
  const { contents, paid, ...rest } = item;
  if (item.kind !== 'sacola') return rest;
  return { ...rest, contents: Array.isArray(contents) ? contents.filter(good => member(goodIds, good)).slice(0, bagLimit) : [], paid: paid === true };
}
/** The saved objects with only bags this build knows; an empty bag on the floor is gone (an empty one in hand stays). */
export function knownBags(items: unknown): unknown {
  if (!Array.isArray(items)) return items;
  return items.map(knownBag).filter(item => !record(item) || item.kind !== 'sacola' || (item.contents as unknown[]).length > 0 || item.holder !== null);
}
/** Only a bag has contents (up to 6 known goods) and a paid ribbon, and a bag always has both. */
export function validBag(value: Record<string, unknown>): boolean {
  if (value.kind !== 'sacola') return value.contents === undefined && value.paid === undefined;
  const { contents } = value;
  return Array.isArray(contents) && contents.length <= bagLimit && contents.every(good => member(goodIds, good)) && typeof value.paid === 'boolean';
}
