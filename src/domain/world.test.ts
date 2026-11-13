import { isAdult } from './family';
import { describe, expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import type { Action } from './types';

describe('brincadeira', () => {
  it('tem quatro crianças, dois adultos e três gatos, sem estado compartilhado', () => {
    const a = initialWorld();
    expect(a.actors.filter(x => x.kind === 'human')).toHaveLength(6);
    expect(a.actors.filter(x => x.kind === 'cat')).toHaveLength(3);
    a.actors[0]!.fed = true;
    expect(initialWorld().actors[0]!.fed).toBe(false);
  });
  it('move sem duplicar nem modificar a entrada', () => {
    const before = initialWorld();
    const result = transition(before, { type: 'move', actor: 'bia', point: { x: 550, y: 420 } });
    expect(result.state.actors[0]).toEqual({ ...before.actors[0], x: 550, y: 420 });
    expect(before.actors[0]!.x).not.toBe(550);
    expect(result.state.actors.map(x => x.id)).toEqual(before.actors.map(x => x.id));
    expect(result.events).toEqual([{ type: 'moved', actor: 'bia' }]);
  });
  it.each([{ x: -1, y: 400 }, { x: 1001, y: 400 }, { x: NaN, y: 400 }, { x: 300, y: Infinity }, { x: 300, y: 279 }, { x: 300, y: 541 }])('preserva posição válida em movimento inválido %j', point => {
    const before = initialWorld();
    expect(transition(before, { type: 'move', actor: 'bia', point })).toEqual({ state: before, events: [{ type: 'missing', actor: 'bia', need: 'path' }] });
  });
  it('aceita os limites de movimento', () => {
    for (const point of [{ x: 60, y: 280 }, { x: 940, y: 540 }]) {
      expect(transition(initialWorld(), { type: 'move', actor: 'bia', point }).state.actors[0]).toMatchObject(point);
    }
  });
  it('troca cada look humano preservando identidade e não veste gatos', () => {
    for (const look of ['sol', 'jardim', 'estrela', 'mar', 'festa', 'pijama'] as const) {
      const before = initialWorld();
      expect(transition(before, { type: 'dress', actor: 'bia', look }).state.actors[0]).toEqual({ ...before.actors[0], look });
      expect(transition(before, { type: 'dress', actor: 'mimi', look }).state).toEqual(before);
    }
  });
  it('pega uma única vez, carrega para outro cômodo e solta junto ao personagem', () => {
    let state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
    expect(state.items.find(x => x.id === 'ursinho')!.holder).toBe('bia');
    expect(transition(state, { type: 'pick', actor: 'leo', item: 'ursinho' }).state).toEqual(state);
    expect(transition(state, { type: 'pick', actor: 'bia', item: 'microfone' }).state).toEqual(state);
    state = transition(state, { type: 'room', room: 'quarto' }).state;
    state = transition(state, { type: 'summon' }).state;
    state = transition(state, { type: 'drop', actor: 'bia' }).state;
    expect(state.items.find(x => x.id === 'ursinho')).toMatchObject({ holder: null, room: 'quarto', x: state.actors[0]!.x, y: state.actors[0]!.y });
    expect(state.items).toHaveLength(4);
  });
  it.each([['bia', 'lanche'], ['mimi', 'peixe']] as const)('alimenta %s com %s', (actor, item) => {
    const held = transition(initialWorld(), { type: 'pick', actor, item }).state;
    const result = transition(held, { type: 'feed', actor });
    expect(result.state.actors.find(x => x.id === actor)!.fed).toBe(true);
    expect(result.state.items.find(x => x.id === item)!.holder).toBeNull();
    expect(result.events).toEqual([{ type: 'fed', actor }]);
  });
  it('não alimenta sem comida ou com comida errada', () => {
    const before = initialWorld();
    expect(transition(before, { type: 'feed', actor: 'bia' }).state).toEqual(before);
    for (const item of ['peixe', 'microfone'] as const) {
      const held = transition(before, { type: 'pick', actor: 'bia', item }).state;
      expect(transition(held, { type: 'feed', actor: 'bia' }).state).toEqual(held);
    }
  });
  it('descansa, acorda e desperta ao mover', () => {
    const resting = transition(initialWorld(), { type: 'rest', actor: 'mimi' }).state;
    expect(resting.actors[4]!.resting).toBe(true);
    expect(transition(resting, { type: 'rest', actor: 'mimi' }).state.actors[4]!.resting).toBe(false);
    expect(transition(resting, { type: 'move', actor: 'mimi', point: { x: 300, y: 400 } }).state.actors[4]!.resting).toBe(false);
  });
  it('reúne todos, inicia e encerra o show; trocar de cômodo encerra o show', () => {
    let state = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
    state = transition(state, { type: 'summon' }).state;
    expect(state.actors.every(x => x.room === 'quarto')).toBe(true);
    state = transition(state, { type: 'show' }).state;
    expect(state.show).toBe(true);
    expect(transition(state, { type: 'show' }).state.show).toBe(false);
    expect(transition(state, { type: 'room', room: 'sala' }).state.show).toBe(false);
  });
  it('ignora ações sobre personagens e objetos em outro cômodo', () => {
    const state = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
    const actions: Action[] = [{ type: 'rest', actor: 'bia' }, { type: 'drop', actor: 'bia' }, { type: 'pick', actor: 'bia', item: 'lanche' }];
    for (const action of actions) expect(transition(state, action).state).toEqual(state);
    const gathered = transition(state, { type: 'summon' }).state;
    expect(transition(gathered, { type: 'pick', actor: 'bia', item: 'lanche' }).state).toEqual(gathered);
  });
});
describe('posições iniciais de saves novos', () => {
  it('espalha a turma sem sobreposição: alguém no sofá, alguém perto do microfone e gatos separados', () => {
    const world = initialWorld(), standing = world.actors.filter(a => !a.seat);
    expect(world.actors.map(a => [a.id, a.x, a.y, a.seat])).toEqual([
      ['bia', 520, 530, null], ['luna', 245, 405, '2.1'], ['leo', 420, 530, null], ['rui', 830, 530, null],
      ['mimi', 330, 540, null], ['nino', 740, 540, null], ['pipoca', 610, 540, null], ['daniel', 620, 530, null], ['fabiana', 420, 530, null],
    ]);
    // Compact enough for one opening at 768 px (about 790 logical units visible): the living room's group fits with room to spare; the
    // grown-ups (W3L-24) start in the bedroom.
    const half = (a: typeof world.actors[number]) => a.kind === 'cat' ? 35 : 42, group = world.actors.filter(a => a.room === 'sala');
    expect(world.actors.filter(a => isAdult(a.id)).map(a => a.room)).toEqual(['quarto', 'quarto']);
    expect(Math.max(...group.map(a => a.x + half(a))) - Math.min(...group.map(a => a.x - half(a)))).toBeLessThanOrEqual(765);
    for (const a of standing) for (const b of standing) if (a !== b && a.room === b.room) expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(90);
    const stage = world.layout.pieces.find(p => p.kind === 'stage')!;
    expect(standing.some(a => a.kind === 'human' && a.x >= stage.x)).toBe(true);
    const food = world.items.filter(i => i.spot === 'fridge').map(i => i.x);
    expect(standing.filter(a => food.some(x => Math.abs(a.x - x) <= 50))).toEqual([]);
  });
});
