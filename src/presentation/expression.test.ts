import { expect, it } from 'vitest';
import human from './assets/human.svg?raw';
import cat from './assets/cat.svg?raw';
import { expressionOf, faceEvents, faceLayers, faceParts, faces, pokeFace, surpriseMs } from './expression';

const calm = { resting: false, show: false, fed: false };
it('cada estado vira uma expressão, nesta prioridade: sono, surpresa, risada, alegria, curiosidade', () => {
  expect(expressionOf(calm, null)).toBe('neutral');
  expect(expressionOf({ ...calm, fed: true }, null)).toBe('happy');
  expect(expressionOf({ ...calm, show: true, fed: true }, null)).toBe('laugh');
  expect(expressionOf({ ...calm, show: true }, 'surprise')).toBe('surprise');
  expect(expressionOf({ ...calm, resting: true, show: true }, 'surprise')).toBe('sleepy');
  expect(expressionOf({ ...calm, fed: true }, 'curious')).toBe('happy');
  expect(expressionOf(calm, 'curious')).toBe('curious');
  expect(expressionOf(calm, 'laugh')).toBe('laugh');
  expect(expressionOf(calm, 'sleepy')).toBe('sleepy');
});
it('as cinco expressões e a careta usam camadas que existem na arte, para humanos e gatos', () => {
  const ids = (svg: string) => new Set([...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const [kind, svg] of [['human', human], ['cat', cat]] as const) {
    const present = ids(svg);
    expect(Object.keys(faceLayers[kind]).sort()).toEqual(['curious', 'happy', 'laugh', 'neutral', 'silly', 'sleepy', 'surprise']);
    for (const part of faceParts[kind]) expect(present.has(part), `${kind}: ${part}`).toBe(true);
    const looks = new Set(Object.values(faceLayers[kind]).map(l => JSON.stringify(l)));
    expect(looks.size).toBe(7);
  }
});
it('olhos 1,4 vez maiores que antes (humano 3 × 4,6 e gato 2,8 × 4)', () => {
  const eye = (svg: string) => { const [, rx, ry] = /<g id="eyes"[^>]*><ellipse [^>]*rx="([\d.]+)" ry="([\d.]+)"/.exec(svg)!; return { rx: Number(rx), ry: Number(ry) }; };
  expect(eye(human).rx / 3).toBeCloseTo(1.4, 1); expect(eye(human).ry / 4.6).toBeCloseTo(1.4, 1);
  expect(eye(cat).rx / 2.8).toBeCloseTo(1.4, 1); expect(eye(cat).ry / 4).toBeCloseTo(1.4, 1);
});
it('um gatilho dura o seu tempo e depois some; o mais novo vale', () => {
  const store = faces();
  store.trigger('bia', 'surprise', 1000);
  expect(store.of('bia', 1000 + surpriseMs - 1)).toBe('surprise');
  expect(store.of('bia', 1000 + surpriseMs + 1)).toBeNull();
  expect(surpriseMs).toBeGreaterThanOrEqual(1100); expect(surpriseMs).toBeLessThanOrEqual(1300);
  store.trigger('luna', 'laugh', 0, 900); store.trigger('luna', 'curious', 100, 500);
  expect(store.of('luna', 200)).toBe('curious'); expect(store.of('luna', 700)).toBeNull();
  expect(store.of('rui', 0)).toBeNull();
});
it('eventos que já existem disparam rostos: entrar surpreende, acordar dá sono, cócegas fazem rir', () => {
  const store = faces(), world = { actors: [{ id: 'bia', resting: false }, { id: 'mimi', resting: true }] } as never;
  faceEvents(store, [{ type: 'room' }], world, 'bia', 0);
  expect(store.of('bia', surpriseMs - 1)).toBe('surprise');
  faceEvents(store, [{ type: 'summoned', actor: 'luna' }], world, 'bia', 0);
  expect(store.of('luna', 10)).toBe('surprise');
  faceEvents(store, [{ type: 'rested', actor: 'mimi' }, { type: 'fed', actor: 'rui' }], world, 'bia', 0);
  expect(store.of('mimi', 10)).toBeNull(); expect(store.of('rui', 10)).toBeNull();
  faceEvents(store, [{ type: 'rested', actor: 'bia' }], world, 'bia', 5000);
  expect(store.of('bia', 6900)).toBe('sleepy'); expect(store.of('bia', 7100)).toBeNull();
  expect(pokeFace('hop')).toBe('laugh'); expect(pokeFace('wiggle')).toBe('laugh');
  expect(pokeFace('purr')).toBe('happy'); expect(pokeFace('stretch')).toBe('happy');
});
it('a careta engraçada vem de errar na brincadeira; palmas e comemoração riem', () => {
  expect(pokeFace('goof')).toBe('silly');
  expect(pokeFace('clap')).toBe('laugh'); expect(pokeFace('cheer')).toBe('laugh');
  expect(pokeFace('stretch')).toBe('happy');
});
