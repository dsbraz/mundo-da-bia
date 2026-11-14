import type Phaser from 'phaser';
import type { Palette, PieceKind, World } from '../domain/types';
import { ingredientIds } from '../domain/ingredients';
import type { Ingredient } from '../domain/ingredients';
import { marketGoods, shelfDesign } from '../domain/market';
import type { Good } from '../domain/market';
import { recolor } from './svg-source';
import { sheet, sheetPart } from './art-sheet';
import { loadSvg } from './rendering';
import { ingredientIcon } from './kitchen-bench';

let source: string | null = null;
/** Keeps the market sheet (`public/art/market.svg`, read in the scene's preload or fetched by the DOM). */
export function keepMarket(text: string) { source = text; }
const boxes: Partial<Record<PieceKind, { width: number; height: number }>> = { 'market-shelf': { width: 170, height: 220 }, checkout: { width: 200, height: 140 } };
export { marketKinds } from '../domain/market';
/** A market piece in `color`, cut from the sheet once read; until then its own bubble drawing stands in (the market's basket for a
 *  shelf, the register for the checkout), so two pieces never share one picture in a catalog drawn before the sheet arrives. */
export function marketPieceImage(kind: PieceKind, color: Palette): string {
  if (!source) { void sheet('market').then(keepMarket); return `/art/market.svg#${kind === 'checkout' ? 'checkout' : 'market'}`; }
  return sheetPart(recolor(source, color), [kind === 'checkout' ? 'piece-checkout' : kind], boxes[kind]!);
}
/** In the scene: whether the market sheet is read (its textures wait for it). */
export function marketReady(scene: Phaser.Scene): boolean {
  const text = scene.cache.text.get('art-market') as string | undefined;
  if (text) keepMarket(text);
  return !!text;
}
/** The shelf signs, the seed packet and every ingredient icon, only for a room that shows them (shelves, an open fridge, a bag). */
export function loadMarketArt(scene: Phaser.Scene, state: World) {
  const inRoom = (kind: string) => state.layout.pieces.some(p => p.room === state.room && p.kind === kind);
  const shelves = inRoom('market-shelf');
  if (!shelves && !(inRoom('fridge') && state.home.fridge) && !state.items.some(i => i.kind === 'sacola' && i.room === state.room)) return;
  [...ingredientIds, 'lanche' as const].forEach(id => { if (!scene.textures.exists(`ing-${id}`)) scene.load.svg(`ing-${id}`, ingredientIcon(id), { width: 64, height: 64 }); });
  // Signs and the seed packet are cut from the market sheet, so only a room with shelves waits for them: an open fridge at home
  // shows basics only and must not hold the scene back for them.
  if (!shelves || scene.textures.exists('seed-packet') || !marketReady(scene)) return;
  [0, 1, 2].forEach(n => loadSvg(scene, `shelf-sign-${n}`, sheetPart(source!, [`shelf-sign-${n}`], { width: 170, height: 36 })));
  loadSvg(scene, 'seed-packet', sheetPart(source!, ['seed-packet'], { width: 64, height: 64 }));
}
/** Where the goods of a shelf sit, in order: shared out over its 3 boards (up to 3 each, top boards first, so no board is left bare,
 *  lot 6B) and centred on each board; beyond 9 the shelf is full to the eye. Two goods go on the top and bottom boards. */
export function goodSpots(count: number): { x: number; y: number }[] {
  const shown = Math.min(count, 9), boards = shown === 2 ? [0, 2] : [0, 1, 2];
  return boards.flatMap((board, n) => {
    const on = Math.floor(shown / boards.length) + (n < shown % boards.length ? 1 : 0);
    return Array.from({ length: on }, (_, i) => ({ x: 85 + (i - (on - 1) / 2) * 40, y: 62 + board * 58 }));
  });
}
/** The picture of a good in the scene: an ingredient icon, or for a seed the packet with the crop on it. */
export function goodImages(scene: Phaser.Scene, good: Good, x: number, y: number, size = 36): Phaser.GameObjects.Image[] {
  if (!good.startsWith('semente-')) return [scene.add.image(x, y, `ing-${good}`).setDisplaySize(size, size)];
  const crop = good.slice('semente-'.length) as Ingredient;
  return [scene.add.image(x, y, 'seed-packet').setDisplaySize(size, size), scene.add.image(x, y + size * .12, `ing-${crop}`).setDisplaySize(size * .45, size * .45)];
}
/** Each market shelf of the room shows its sign and what it sells (§3.4): the drawing changes with the shelf's turn in the room. */
export function drawShelfGoods(scene: Phaser.Scene, state: World, pieces: Map<number, Phaser.GameObjects.Container>, revealed: readonly Good[]) {
  if (!scene.textures.exists('shelf-sign-0')) return;
  state.layout.pieces.filter(p => p.room === state.room && p.kind === 'market-shelf').forEach(piece => {
    const container = pieces.get(piece.id); if (!container) return;
    container.add(scene.add.image(85, 19, `shelf-sign-${shelfDesign(state.layout, piece)}`).setDisplaySize(170, 36));
    const goods = marketGoods(state.layout, piece, revealed);
    goodSpots(goods.length).forEach((at, n) => container.add(goodImages(scene, goods[n]!, at.x, at.y)));
  });
}
