import { describe, expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { localWorld, migrateNeighborhood, neighborhoodAction, storeWorld, undoTo } from './neighborhood';
import { initialWorld, transition } from './world';
import { band, bandOf, feel, initialNeeds, live, mood, needsOf, relieve } from './needs';
import { tastes } from './tastes';
import type { LiveAction, Neighborhood, Resident } from './neighborhood-types';
import type { ActorId, Item, Needs, World } from './types';

const startTown = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const who = (town: { actors: readonly Resident[] } | World, id: ActorId) => town.actors.find(a => a.id === id)!;
const needs = (patch: Partial<Needs>): Needs => ({ fome: 20, sono: 0, tedio: 0, alegria: 0, ...patch });
const withNeeds = <T extends { actors: World['actors'] }>(place: T, id: ActorId, patch: Partial<Needs>): T =>
  ({ ...place, actors: place.actors.map(a => a.id === id ? { ...a, needs: needs(patch) } : a) });
const step = (elapsed: number, rest: Partial<LiveAction> = {}): LiveAction => ({ type: 'live', elapsed, phase: 'manha', ...rest });
const run = (town: Neighborhood, ticks: number, action: LiveAction) => Array.from({ length: ticks }).reduce<Neighborhood>(t => live(t, action), town);

describe('necessidades de uma sessão (§3.1)', () => {
  it('cada sessão começa de manhã com fome 20, sono 0 e tédio 0, sem alegria; sem `needs` vale o começo', () => {
    expect(initialNeeds()).toEqual({ fome: 20, sono: 0, tedio: 0, alegria: 0 });
    expect(needsOf(who(startTown(), 'bia'))).toEqual(initialNeeds());
    expect(who(startTown(), 'bia').needs).toBeUndefined();
  });
  it('faixas: bem até 39, pede de 40 a 69, precisa de 70 a 100', () => {
    expect([0, 39.99, 40, 69.99, 70, 100].map(band)).toEqual(['bem', 'bem', 'pede', 'pede', 'precisa', 'precisa']);
  });
  it('a fome passa de bem a pede exatamente em 3 min e 20 s de sessão, em qualquer divisão dos ticks', () => {
    const town = startTown();
    const fifty = run(town, 3, step(50_000));
    expect(bandOf(who(live(fifty, step(49_999)), 'bia'), 'fome')).toBe('bem');
    expect(bandOf(who(live(fifty, step(50_000)), 'bia'), 'fome')).toBe('pede');
    const ticks = run(town, 6, step(30_000));
    expect(bandOf(who(live(ticks, step(19_000)), 'bia'), 'fome')).toBe('bem');
    expect(bandOf(who(live(ticks, step(20_000)), 'bia'), 'fome')).toBe('pede');
    expect(needsOf(who(live(ticks, step(20_000)), 'bia')).fome).toBe(40);
  });
  it('um live de 30 dias vale 60 s; tempo inválido, negativo ou zero não muda nada', () => {
    const town = startTown();
    expect(live(town, step(30 * 24 * 3600_000))).toEqual(live(town, step(60_000)));
    expect(needsOf(who(live(town, step(60_000)), 'bia')).fome).toBe(26);
    for (const elapsed of [NaN, -5000, 0, Infinity]) expect(live(town, step(elapsed))).toBe(town);
  });
  it('o teto é 100: depois disso nada piora', () => {
    const end = run(startTown(), 40, step(60_000, { phase: 'noite', idle: ['bia'] }));
    expect(needsOf(who(end, 'bia'))).toEqual({ fome: 100, sono: 100, tedio: 100, alegria: 0 });
  });
  it('o sono cresce +2/min de dia e ao amanhecer, +12/min no entardecer e à noite', () => {
    const sleep = (phase: LiveAction['phase']) => needsOf(who(live(startTown(), step(60_000, { phase })), 'luna')).sono;
    expect(['manha', 'tarde', 'amanhecer', 'entardecer', 'noite'].map(p => sleep(p as LiveAction['phase']))).toEqual([2, 2, 2, 12, 12]);
  });
  it('o tédio cresce +5/min só para quem está parado (W3L-13, ajuste do lote 3)', () => {
    const town = live(startTown(), step(60_000, { idle: ['bia'] }));
    expect([needsOf(who(town, 'bia')).tedio, needsOf(who(town, 'luna')).tedio]).toEqual([5, 0]);
    expect(needsOf(who(live(startTown(), step(60_000)), 'bia')).tedio).toBe(0);
  });
  it('quem está fora do lugar mostrado nunca passa de 69, e quem sai do cômodo volta a 69', () => {
    const away = (town: Neighborhood) => ({ ...town, actors: town.actors.map(a => a.id === 'luna' ? { ...a, location: { kind: 'street' as const } } : a) });
    const end = run(away(startTown()), 30, step(60_000, { phase: 'noite', idle: ['luna'] }));
    expect(needsOf(who(end, 'luna'))).toEqual({ fome: 69, sono: 69, tedio: 69, alegria: 0 });
    expect(mood(who(end, 'luna'))).toBe('normal');
    expect(needsOf(who(end, 'bia')).fome).toBe(100);
    const left = live(away(withNeeds(startTown(), 'luna', { fome: 95, sono: 90 })), step(1));
    expect(mood(who(left, 'luna'))).toBe('normal');
    expect(needsOf(who(left, 'luna')).fome).toBe(69);
  });
  it('outro cômodo da mesma casa também está fora do lugar mostrado', () => {
    const town = startTown(), where = town.location as Extract<Neighborhood['location'], { kind: 'interior' }>;
    const moved = { ...town, actors: town.actors.map(a => a.id === 'leo' ? { ...a, location: { ...where, room: 'quarto' as const } } : a) };
    expect(needsOf(who(live(withNeeds(moved, 'leo', { fome: 90 }), step(1)), 'leo')).fome).toBe(69);
  });
  it('Rui (tédio ×1,4, fome ×0,6) fica entediado antes da Bia; Léo tem sono ×1,1; os gatos sono ×1,5 e fome ×0,6', () => {
    const minute = live(startTown(), step(60_000, { phase: 'noite', idle: ['bia', 'rui', 'mimi'] }));
    expect(needsOf(who(minute, 'rui')).tedio).toBeCloseTo(7);
    expect(needsOf(who(minute, 'rui')).fome).toBeCloseTo(23.6);
    expect(needsOf(who(minute, 'leo')).sono).toBeCloseTo(13.2);
    expect(needsOf(who(minute, 'mimi')).fome).toBeCloseTo(23.6);
    expect(needsOf(who(minute, 'mimi')).sono).toBe(18);
    const bored = (id: ActorId) => Array.from({ length: 30 }, (_, n) => run(startTown(), n + 1, step(30_000, { idle: [id] })))
      .findIndex(t => bandOf(who(t, id), 'tedio') === 'pede');
    expect(bored('rui')).toBeLessThan(bored('bia'));
    expect([bored('rui'), bored('bia')]).toEqual([11, 15]);
  });
  it('as taxas por personalidade moram em tastes.ts', () => {
    expect(Object.fromEntries(Object.entries(tastes).filter(([, t]) => t.pace).map(([id, t]) => [id, t.pace]))).toEqual({
      leo: { sono: 1.1 }, rui: { tedio: 1.4, fome: 0.6 }, mimi: { sono: 1.5, fome: 0.6 }, nino: { sono: 1.5, fome: 0.6 }, pipoca: { sono: 1.5, fome: 0.6 } });
  });
});

describe('humor derivado', () => {
  const as = (patch: Partial<Needs>) => mood({ needs: needs(patch) });
  it('duas necessidades em precisa dão triste; uma só não', () => {
    expect(as({ fome: 70, sono: 70 })).toBe('triste');
    expect(as({ tedio: 100, sono: 85 })).toBe('triste');
    expect(as({ fome: 100, sono: 69 })).toBe('normal');
    expect(as({ fome: 40 })).toBe('normal');
  });
  it('feliz com as três em bem, ou com uma alegria recente, mesmo triste', () => {
    expect(as({ fome: 39, sono: 39, tedio: 39 })).toBe('feliz');
    expect(as({ fome: 90, sono: 90, alegria: 1 })).toBe('feliz');
  });
  it('a alegria dura 60 s de sessão', () => {
    const joyful = withNeeds(startTown(), 'bia', { fome: 50, alegria: 60_000 });
    expect(mood(who(live(joyful, step(59_000)), 'bia'))).toBe('feliz');
    expect(mood(who(live(live(joyful, step(59_000)), step(1000)), 'bia'))).toBe('normal');
  });
});

describe('o que satisfaz', () => {
  it('prato −60, favorito zera a fome com alegria, lanche −30; brincar −40, a favorita −70 com alegria, escola −40 com alegria, abraço −20 com alegria', () => {
    const base = needs({ fome: 90, tedio: 90 });
    expect(relieve(base, 'prato')).toEqual(needs({ fome: 30, tedio: 90 }));
    expect(relieve(base, 'favorito')).toEqual(needs({ fome: 0, tedio: 90, alegria: 60_000 }));
    expect(relieve(base, 'lanche')).toEqual(needs({ fome: 60, tedio: 90 }));
    expect(relieve(base, 'brincar')).toEqual(needs({ fome: 90, tedio: 50 }));
    expect(relieve(base, 'favorita')).toEqual(needs({ fome: 90, tedio: 20, alegria: 60_000 }));
    expect(relieve(base, 'escola')).toEqual(needs({ fome: 90, tedio: 50, alegria: 60_000 }));
    expect(relieve(base, 'abraco')).toEqual(needs({ fome: 90, tedio: 70, alegria: 60_000 }));
    expect(relieve(needs({ fome: 10 }), 'prato').fome).toBe(0);
  });
  const dish = (recipe: string): Item => ({ id: '9:prato', kind: 'prato', recipe, room: 'sala', x: 400, y: 500, holder: null, spot: 'floor' }) as Item;
  const hungry = (recipe: string) => withNeeds({ ...initialWorld(), items: [...initialWorld().items, dish(recipe)] }, 'luna', { fome: 90, sono: 80 });
  it('comer o favorito leva a fome a 0 e dá feliz; outro prato tira 60', () => {
    const favorite = who(transition(hungry('pizza'), { type: 'give', actor: 'luna', item: '9:prato' }).state, 'luna');
    expect(needsOf(favorite).fome).toBe(0);
    expect(mood(favorite)).toBe('feliz');
    const other = who(transition(hungry('panqueca'), { type: 'give', actor: 'luna', item: '9:prato' }).state, 'luna');
    expect(needsOf(other)).toEqual(needs({ fome: 30, sono: 80 }));
  });
  it('o lanche de sempre e o peixe do gato tiram 30', () => {
    let world = withNeeds(withNeeds(initialWorld(), 'bia', { fome: 50 }), 'mimi', { fome: 45 });
    for (const [actor, item] of [['bia', 'lanche'], ['mimi', 'peixe']] as const) {
      world = transition(world, { type: 'pick', actor, item }).state;
      world = transition(world, { type: 'feed', actor }).state;
    }
    expect([needsOf(who(world, 'bia')).fome, needsOf(who(world, 'mimi')).fome]).toEqual([20, 15]);
  });
  it('arrastar o lanche ou o peixe até alguém também tira 30', () => {
    let world = withNeeds(withNeeds(initialWorld(), 'leo', { fome: 80 }), 'nino', { fome: 31 });
    world = transition(world, { type: 'give', actor: 'leo', item: 'lanche' }).state;
    world = transition(world, { type: 'give', actor: 'nino', item: 'peixe' }).state;
    expect([needsOf(who(world, 'leo')).fome, needsOf(who(world, 'nino')).fome]).toEqual([50, 1]);
    expect(who(transition(withNeeds(initialWorld(), 'luna', { fome: 50 }), { type: 'give', actor: 'luna', item: 'ursinho' }).state, 'luna').needs!.fome).toBe(50);
  });
});

describe('as necessidades acompanham o mundo', () => {
  it('neighborhoodAction despacha live', () => {
    expect(neighborhoodAction(startTown(), step(60_000))).toEqual(live(startTown(), step(60_000)));
  });
  it('feel copia as necessidades do bairro para a cópia local, sem tocar no resto', () => {
    const town = live(startTown(), step(60_000)), world = initialWorld();
    const felt = feel(world, town);
    expect(felt.actors.map(a => a.needs)).toEqual(town.actors.map(a => a.needs));
    expect(felt.actors.map(a => ({ ...a, needs: undefined }))).toEqual(world.actors);
    expect(feel(world, startTown()).actors).toEqual(world.actors);
  });
  it('a cópia local e o bairro não se apagam: live → feel → andar → storeWorld guarda as necessidades, e comer → storeWorld → live guarda o alívio', () => {
    const town = live(startTown(), step(60_000, { idle: ['bia'] }));
    const moved = transition(feel(localWorld(startTown()), town), { type: 'move', actor: 'bia', point: { x: 600, y: 520 } }).state;
    expect(storeWorld(town, moved).actors.map(a => a.needs)).toEqual(town.actors.map(a => a.needs));
    const hungry = withNeeds(startTown(), 'bia', { fome: 60 });
    let world = transition(localWorld(hungry), { type: 'pick', actor: 'bia', item: '1:lanche' }).state;
    world = transition(world, { type: 'feed', actor: 'bia' }).state;
    expect(needsOf(who(live(storeWorld(hungry, world), step(10_000)), 'bia')).fome).toBe(31);
  });
  it('desfazer volta as casas, nunca as necessidades', () => {
    const before = startTown(), now = live(before, step(60_000, { idle: ['bia'] }));
    expect(undoTo(before, now).actors.map(a => a.needs)).toEqual(now.actors.map(a => a.needs));
  });
});
