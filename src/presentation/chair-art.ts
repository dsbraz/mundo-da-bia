import type Phaser from 'phaser';
import type { Palette } from '../domain/types';
import { recolor } from './svg-source';
import { sheet, sheetPart } from './art-sheet';

let source: string | null = null;
/** Keeps the chair drawing (`public/art/chair.svg`, read in the scene's preload or fetched by the DOM). */
export function keepChair(text: string) { source = text; }
/** The chair in `color` (its cushion takes the palette, the wood stays): cut from the sheet once read, the plain file until then. */
export function chairImage(color: Palette): string {
  if (!source) { void sheet('chair').then(keepChair); return '/art/chair.svg'; }
  return sheetPart(recolor(source, color), ['chair'], { width: 90, height: 130 });
}
/** In the scene: whether the chair's sheet is read (the texture waits for it instead of drawing the plain file). */
export function chairReady(scene: Phaser.Scene): boolean {
  const text = scene.cache.text.get('art-chair') as string | undefined;
  if (text) keepChair(text);
  return !!text;
}
