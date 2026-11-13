import { basics, stockLimit } from '../domain/ingredients';
import type { Stock } from '../domain/ingredients';
import { record } from './values';

/** A pantry read from the save (§4): unknown keys and amounts of 0 or less drop out, more than 4 becomes 4; anything that is not a
 *  record is no pantry at all (absent, read as full). An empty record stays empty. */
export function knownStock(value: unknown): Stock | undefined {
  if (!record(value)) return undefined;
  return Object.fromEntries(basics.flatMap(id => {
    const amount = value[id];
    return Number.isInteger(amount) && Number(amount) > 0 ? [[id, Math.min(Number(amount), stockLimit)]] : [];
  }));
}
/** The building with only a pantry this build knows. */
export function stocked<T extends Record<string, unknown>>(building: T): T {
  const { stock, ...rest } = building, known = knownStock(stock);
  return (known ? { ...rest, stock: known } : rest) as T;
}
