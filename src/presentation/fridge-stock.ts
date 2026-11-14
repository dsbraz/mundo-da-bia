import type Phaser from 'phaser';
import { basics, stockLimit } from '../domain/ingredients';
import type { Basic, Stock } from '../domain/ingredients';
import type { Neighborhood } from '../domain/neighborhood-types';
import { stockOf } from '../domain/stock';
import type { Item, World } from '../domain/types';
import { itemKind } from '../domain/item-kind';
import { runOut } from '../domain/larder';
import { fixture, fromPiece, pieceBounds } from '../domain/layout';
import { drawShelfGoods } from './market-art';
import { drawFridgeDrawings } from './school-art';

/** Icon size in piece units: about 27 screen px at 1024 (W3L-23 art pass). */
export const fridgeIcon = 24;
const top = 102, middle = 154, door = { x: 127, y: 120 };
/** Where each basic stands inside the open fridge (piece coordinates): a row of 4 on each shelf, the oil on the door. */
const places: Record<Basic, { x: number; y: number }> = {
  pao: { x: 24, y: top }, leite: { x: 48, y: top }, queijo: { x: 76, y: top }, ovo: { x: 100, y: top },
  farinha: { x: 24, y: middle }, acucar: { x: 48, y: middle }, batata: { x: 76, y: middle }, peixe: { x: 100, y: middle },
  oleo: door,
};
export type FridgeSpot = { id: Basic; x: number; y: number; back: boolean };
/** The open fridge's pantry (W3L-23): one icon per unit, up to 4; the extra units stand just behind the front one, a little up and to
 *  the right, so a shelf reads as a row and never as a tower. Empty draws nothing. Never a number. */
export function fridgeSpots(stock: Stock): FridgeSpot[] {
  return basics.flatMap(id => {
    const count = Math.min(stockLimit, stock[id] ?? 0), place = places[id];
    return Array.from({ length: count }, (_, n) => {
      const depth = count - 1 - n;
      return { id, x: place.x + depth * 3, y: place.y - depth * 3, back: depth > 0 };
    });
  });
}
/** The fridge's own food (lot 6F): what ran out stays in its place as a silhouette (a touch on it shows the market); each snack left
 *  beyond the first stands just behind it, so the fridge shows how many are left without a number. Drawn beside `image`, never moved. */
export function fridgeFood(scene: Phaser.Scene, state: World, item: Item, image: Phaser.GameObjects.Image) {
  if (!state.larder) return;
  if (item.spot === 'fridge' && !item.holder && runOut(state, item)) { image.setTint(0x4f443d).setAlpha(.5); return; }
  const at = itemKind(item) === 'lanche' ? snackSpot(state, item, image) : null;
  for (let n = 0; at && n < Math.min(stockLimit, state.larder.lanche) - 1; n++) {
    const step = n + at.start;
    scene.add.image(at.x + 9 * step, at.y - 5 * step, image.texture.key).setDisplaySize(image.displayWidth, image.displayHeight).setTint(0xe2d6c4).setDepth(at.depth - step * .01);
  }
}
/** Where the snacks left stand: behind the one in the fridge, or, while one is in her hand, in the open fridge where it came from. */
function snackSpot(state: World, item: Item, image: Phaser.GameObjects.Image): { x: number; y: number; start: number; depth: number } | null {
  if (!item.holder) return item.spot === 'fridge' ? { x: image.x, y: image.y, start: 1, depth: image.depth } : null;
  const fridge = state.home.fridge ? fixture(state, 'fridge') : undefined;
  // Just in front of the fridge, as its own objects are (`objectDepth`).
  return fridge?.room === state.room ? { ...fromPiece(fridge, { x: 680, y: 310 }), start: 0, depth: fridge.y + pieceBounds.fridge.height - 18 } : null;
}
/** The room's open fridges draw the house's pantry. */
function drawFridgeStock(scene: Phaser.Scene, state: World, pieces: Map<number, Phaser.GameObjects.Container>, stock: Stock) {
  if (!state.home.fridge || !scene.textures.exists('ing-pao')) return;
  state.layout.pieces.filter(p => p.room === state.room && p.kind === 'fridge').forEach(piece => {
    const container = pieces.get(piece.id), width = pieceBounds.fridge.width;
    fridgeSpots(stock).forEach(spot => {
      const image = scene.add.image(piece.flipped ? width - spot.x : spot.x, spot.y, `ing-${spot.id}`).setDisplaySize(fridgeIcon, fridgeIcon);
      container?.add(spot.back ? image.setTint(0xe2d6c4) : image);
    });
  });
}
/** What the room shows of the market (§3.4): the shelves' goods, and in an open fridge the house's pantry; and the school's drawings
 *  on the fridge door (W3L-26). */
export function drawPantries(scene: Phaser.Scene, state: World, pieces: Map<number, Phaser.GameObjects.Container>, town: Neighborhood | null) {
  const where = town?.location, house = where?.kind === 'interior' ? town!.buildings.find(b => b.id === where.building) : undefined;
  drawShelfGoods(scene, state, pieces, town?.progress.shelves ?? []);
  drawFridgeStock(scene, state, pieces, house ? stockOf(house) : {});
  drawFridgeDrawings(scene, state, pieces, town?.progress.drawings ?? []);
}
