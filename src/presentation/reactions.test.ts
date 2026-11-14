import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { react } from './reactions';
import { initialWorld } from '../domain/world';
import { bubbleDuration } from './feedback';
import { heartDuration } from './care-heart';
afterEach(() => vi.unstubAllGlobals());
function scene() {
  const tweens: Record<string, unknown>[] = [], said: string[] = [];
  const object = () => { const o: Record<string, unknown> = { width: 80, height: 30, active: true }; for (const m of ['setOrigin', 'setDepth', 'setY', 'setPosition', 'setAlpha', 'setScale', 'fillStyle', 'fillRoundedRect', 'fillTriangle', 'fillCircle', 'lineStyle', 'strokeRoundedRect', 'strokeCircle', 'fillRect', 'destroy']) o[m] = () => o; return o; };
  const fake = { game: { canvas: { dataset: {} } }, cameras: { main: { scrollX: 0, scrollY: 0, width: 2000, height: 1200, zoom: 2 } }, add: { text: (_x: number, _y: number, text: string) => { said.push(text); return object(); }, graphics: object, container: object },
    tweens: { add: (config: Record<string, unknown>) => { tweens.push(config); } } };
  return { tweens, said, fake: fake as unknown as Phaser.Scene };
}
it('com movimento reduzido o balão de reação fica parado e some por fade', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const world = initialWorld(), bia = world.actors[0]!, { tweens, said, fake } = scene();
  react(fake, world, [{ type: 'fed', actor: bia.id }], ['Hummm! Bia adorou!']);
  expect(tweens).toHaveLength(2);
  expect(tweens[0]).toMatchObject({ y: bia.y - 196, alpha: 0, duration: 120, delay: bubbleDuration(said[0]!) - 120 });
  // The heart after eating is transient: one tween that ends it, and it marks who ate while it shows.
  expect(tweens[1]).toMatchObject({ t: heartDuration, duration: heartDuration });
  expect((fake.game.canvas.dataset as Record<string, string>).heart).toBe('bia');
});
it('só comer mostra o coração', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), { tweens, fake } = scene();
  react(fake, world, [{ type: 'dressed', actor: 'bia' }], ['Bia amou o look novo!']);
  expect(tweens).toHaveLength(2);
  expect((fake.game.canvas.dataset as Record<string, string>).heart).toBeUndefined();
});
it('sem preferência o balão sobe enquanto esmaece e fala o nome de quem reagiu', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), bia = world.actors[0]!, { tweens, said, fake } = scene();
  react(fake, world, [{ type: 'dressed', actor: bia.id }], ['Bia amou o look novo!']);
  expect(said[0]).toContain('Bia');
  expect(tweens.at(-1)).toMatchObject({ y: bia.y - 196 - 18, alpha: { value: 0 }, duration: bubbleDuration(said[0]!) });
});
it('a fala de quem está selecionado sai acima do nome e da estrela (lote 6B)', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), bia = world.actors[0]!, { tweens, fake } = scene();
  react(fake, world, [{ type: 'dressed', actor: bia.id }], ['Bia amou o look novo!'], 'bia');
  expect(Number(tweens.at(-1)!.y)).toBeCloseTo(bia.y - 255.2 - 18);
});
it('mudar de lugar não gera fala', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), { said, fake } = scene();
  react(fake, world, [{ type: 'moved', actor: 'bia' }], [null]);
  expect(said).toEqual([]);
});
it('ligar a estante de livros põe um livro na mão de quem foi até ela; desligar ou outra peça não', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const base = initialWorld();
  const shelf = { id: 900, kind: 'bookcase' as const, room: 'sala' as const, x: 300, y: 200, color: 'original' as const, flipped: false };
  const world = (active: boolean, kind: 'bookcase' | 'sink' = 'bookcase') => ({ ...base, layout: { ...base.layout, pieces: [{ ...shelf, kind, active }] } });
  const book = (state: ReturnType<typeof world>, selected?: 'bia') => { const { said, tweens, fake } = scene(); react(fake, state, [{ type: 'furniture', piece: 900 }], ['A casa brinca junto!'], selected); return { said, tweens, dataset: fake.game.canvas.dataset as Record<string, string> }; };
  const on = book(world(true), 'bia');
  expect(on.dataset.book).toBe('hand'); expect(on.tweens).toHaveLength(1); expect(on.said).toEqual([]);
  expect(book(world(false), 'bia').dataset.book).toBeUndefined();
  expect(book(world(true, 'sink'), 'bia').dataset.book).toBeUndefined();
  expect(book(world(true)).dataset.book).toBeUndefined();
});
it('o balão mostra a fala já sorteada na rotação, a mesma do anúncio, sem sortear de novo', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), { said, fake } = scene();
  react(fake, world, [{ type: 'dressed', actor: 'bia' }, { type: 'fed', actor: 'luna' }], ['Look novo! Bia aprovou!', null]);
  expect(said).toEqual(['Look novo! Bia aprovou!']);
});
it('um prato dividido (lote 6B) põe um prato só na mesa: quem divide fala junto, quando o prato acaba', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), { said, fake } = scene(), images: string[] = [], delayed: number[] = [], calls: (() => void)[] = [];
  // Any drawing call answers with the same object, so the plate can be drawn.
  const any: object = new Proxy(() => any, { get: (_t, key) => key === 'active' ? true : key === 'width' || key === 'height' ? 80 : any, apply: () => any });
  const add = (fake as unknown as { add: Record<string, unknown> }).add;
  add.image = (_x: number, _y: number, key: string) => { images.push(key); return any; };
  add.graphics = () => any;
  Object.assign(fake, { textures: { exists: () => true }, time: { delayedCall: (ms: number, call: () => void) => { delayed.push(ms); calls.push(call); } } });
  react(fake, world, [{ type: 'ate', actor: 'bia', recipe: 'panqueca' }, { type: 'ate', actor: 'leo', recipe: 'panqueca', by: 'bia' }], ['Hummm!', 'Que delícia!']);
  expect(images.filter(key => key.startsWith('dish-'))).toHaveLength(1);
  expect(delayed).toEqual([2400]);
  expect(said).not.toContain('Que delícia!');
  calls[0]!();
  expect(said).toContain('Que delícia!');
});
