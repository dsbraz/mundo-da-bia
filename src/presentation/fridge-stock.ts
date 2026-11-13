import type Phaser from 'phaser';
import { basics, stockLimit } from '../domain/ingredients';
import type { Basic, Stock } from '../domain/ingredients';
import type { Neighborhood } from '../domain/neighborhood-types';
import { stockOf } from '../domain/stock';
import type { World } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { drawShelfGoods } from './market-art';

const icon = 18, step = 5;
/** Where each basic sits inside the open fridge (piece coordinates): 5 on the top shelf, 4 on the middle one around the snack and the fish. */
const places: Record<Basic, { x: number; y: number }> = {
  pao: { x: 24, y: 104 }, leite: { x: 43, y: 104 }, queijo: { x: 62, y: 104 }, ovo: { x: 81, y: 104 }, farinha: { x: 100, y: 104 },
  acucar: { x: 22, y: 156 }, oleo: { x: 38, y: 156 }, batata: { x: 84, y: 156 }, peixe: { x: 100, y: 156 },
};
/** The open fridge's pantry (W3L-23): one icon per unit, piled upward in its place, up to 4. Empty draws nothing. Never a number. */
export function fridgeSpots(stock: Stock): { id: Basic; x: number; y: number }[] {
  return basics.flatMap(id => Array.from({ length: Math.min(stockLimit, stock[id] ?? 0) }, (_, n) => ({ id, x: places[id].x, y: places[id].y - n * step })));
}
/** The room's open fridges draw the house's pantry. */
function drawFridgeStock(scene: Phaser.Scene, state: World, pieces: Map<number, Phaser.GameObjects.Container>, stock: Stock) {
  if (!state.home.fridge || !scene.textures.exists('ing-pao')) return;
  state.layout.pieces.filter(p => p.room === state.room && p.kind === 'fridge').forEach(piece => {
    const container = pieces.get(piece.id), width = pieceBounds.fridge.width;
    fridgeSpots(stock).forEach(spot => container?.add(scene.add.image(piece.flipped ? width - spot.x : spot.x, spot.y, `ing-${spot.id}`).setDisplaySize(icon, icon)));
  });
}
/** What the room shows of the market (§3.4): the shelves' goods, and in an open fridge the house's pantry. */
export function drawPantries(scene: Phaser.Scene, state: World, pieces: Map<number, Phaser.GameObjects.Container>, town: Neighborhood | null) {
  const where = town?.location, house = where?.kind === 'interior' ? town!.buildings.find(b => b.id === where.building) : undefined;
  drawShelfGoods(scene, state, pieces, town?.progress.shelves ?? []);
  drawFridgeStock(scene, state, pieces, house ? stockOf(house) : {});
}
