import { describe, expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import type { Action, World } from './types';

// W3L-02: every refusal of §2.1 explains itself with a `missing` event (what is missing), never `events: []`.
const missing = (world: World, action: Action) => transition(world, action).events.find(e => e.type === 'missing');
const holding = (world: World) => transition(world, { type: 'pick', actor: 'bia', item: 'ursinho' }).state;

describe('missing', () => {
  it('sentar no sofá ocupado: mostra quem está lá e senta no lugar livre do lado', () => {
    // Luna starts on the sofa's right seat; the left one is free.
    const result = transition(initialWorld(), { type: 'sit', actor: 'bia', seat: '2.1' });
    expect(result.events).toContainEqual({ type: 'missing', actor: 'bia', need: 'seat', by: 'luna' });
    expect(result.state.actors.find(a => a.id === 'bia')).toMatchObject({ seat: '2.0', x: 150, y: 405 });
  });
  it('sentar no sofá todo ocupado: fica em pé ao lado, no chão, do lado de onde veio, nunca no ponto de partida', () => {
    const full = transition(initialWorld(), { type: 'sit', actor: 'leo', seat: '2.0' }).state;
    const result = transition(full, { type: 'sit', actor: 'bia', seat: '2.1' });
    expect(result.events).toContainEqual({ type: 'missing', actor: 'bia', need: 'seat', by: 'luna' });
    const bia = result.state.actors.find(a => a.id === 'bia')!;
    expect(bia).toMatchObject({ seat: null, x: 355, y: 480 });
    const fromLeft = transition({ ...full, actors: full.actors.map(a => a.id === 'bia' ? { ...a, x: 70 } : a) }, { type: 'sit', actor: 'bia', seat: '2.0' });
    expect(fromLeft.events).toContainEqual({ type: 'missing', actor: 'bia', need: 'seat', by: 'leo' });
    expect(fromLeft.state.actors.find(a => a.id === 'bia')).toMatchObject({ seat: null, x: 60, y: 480 });
  });
  it('sentar onde não há assento neste cômodo: falta assento, sem dono, e diz qual peça falta', () => {
    const away = transition(initialWorld(), { type: 'summon' }).state;
    const quarto = { ...away, room: 'quarto' as const, actors: away.actors.map(a => ({ ...a, room: 'quarto' as const })) };
    expect(missing(quarto, { type: 'sit', actor: 'bia', seat: '2.0' })).toEqual({ type: 'missing', actor: 'bia', need: 'seat', want: 'sofa' });
  });
  it('pôr na mesa de outro cômodo, na geladeira fechada, ou peixe na gaveta: falta o lugar', () => {
    const bia = holding(initialWorld());
    const quarto = { ...bia, room: 'quarto' as const, actors: bia.actors.map(a => ({ ...a, room: 'quarto' as const })) };
    expect(missing(quarto, { type: 'put', item: 'ursinho', spot: 'table' })).toEqual({ type: 'missing', need: 'place', want: 'table' });
    // The fridge is here and open: the teddy is the wrong kind, no piece is missing.
    expect(missing(initialWorld(), { type: 'put', item: 'ursinho', spot: 'fridge' })).toEqual({ type: 'missing', need: 'place' });
    const shut = transition(initialWorld(), { type: 'interact', target: 'fridge' }).state;
    expect(missing(shut, { type: 'put', item: 'lanche', spot: 'fridge' })).toEqual({ type: 'missing', need: 'place', want: 'fridge' });
    expect(missing(initialWorld(), { type: 'put', item: 'ursinho', spot: 'drawer' })).toEqual({ type: 'missing', need: 'place', want: 'wardrobe' });
    expect(missing(initialWorld(), { type: 'put', item: 'nada' as 'ursinho', spot: 'table' })).toEqual({ type: 'missing', need: 'place' });
  });
  it('pegar com a mão cheia: falta mão livre; pegar o que não está aqui: falta o lugar', () => {
    expect(missing(holding(initialWorld()), { type: 'pick', actor: 'bia', item: 'microfone' })).toEqual({ type: 'missing', actor: 'bia', need: 'hands' });
    expect(missing(holding(initialWorld()), { type: 'pick', actor: 'leo', item: 'ursinho' })).toEqual({ type: 'missing', actor: 'leo', need: 'place' });
  });
  it('dar a comida errada, ou Comer sem nada na mão: falta a comida certa', () => {
    const fish = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'peixe' }).state;
    expect(missing(fish, { type: 'feed', actor: 'bia' })).toEqual({ type: 'missing', actor: 'bia', need: 'food' });
    expect(missing(initialWorld(), { type: 'feed', actor: 'bia' })).toEqual({ type: 'missing', actor: 'bia', need: 'food' });
    expect(missing(initialWorld(), { type: 'give', actor: 'bia', item: 'peixe' })).toEqual({ type: 'missing', actor: 'bia', need: 'food' });
    expect(missing(initialWorld(), { type: 'give', actor: 'mimi', item: 'lanche' })).toEqual({ type: 'missing', actor: 'mimi', need: 'food' });
  });
  it('dar a quem está de mão cheia: falta mão livre', () => {
    expect(missing(holding(initialWorld()), { type: 'give', actor: 'bia', item: 'microfone' })).toEqual({ type: 'missing', actor: 'bia', need: 'hands' });
  });
  it('mover para fora do chão: falta caminho, e nada muda', () => {
    const before = initialWorld();
    const result = transition(before, { type: 'move', actor: 'bia', point: { x: 20, y: 500 } });
    expect(result).toEqual({ state: before, events: [{ type: 'missing', actor: 'bia', need: 'path' }] });
  });
  it('nenhuma das recusas acima devolve events vazio', () => {
    const fish = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'peixe' }).state;
    const refusals: [World, Action][] = [
      [initialWorld(), { type: 'sit', actor: 'bia', seat: '2.1' }], [initialWorld(), { type: 'put', item: 'ursinho', spot: 'fridge' }],
      [holding(initialWorld()), { type: 'pick', actor: 'bia', item: 'microfone' }], [fish, { type: 'feed', actor: 'bia' }],
      [initialWorld(), { type: 'give', actor: 'bia', item: 'peixe' }], [initialWorld(), { type: 'move', actor: 'bia', point: { x: 500, y: 100 } }],
    ];
    for (const [world, action] of refusals) expect(transition(world, action).events, action.type).not.toEqual([]);
  });
});
