import { keepsakeIds } from '../domain/progress';
import { member, record } from './values';

/** A lesson's paper read from the save (Bia's request): one with no known theme drops out (it is still in the collection); any other
 *  object loses the field. */
export function knownPapers(items: unknown): unknown {
  if (!Array.isArray(items)) return items;
  return items.filter(i => !record(i) || i.kind !== 'papel' || member(keepsakeIds, i.paper)).map(i => {
    if (!record(i) || i.kind === 'papel' || !Object.hasOwn(i, 'paper')) return i;
    const rest = { ...i }; delete rest.paper; return rest;
  });
}
/** Only a paper has a theme, and a paper always has a known one. */
export function validPaper(value: Record<string, unknown>): boolean {
  return value.kind === 'papel' ? member(keepsakeIds, value.paper) : value.paper === undefined;
}
