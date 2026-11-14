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
/** Snacks read from the save (lot 6F): a whole number kept between 0 and 4; anything else was never counted (absent, read as 4). */
export function knownSnacks(value: unknown): number | undefined {
  return Number.isInteger(value) ? Math.max(0, Math.min(Number(value), stockLimit)) : undefined;
}
/** The building with only a pantry and a fridge this build knows. */
export function stocked<T extends Record<string, unknown>>(building: T): T {
  const { stock, snacks, ...rest } = building, known = knownStock(stock), left = knownSnacks(snacks);
  return { ...rest, ...(known ? { stock: known } : {}), ...(left === undefined ? {} : { snacks: left }) } as T;
}
