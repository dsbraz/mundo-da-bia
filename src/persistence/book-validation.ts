import { loanSlots } from '../domain/library';
import { record } from './values';

const positive = (value: unknown) => Number.isInteger(value) && Number(value) > 0;
/** A loan names a building and a bookcase by id, and one of its 3 places. */
function loan(value: unknown): boolean {
  return record(value) && positive(value.building) && positive(value.piece) && Number.isInteger(value.slot) && Number(value.slot) >= 0 && Number(value.slot) < loanSlots;
}
/** A book read from the save (lot 8C): a broken loan is forgotten (the book stays, belonging to no bookcase); any other object loses it. */
function knownLoan(item: unknown): unknown {
  if (!record(item) || !Object.hasOwn(item, 'loan') || (item.kind === 'livro' && loan(item.loan))) return item;
  const rest = { ...item }; delete rest.loan; return rest;
}
/** The saved objects with only loans this build knows. */
export function knownLoans(items: unknown): unknown { return Array.isArray(items) ? items.map(knownLoan) : items; }
/** Only a book has a loan, and a loan is always whole. */
export function validLoan(value: Record<string, unknown>): boolean {
  return value.loan === undefined || (value.kind === 'livro' && loan(value.loan));
}
