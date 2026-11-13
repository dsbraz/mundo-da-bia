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
/** A market piece in `color`, cut from the sheet once read; until then the market's bubble drawing stands in. */
export function marketPieceImage(kind: PieceKind, color: Palette): string {
  if (!source) { void sheet('market').then(keepMarket); return '/art/market.svg#market'; }
  return sheetPart(recolor(source, color), [kind], boxes[kind]!);
}
/** In the scene: whether the market sheet is read (its textures wait for it). */
export function marketReady(scene: Phaser.Scene): boolean {
  const text = scene.cache.text.get('art-market') as string | undefined;
  if (text) keepMarket(text);
  return !!text;
}
/** The shelf signs, the seed packet and every ingredient icon, only for a room that shows them (shelves, an open fridge, a bag). */
export function loadMarketArt(scene: Phaser.Scene, state: World) {
  const here = state.layout.pieces.some(p => p.room === state.room && (p.kind === 'market-shelf' || (p.kind === 'fridge' && state.home.fridge)));
  if (!here && !state.items.some(i => i.kind === 'sacola' && i.room === state.room)) return;
  ingredientIds.forEach(id => { if (!scene.textures.exists(`ing-${id}`)) scene.load.svg(`ing-${id}`, ingredientIcon(id), { width: 64, height: 64 }); });
  if (scene.textures.exists('seed-packet') || !marketReady(scene)) return;
  [0, 1, 2].forEach(n => loadSvg(scene, `shelf-sign-${n}`, sheetPart(source!, [`shelf-sign-${n}`], { width: 170, height: 36 })));
  loadSvg(scene, 'seed-packet', sheetPart(source!, ['seed-packet'], { width: 64, height: 64 }));
}
/** Where good `n` of a shelf sits: 3 boards of 3, left to right, top to bottom (beyond 9 the shelf is full to the eye). */
export const goodSpot = (n: number) => ({ x: 45 + (n % 3) * 40, y: 62 + Math.floor(n / 3) * 58 });
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
    marketGoods(state.layout, piece, revealed).slice(0, 9).forEach((good, n) => { const at = goodSpot(n); container.add(goodImages(scene, good, at.x, at.y)); });
  });
}
