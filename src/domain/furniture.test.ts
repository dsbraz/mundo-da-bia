import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';

it('abre e fecha móveis sem alterar personagens e mantém lâmpada independente', () => {
  const before = initialWorld();
  for (const target of ['fridge', 'drawer', 'lamp'] as const) {
    const opened = transition(before, { type: 'interact', target });
    expect(opened.state.home[target]).toBe(!before.home[target]);
    expect(opened.state.actors).toEqual(before.actors);
    expect(opened.events).toEqual([{ type: 'furniture' }]);
    expect(transition(opened.state, { type: 'interact', target }).state).toEqual(before);
  }
  const away = transition(before, { type: 'room', room: 'quarto' }).state;
  expect(transition(away, { type: 'interact', target: 'drawer' })).toEqual({ state: away, events: [] });
});

it('guarda e recupera o ursinho; gaveta fechada impede pegar ou guardar', () => {
  const before = initialWorld();
  expect(transition(before, { type: 'put', item: 'ursinho', spot: 'drawer' }).state).toEqual(before);
  const open = transition(before, { type: 'interact', target: 'drawer' }).state;
  const stored = transition(open, { type: 'put', item: 'ursinho', spot: 'drawer' }).state;
  expect(stored.items[3]).toMatchObject({ spot: 'drawer', holder: null, room: 'sala' });
  const closed = transition(stored, { type: 'interact', target: 'drawer' }).state;
  for (const type of ['pick', 'give'] as const) expect(transition(closed, { type, actor: 'bia', item: 'ursinho' }).state).toEqual(closed);
  expect(transition(closed, { type: 'place', item: 'ursinho', point: { x: 800, y: 450 } }).state).toEqual(closed);
  const held = transition(stored, { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  expect(held.items[3]).toMatchObject({ spot: 'floor', holder: 'bia' });
  expect(before.items[3]?.spot).toBe('floor');
});

it('pega lanche da geladeira, coloca na mesa e come sem duplicar', () => {
  const before = initialWorld();
  const closed = transition(before, { type: 'interact', target: 'fridge' }).state;
  expect(transition(closed, { type: 'pick', actor: 'bia', item: 'lanche' }).state).toEqual(closed);
  const table = transition(before, { type: 'put', item: 'lanche', spot: 'table' }).state;
  expect(table.items[0]).toMatchObject({ spot: 'table', holder: null, x: 260, y: 475 });
  const fed = transition(table, { type: 'give', actor: 'bia', item: 'lanche' }).state;
  expect(fed.actors[0]?.fed).toBe(true);
  expect(fed.items[0]).toMatchObject({ spot: 'fridge', room: 'sala', holder: null });
  expect(fed.items).toHaveLength(4);
  expect(transition(before, { type: 'put', item: 'ursinho', spot: 'fridge' }).state).toEqual(before);
});

it('assentos acomodam uma pessoa, acordam ao levantar e respeitam cômodo', () => {
  const before = initialWorld();
  const seated = transition(before, { type: 'sit', actor: 'bia', seat: 'sofa-left' }).state;
  expect(seated.actors[0]).toMatchObject({ seat: 'sofa-left', x: 150, y: 405, resting: false });
  expect(transition(seated, { type: 'sit', actor: 'luna', seat: 'sofa-left' }).state).toEqual(seated);
  expect(transition(seated, { type: 'sit', actor: 'bia', seat: 'bed' }).state).toEqual(seated);
  const moved = transition(seated, { type: 'move', actor: 'bia', point: { x: 500, y: 480 } }).state;
  expect(moved.actors[0]?.seat).toBeNull();
  const room = transition(seated, { type: 'room', room: 'quarto' }).state;
  expect(transition(room, { type: 'sit', actor: 'bia', seat: 'bed' }).state).toEqual(room);
  const all = transition(room, { type: 'summon' }).state;
  expect(all.actors.every(a => a.seat === null)).toBe(true);
  const sleep = transition(all, { type: 'sit', actor: 'mimi', seat: 'bed' }).state;
  expect(sleep.actors[4]).toMatchObject({ seat: 'bed', resting: true });
});

it('recusa destinos inacessíveis, objetos ausentes e conteúdo escondido', () => {
  const before = initialWorld();
  const missing = { ...before, items: [] };
  expect(transition(missing, { type: 'put', item: 'ursinho', spot: 'table' })).toEqual({ state: missing, events: [] });
  const away = transition(before, { type: 'room', room: 'quarto' }).state;
  expect(transition(away, { type: 'put', item: 'ursinho', spot: 'table' })).toEqual({ state: away, events: [] });
  const closed = transition(before, { type: 'interact', target: 'fridge' }).state;
  expect(transition(closed, { type: 'put', item: 'lanche', spot: 'table' })).toEqual({ state: closed, events: [] });
  const elsewhere = structuredClone(before); elsewhere.items[3]!.room = 'quarto';
  expect(transition(elsewhere, { type: 'put', item: 'ursinho', spot: 'table' })).toEqual({ state: elsewhere, events: [] });
});

it('devolve ambas comidas à geladeira e permite guardar objetos da mão', () => {
  for (const [item, y] of [['lanche', 310], ['peixe', 360]] as const) {
    const held = transition(initialWorld(), { type: 'pick', actor: 'bia', item }).state;
    const result = transition(held, { type: 'put', item, spot: 'fridge' });
    expect(result.state.items.find(i => i.id === item)).toMatchObject({ spot: 'fridge', holder: null, room: 'sala', x: 680, y });
    expect(result.events).toEqual([{ type: 'dropped' }]);
    expect(held.items.find(i => i.id === item)?.holder).toBe('bia');
  }
  const held = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  const hidden = structuredClone(held); hidden.actors[0]!.room = 'quarto';
  expect(transition(hidden, { type: 'put', item: 'ursinho', spot: 'table' })).toEqual({ state: hidden, events: [] });
  const result = transition(held, { type: 'put', item: 'ursinho', spot: 'table' }).state;
  expect(result.items[3]).toMatchObject({ spot: 'table', holder: null, x: 350, y: 475 });
});

it('sentar novamente no próprio lugar é válido e não afeta os demais', () => {
  const before = initialWorld();
  const seated = transition(before, { type: 'sit', actor: 'bia', seat: 'sofa-right' }).state;
  expect(seated.actors[0]).toMatchObject({ seat: 'sofa-right', x: 245, y: 405, room: 'sala', resting: false });
  expect(seated.actors.slice(1)).toEqual(before.actors.slice(1));
  expect(transition(seated, { type: 'sit', actor: 'bia', seat: 'sofa-right' }).state).toEqual(seated);
});
