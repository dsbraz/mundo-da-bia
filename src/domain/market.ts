import { basics } from './ingredients';
import type { Basic } from './ingredients';
import { specialIds } from './progress';
import type { SpecialId } from './progress';
import { cropIds } from './types';
import type { CropId, Layout, Piece, PieceKind, RoomId } from './types';
import type { Neighborhood } from './neighborhood-types';

/** A seed packet sold at the market (§3.4): planting it is how a new crop starts. */
export type Seed = `semente-${CropId}`;
/** What the market sells: the basics, the specials and the seed packets. Never a price. */
export type Good = Basic | SpecialId | Seed;
export const seedGoods: readonly Seed[] = cropIds.map(crop => `semente-${crop}` as const);
export const goodIds: readonly Good[] = [...basics, ...specialIds, ...seedGoods];
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

