import { basics, stockLimit } from './ingredients';
import type { Basic, Stock } from './ingredients';
import type { SpecialId } from './progress';
import type { ActorId, CropId, Layout, Piece, PieceKind, RoomId } from './types';
import type { Building, MarketAction, Neighborhood, NeighborhoodAction, NeighborhoodItem } from './neighborhood-types';
import { consumeItem, spawnItem } from './portable';
import { stockOf } from './stock';

import type { Good } from './goods';
export type { Good, Seed } from './goods';
export { goodIds, seedGoods } from './goods';
/** The 3 shelf drawings (§3.4): bakery and dairy, greengrocer and oil, specials and seeds (only what has been revealed). */
const designs: readonly (readonly Good[])[] = [['pao', 'leite', 'queijo', 'ovo', 'farinha', 'acucar'], ['batata', 'oleo', 'peixe'], []];
const shelves = (layout: Layout, room: RoomId) => layout.pieces.filter(p => p.room === room && p.kind === 'market-shelf').sort((a, b) => a.id - b.id);
/** The pieces that make a market: tapped, the shelf opens its goods and the checkout beeps. */
export const marketKinds: readonly PieceKind[] = ['market-shelf', 'checkout'];
/** A place is what it holds (§3.4): a room with a market shelf and a checkout is a market, in any building. */
export function isMarket(layout: Layout, room: RoomId): boolean {
  return shelves(layout, room).length > 0 && layout.pieces.some(p => p.room === room && p.kind === 'checkout');
}
/** Whether any room of the neighborhood is a market (otherwise an empty pantry points to the Mercado card). */
export function hasMarket(town: Neighborhood): boolean { return town.buildings.some(b => hasMarketRoom(b.layout)); }
/** Whether a room of this building is a market (its facade gets the market awning). */
export function hasMarketRoom(layout: Layout): boolean { return Object.keys(layout.rooms).some(room => isMarket(layout, room as RoomId)); }
/** Which drawing a shelf has: the shelves of a room take turns, in the order they were added. */
export function shelfDesign(layout: Layout, piece: Piece): number { return shelves(layout, piece.room).findIndex(p => p.id === piece.id) % 3; }
/** What `piece` sells: its drawing's goods; `revealed` goes on the specials shelves, or on the room's last shelf when it has none. */
export function marketGoods(layout: Layout, piece: Piece, revealed: readonly Good[] = []): Good[] {
  const row = shelves(layout, piece.room), index = row.findIndex(p => p.id === piece.id);
  if (index < 0) return [];
  const specials = row.length > 2 ? index % 3 === 2 : index === row.length - 1;
  return [...designs[index % 3]!, ...(specials ? revealed : [])];
}

/** A bag holds up to 6 goods (§3.4): its icons, never a number. */
export const bagLimit = 6;
type Outcome = { kind: 'bagged' | 'full' | 'paid' | 'none' } | { kind: 'stored'; left: number } | { kind: 'missing'; need: 'hands' | 'checkout' };
export type Shopped = { town: Neighborhood; outcome: Outcome };
type Bag = NeighborhoodItem & { contents: Good[]; paid: boolean };
const none = (town: Neighborhood): Shopped => ({ town, outcome: { kind: 'none' } });
const isBag = (item: NeighborhoodItem | undefined): item is Bag => item?.kind === 'sacola';
const heldBy = (town: Neighborhood, actor: ActorId) => town.items.find(i => i.holder === actor);
const patch = (town: Neighborhood, id: string, change: Partial<Bag>): Neighborhood => ({ ...town, items: town.items.map(i => i.id === id ? { ...i, ...change } : i) });
/** Where `actor` stands, as a building and room, or nothing out on the street. */
function standing(town: Neighborhood, actor: ActorId): { building: Building; room: RoomId } | null {
  const where = town.actors.find(a => a.id === actor)?.location;
  return where?.kind === 'interior' ? { building: town.buildings.find(b => b.id === where.building)!, room: where.room } : null;
}
function marketRoom(town: Neighborhood, actor: ActorId) {
  const at = standing(town, actor);
  return at && isMarket(at.building.layout, at.room) ? at : null;
}
/** A tap on a good of a shelf (W3L-22): it hops into the bag in her hand, or into a new bag when her hands are free; the 7th does not fit. */
export function buy(town: Neighborhood, action: { actor: ActorId; piece: number; good: Good }): Shopped {
  const at = marketRoom(town, action.actor), shelf = at?.building.layout.pieces.find(p => p.id === action.piece && p.room === at.room);
  if (!at || !shelf || !marketGoods(at.building.layout, shelf, town.progress.shelves).includes(action.good)) return none(town);
  const hand = heldBy(town, action.actor);
  if (hand && !isBag(hand)) return { town, outcome: { kind: 'missing', need: 'hands' } };
  if (hand) return hand.contents.length >= bagLimit ? { town, outcome: { kind: 'full' } } : { town: patch(town, hand.id, { contents: [...hand.contents, action.good], paid: false }), outcome: { kind: 'bagged' } };
  const who = town.actors.find(a => a.id === action.actor)!;
  const spawned = spawnItem(town, { kind: 'sacola', location: who.location, point: { x: who.x, y: who.y } });
  return { town: patch(spawned, spawned.items.at(-1)!.id, { holder: action.actor, contents: [action.good], paid: false }), outcome: { kind: 'bagged' } };
}
/** At the market's checkout, beep beep: the bag in her hand gets the paid ribbon. No money, ever. */
export function checkout(town: Neighborhood, actor: ActorId): Shopped {
  const hand = heldBy(town, actor);
  return marketRoom(town, actor) && isBag(hand) ? { town: patch(town, hand.id, { paid: true }), outcome: { kind: 'paid' } } : none(town);
}
/** Leaving the market's building with a bag that did not go through the checkout is refused: the bubble shows the checkout. */
export function unpaidExit(town: Neighborhood, action: Extract<NeighborhoodAction, { type: 'transport' }>): Outcome | null {
  const bag = action.actor ? heldBy(town, action.actor) : town.items.find(i => i.id === action.item);
  if (!isBag(bag) || bag.paid) return null;
  const from = bag.location, to = action.location;
  return from.kind === 'interior' && to.kind === 'interior' && from.building === to.building ? null : { kind: 'missing', need: 'checkout' };
}
const isBasic = (good: Good): good is Basic => (basics as readonly string[]).includes(good);
/** One more of a basic, up to 4; false when the pantry already has 4. */
function shelve(stock: Stock, good: Basic): boolean {
  if ((stock[good] ?? 0) >= stockLimit) return false;
  stock[good] = (stock[good] ?? 0) + 1; return true;
}
/** Goods put away at home: basics fill the pantry up to 4 each, specials and seeds are gained for good; what did not fit comes back.
 *  Lot 5's grown-ups bring groceries home through here, without a bag. */
export function storeGoods(town: Neighborhood, building: number, goods: readonly Good[]): { town: Neighborhood; left: Good[] } {
  const house = town.buildings.find(b => b.id === building);
  if (!house) return { town, left: [...goods] };
  const stock = { ...stockOf(house) }, left: Good[] = [];
  let { specials, seeds } = town.progress, shelved = false;
  for (const good of goods) {
    if (!isBasic(good)) { if (good.startsWith('semente-')) seeds = gain(seeds, good.slice(8) as CropId); else specials = gain(specials, good as SpecialId); continue; }
    if (shelve(stock, good)) shelved = true; else left.push(good);
  }
  const buildings = shelved ? town.buildings.map(b => b === house ? { ...b, stock } : b) : town.buildings;
  return { town: { ...town, buildings, progress: { ...town.progress, specials, seeds } }, left };
}
const gain = <T>(list: readonly T[], id: T): T[] => list.includes(id) ? [...list] : [...list, id];
/** The bag into the fridge at home: what fits goes in, the rest stays in the bag in her hand; an empty bag is gone. Unpaid, the checkout first. */
export function stockUp(town: Neighborhood, actor: ActorId): Shopped {
  const at = standing(town, actor), hand = heldBy(town, actor);
  if (!at || !isBag(hand) || isMarket(at.building.layout, at.room) || !at.building.layout.pieces.some(p => p.room === at.room && p.kind === 'fridge')) return none(town);
  if (!hand.paid) return { town, outcome: { kind: 'missing', need: 'checkout' } };
  const stored = storeGoods(town, at.building.id, hand.contents);
  return { town: stored.left.length ? patch(stored.town, hand.id, { contents: stored.left }) : consumeItem(stored.town, hand.id), outcome: { kind: 'stored', left: stored.left.length } };
}
export const marketActions: readonly NeighborhoodAction['type'][] = ['buy', 'checkout', 'stock-up'];
export function shop(town: Neighborhood, action: MarketAction): Shopped {
  if (action.type === 'buy') return buy(town, action);
  return action.type === 'checkout' ? checkout(town, action.actor) : stockUp(town, action.actor);
}
