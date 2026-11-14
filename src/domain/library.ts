import type { Actor, ActorId, ItemId, PresentationEvent, Transition, World } from './types';
import type { Loan, Neighborhood, NeighborhoodItem } from './neighborhood-types';
import { consumeItem, spawnItem } from './portable';
import { itemKind } from './item-kind';
import { sameLocation } from './location';
import { seatPiece } from './seats';
import { needsOf, relieve } from './needs';

/** A bookcase lends 3 books (lot 8C), each with its own cover (the slot): one out leaves its gap on the shelf. */
export const loanSlots = 3;
/** Taken, given back, nothing to do, or her hands are full. */
export type Lent = { town: Neighborhood; outcome: 'took' | 'returned' | 'none' | 'hands' };
const none = (town: Neighborhood): Lent => ({ town, outcome: 'none' });
const lentBy = (item: NeighborhoodItem, building: number, piece: number) => item.kind === 'livro' && item.loan?.building === building && item.loan.piece === piece;
/** The covers of the bookcase `piece` of `building` that are out (in a hand, on a floor, at home), in slot order. */
export function booksOut(town: Neighborhood, building: number, piece: number): number[] {
  return town.items.filter(i => lentBy(i, building, piece)).map(i => i.loan!.slot).sort((a, b) => a - b);
}
/** The bookcase `piece` in the room on screen, with its building. */
function shelfHere(town: Neighborhood, piece: number) {
  const where = town.location;
  if (where.kind !== 'interior') return null;
  const found = town.buildings.find(b => b.id === where.building)?.layout.pieces.find(p => p.id === piece && p.room === where.room && p.kind === 'bookcase');
  return found ? { building: where.building, piece } : null;
}
/** The bookcase tapped (lot 8C): a book in her hand goes back; free hands take the next cover; anything else in hand is refused. With all
 *  of its books out, the ones nobody holds come back to the shelf first, so a bookcase never stays empty. */
export function borrow(town: Neighborhood, actor: ActorId, piece: number): Lent {
  const shelf = shelfHere(town, piece), who = town.actors.find(a => a.id === actor);
  if (!shelf || !who || !sameLocation(who.location, town.location)) return none(town);
  const held = town.items.find(i => i.holder === actor);
  if (held) return held.kind === 'livro' ? { town: consumeItem(town, held.id), outcome: 'returned' } : { town, outcome: 'hands' };
  const stocked = booksOut(town, shelf.building, piece).length < loanSlots ? town
    : { ...town, items: town.items.filter(i => !lentBy(i, shelf.building, piece) || i.holder) };
  const slot = [...Array(loanSlots).keys()].find(s => !booksOut(stocked, shelf.building, piece).includes(s));
  if (slot === undefined) return none(town);
  const spawned = spawnItem(stocked, { kind: 'livro', location: who.location, point: { x: who.x, y: who.y } }), id = spawned.items.at(-1)!.id;
  const loan: Loan = { ...shelf, slot };
  return { town: { ...spawned, items: spawned.items.map(i => i.id === id ? { ...i, holder: actor, loan } : i) }, outcome: 'took' };
}
/** A book let go over a bookcase in the room on screen goes back to the library (any bookcase takes any book). */
export function shelve(town: Neighborhood, item: ItemId, piece: number): Lent {
  const book = town.items.find(i => i.id === item && i.kind === 'livro');
  if (!book || !shelfHere(town, piece) || !sameLocation(book.location, town.location)) return none(town);
  return { town: consumeItem(town, item), outcome: 'returned' };
}
/** Reading: a person sitting up (not lying down asleep, not on the toilet) with a book in hand. */
export function reading(world: World, actor: Actor): boolean {
  if (actor.kind !== 'human' || actor.resting || !actor.seat) return false;
  const kind = seatPiece(world, actor.seat, actor.room)?.kind;
  return !!kind && kind !== 'toilet' && world.items.some(i => i.holder === actor.id && itemKind(i) === 'livro');
}
/** Who reads in the room on screen. */
export const readers = (world: World): ActorId[] => world.actors.filter(a => a.room === world.room && reading(world, a)).map(a => a.id);
/** Whoever starts reading with this step (she sat down with a book, or was handed one sitting) is a little less bored (−30) and says a
 *  reading line instead of the sitting or the taking one. */
export function startReading(before: World, result: Transition): Transition {
  const was = (id: ActorId) => { const a = before.actors.find(x => x.id === id); return !!a && reading(before, a); };
  const started = result.state.actors.filter(a => reading(result.state, a) && !was(a.id)).map(a => a.id);
  if (!started.length) return result;
  const quiet = (e: PresentationEvent) => !(e.actor && started.includes(e.actor) && ['rested', 'picked'].includes(e.type));
  return {
    state: { ...result.state, actors: result.state.actors.map(a => started.includes(a.id) ? { ...a, needs: relieve(needsOf(a), 'leitura') } : a) },
    events: [...result.events.filter(quiet), ...started.map(actor => ({ type: 'read' as const, actor }))],
  };
}
