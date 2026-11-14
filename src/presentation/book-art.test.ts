import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { followBook } from './book-art';

type Fake = { x: number; y: number; key: string; size: number; visible: boolean; data: Map<string, unknown> };
/** A book drawn open with its reading cue, as `drawObjects` leaves it. */
function openBook() {
  const cue = { x: 0, y: 0, visible: true, setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }, setVisible(v: boolean) { this.visible = v; return this; } };
  const book = { x: 100, y: 200, key: 'livro-aberto-1', size: 54, visible: true, data: new Map<string, unknown>([['cue', cue], ['open', { key: 'livro-aberto-1', size: 54, closed: 'livro-1', closedSize: 40 }]]),
    getData(k: string) { return this.data.get(k); }, setTexture(k: string) { this.key = k; return this; }, setDisplaySize(w: number) { this.size = w; return this; } };
  return { book, cue, image: book as unknown as Phaser.GameObjects.Image & Fake };
}

it('lote 8C: tirada do assento, a leitora fecha o livro na mão na hora; posta de volta sem mudar nada, o livro abre de novo', () => {
  const { book, cue, image } = openBook();
  followBook(image, true);
  expect([book.key, book.size, cue.visible]).toEqual(['livro-1', 40, false]);
  // Every frame while she is held, the closed book follows her hand.
  book.x = 300; followBook(image);
  expect([book.key, cue.x]).toEqual(['livro-1', 300]);
  followBook(image, false);
  expect([book.key, book.size, cue.visible]).toEqual(['livro-aberto-1', 54, true]);
});

it('um livro fechado (sem leitura) não muda ao ser carregado', () => {
  const book = { x: 0, y: 0, key: 'livro-0', data: new Map<string, unknown>(), getData(k: string) { return this.data.get(k); }, setTexture(k: string) { this.key = k; return this; }, setDisplaySize() { return this; } };
  followBook(book as unknown as Phaser.GameObjects.Image, true);
  expect(book.key).toBe('livro-0');
});
