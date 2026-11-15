import type Phaser from 'phaser';
import { booksOut, loanSlots } from '../domain/library';
import { pieceBounds } from '../domain/layout';
import type { Neighborhood, NeighborhoodItem } from '../domain/neighborhood-types';
import type { Item, World } from '../domain/types';
import { reducedMotion } from './motion';

/** The 3 covers (lot 8C), closed in a hand or on the floor, and open while she reads (`/icons/livro-*.svg`). */
export const bookTextures = [...Array(loanSlots).keys()].flatMap(n => [`livro-${n}`, `livro-aberto-${n}`]);
/** A book's cover: its place on the shelf it came from (a book that belongs nowhere takes one by its number). */
export function bookCover(item: Item): number {
  const loan = (item as Partial<NeighborhoodItem>).loan;
  return loan ? loan.slot : Number.parseInt(item.id, 10) % loanSlots || 0;
}
export const bookTexture = (item: Item, open = false) => `livro-${open ? 'aberto-' : ''}${bookCover(item)}`;

/** Where each lendable book stands in the bookcase drawing (`everyday.svg`, before the furniture scale): the green one on the top shelf,
 *  the blue one on the middle shelf, the pink one at the bottom; their colours are the covers'. */
const slots = [{ x: 29, y: 29, width: 17, height: 47 }, { x: 113, y: 98, width: 17, height: 39 }, { x: 53, y: 159, width: 16, height: 37 }];
const covers = [0x4f9d6c, 0x4a78c2, 0xd8667a], spines = [0x3a7a52, 0x355b99, 0xb04a5e];
const back = 0x9a8369, shade = 0x7f6b55, line = 0x7e705e;
/** The bookcase drawing is baked at its furniture scale (×0.96 about the bottom centre). */
const scaled = (x: number, y: number, flipped: boolean) => {
  const box = pieceBounds.bookcase, sx = box.width / 2 + (x - box.width / 2) * .96;
  return { x: flipped ? box.width - sx : sx, y: box.height + (y - box.height) * .96 };
};
/** Each bookcase of the room shows its 3 lendable books in their colours; a book that is out leaves its gap (an empty, shaded slot). */
export function drawBookcases(scene: Phaser.Scene, state: World, pieces: Map<number, Phaser.GameObjects.Container>, town: Neighborhood | null) {
  const where = town?.location, marks: string[] = [];
  state.layout.pieces.filter(p => p.room === state.room && p.kind === 'bookcase').forEach(piece => {
    const container = pieces.get(piece.id); if (!container) return;
    const out = town && where?.kind === 'interior' ? booksOut(town, where.building, piece.id) : [], g = scene.add.graphics();
    slots.forEach((slot, n) => {
      const a = scaled(slot.x, slot.y, piece.flipped), b = scaled(slot.x + slot.width, slot.y + slot.height, piece.flipped);
      const x = Math.min(a.x, b.x), y = a.y, width = Math.abs(b.x - a.x), height = b.y - a.y;
      // The gap: a darker, empty slot with its shadow on the side away from the light.
      if (out.includes(n)) g.fillStyle(back).fillRect(x - 1, y - 1, width + 2, height + 2).fillStyle(shade).fillRect(piece.flipped ? x + width - 4 : x - 1, y - 1, 5, height + 2);
      else g.fillStyle(covers[n]!).fillRect(x, y, width, height).fillStyle(spines[n]!).fillRect(x, y + 5, width, 3).fillRect(x, y + height - 8, width, 3).lineStyle(2, line).strokeRect(x, y, width, height);
    });
    container.add(g); marks.push(`${piece.id}:${out.join('') || '-'}`);
  });
  if (navigator.webdriver) scene.game.canvas.dataset.bookcases = marks.join(' ');
}

type Image = Phaser.GameObjects.Image;
/** Beside an open book, small stars and a letter-like squiggle float out and fade, over and over (with reduced motion: two still stars).
 *  The cue follows the book (`followBook`) and goes with it. */
export function readingCue(scene: Phaser.Scene, book: Image) {
  const reduced = reducedMotion(), cue = scene.add.container(book.x, book.y).setDepth(book.depth + .1);
  // They drift out to the sides of the book, never up over the face.
  [{ x: -24, y: -12, to: { x: -52, y: -42 }, color: 0xf2b630 }, { x: 22, y: -14, to: { x: 50, y: -40 }, color: 0x9b7bd0 }, { x: 26, y: 4, to: { x: 58, y: -12 }, color: 0x2ba8a0 }].forEach((spark, n) => {
    const g = scene.add.graphics({ x: spark.x, y: spark.y });
    if (n === 1) g.lineStyle(3.5, spark.color).beginPath().moveTo(-7, 3).lineTo(-3, -5).lineTo(1, 3).lineTo(5, -5).lineTo(8, 1).strokePath();
    else g.lineStyle(2, 0xfffdf7).fillStyle(spark.color).fillPoints(star(0, 0, 9, 4), true).strokePoints(star(0, 0, 9, 4), true);
    cue.add(g);
    if (reduced) { g.setAlpha(n === 1 ? 0 : 1).setPosition((spark.x + spark.to.x) / 2, (spark.y + spark.to.y) / 2); return; }
    scene.tweens.add({ targets: g, ...spark.to, alpha: { from: 1, to: 0, ease: 'Quad.easeIn' }, duration: 1800, delay: n * 600, repeat: -1 });
  });
  book.setData('cue', cue).once('destroy', () => cue.destroy());
  return cue;
}
/** How an open book is drawn open and closed (`drawObjects` keeps it on the book), so lifting the reader can close it. */
export interface OpenBook { key: string; size: number; closed: string; closedSize: number }
/** The cue stays over its book wherever the book is drawn this frame. Told whether its reader is `lifted` off her seat, an open book
 *  closes in her hand at once, cue and all, and opens again if she is put back without anything changing. */
export function followBook(book: Image, lifted?: boolean) {
  const cue = book.getData('cue') as Phaser.GameObjects.Container | undefined, open = book.getData('open') as OpenBook | undefined;
  cue?.setPosition(book.x, book.y);
  if (!cue || !open || lifted === undefined || cue.visible !== lifted) return;
  book.setTexture(lifted ? open.closed : open.key).setDisplaySize(lifted ? open.closedSize : open.size, lifted ? open.closedSize : open.size);
  cue.setVisible(!lifted);
}
function star(x: number, y: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? inner : outer, a = -Math.PI / 2 + i * Math.PI / 5; return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }; });
}
