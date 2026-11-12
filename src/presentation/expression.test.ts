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
const needs = (fome: number, sono: number, tedio: number, alegria = 0) => ({ fome, sono, tedio, alegria });
it('as necessidades aparecem no rosto (W3L-12): fome, tédio e sono em precisa; duas em precisa é triste, sem lágrima', () => {
  expect(expressionOf({ ...calm, needs: needs(80, 0, 0) }, null)).toBe('hungry');
  expect(expressionOf({ ...calm, needs: needs(20, 0, 75) }, null)).toBe('bored');
  expect(expressionOf({ ...calm, needs: needs(20, 72, 0) }, null)).toBe('sleepy');
  expect(expressionOf({ ...calm, needs: needs(80, 72, 0) }, null)).toBe('sad');
  // `pede` is only the bubble: the face stays calm.
  expect(expressionOf({ ...calm, needs: needs(60, 60, 60) }, null)).toBe('neutral');
  // Fed with hunger out of `precisa` (the dish just eaten) is happy at once, also with sleep high; joy too.
  expect(expressionOf({ ...calm, fed: true, needs: needs(20, 80, 0) }, null)).toBe('happy');
  expect(expressionOf({ ...calm, needs: needs(90, 90, 0, 1000) }, null)).toBe('happy');
  // A dish from 100 leaves 40 (`pede`): still the happy face of having eaten. Fed long ago and hungry again shows the hunger.
  expect(expressionOf({ ...calm, fed: true, needs: needs(40, 74, 0) }, null)).toBe('happy');
  expect(expressionOf({ ...calm, fed: true, needs: needs(80, 0, 0) }, null)).toBe('hungry');
  // A glance does not hide a need; a poke, the show and a surprise do, and asleep is always sleepy.
  expect(expressionOf({ ...calm, needs: needs(80, 0, 0) }, 'curious')).toBe('hungry');
  expect(expressionOf({ ...calm, needs: needs(80, 72, 0) }, 'laugh')).toBe('laugh');
  expect(expressionOf({ ...calm, needs: needs(80, 72, 0) }, 'surprise')).toBe('surprise');
  expect(expressionOf({ ...calm, resting: true, needs: needs(80, 72, 0) }, null)).toBe('sleepy');
});
it('o rosto triste não tem lágrima: nenhuma camada de lágrima na arte', () => {
  expect(faceLayers.human.sad.eyes).toEqual(['eyes']);
  expect(`${human}${cat}`).not.toMatch(/tear|lagrima|lágrima/);
});
it('as cinco expressões e a careta usam camadas que existem na arte, para humanos e gatos', () => {
  const ids = (svg: string) => new Set([...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const [kind, svg] of [['human', human], ['cat', cat]] as const) {
    const present = ids(svg);
    expect(Object.keys(faceLayers[kind]).sort()).toEqual(['bored', 'curious', 'happy', 'hungry', 'laugh', 'neutral', 'sad', 'silly', 'sleepy', 'surprise', 'yawn']);
    for (const part of faceParts[kind]) expect(present.has(part), `${kind}: ${part}`).toBe(true);
    const looks = new Set(Object.values(faceLayers[kind]).map(l => JSON.stringify(l)));
    expect(looks.size).toBe(11);
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
