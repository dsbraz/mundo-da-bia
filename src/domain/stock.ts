import { basics, stockLimit } from './ingredients';
import type { Basic, Ingredient, Stock } from './ingredients';
import type { Building, Neighborhood } from './neighborhood-types';

/** 4 of each basic: how every house starts (§3.4) and how an untouched one reads. */
export function fullStock(): Stock { return Object.fromEntries(basics.map(b => [b, stockLimit])); }
/** The pantry of `building`: absent means it never cooked, so it is full. */
export function stockOf(building: Pick<Building, 'stock'>): Stock { return building.stock ?? fullStock(); }
const isBasic = (id: Ingredient): id is Basic => (basics as readonly string[]).includes(id);
/** One of each basic in `bowl` is used up; the last one leaves the pantry (crops and specials are not the pantry's). */
export function takeStock(stock: Stock | undefined, bowl: readonly Ingredient[]): Stock {
  const next = { ...stock ?? fullStock() };
  for (const id of bowl.filter(isBasic)) { const left = (next[id] ?? 0) - 1; if (left > 0) next[id] = left; else delete next[id]; }
  return next;
}
/** Undo in Create brings old houses back but never refills a pantry: each house keeps the stock it has now. */
export function keepStock(next: Neighborhood, current: Neighborhood): Neighborhood['buildings'] {
  return next.buildings.map(b => {
    const now = current.buildings.find(c => c.id === b.id);
    if (!now) return b;
    const rest = { ...b }; delete rest.stock;
    return now.stock ? { ...rest, stock: now.stock } : rest;
  });
}
