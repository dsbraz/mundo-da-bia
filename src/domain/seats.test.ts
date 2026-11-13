import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { editWorld } from './design';
import { addRoom } from './rooms';
import { fixture } from './layout';
import { freeFor, freeSeat, mealSeat, occupant, parseSeat, pieceSeat, seatOfKind, seatPiece, seatPoint, seatsOf, seatsIn, sitsOn } from './seats';
import type { Piece, World } from './types';

const sala = (state: World) => ({ ...state, actors: state.actors.map(a => ({ ...a, room: 'sala' as const, seat: null, x: 500, y: 530 })) });
const withPieces = (state: World, ...pieces: Omit<Piece, 'room' | 'color' | 'flipped'>[]) => ({ ...state, layout: { ...state.layout,
  nextId: 99, pieces: [...state.layout.pieces, ...pieces.map(p => ({ ...p, room: 'sala' as const, color: 'original' as const, flipped: false }))] } });

it('dois sofás no mesmo cômodo dão quatro vagas, cada uma com seu ponto', () => {
  const state = withPieces(sala(initialWorld()), { id: 40, kind: 'sofa', x: 600, y: 270 });
  const seats = seatsIn(state, 'sala').filter(seat => ['sofa'].includes(seatPiece(state, seat)!.kind));
  expect(seats).toEqual(['2.0', '2.1', '40.0', '40.1']);
  expect(seatPoint(state, '40.1')).toEqual({ x: 785, y: 405, room: 'sala' });
  expect(seatPoint(state, '40.2')).toBeUndefined();
  expect(seatPoint(state, '9.0')).toBeUndefined();
});
it('sentar no segundo sofá, numa cadeira e na mesa de piquenique usa a peça escolhida', () => {
  let state = withPieces(sala(initialWorld()), { id: 40, kind: 'sofa', x: 600, y: 270 }, { id: 41, kind: 'chair', x: 380, y: 300 });
  state = transition(state, { type: 'sit', actor: 'bia', seat: '40.1' }).state;
  expect(state.actors[0]).toMatchObject({ seat: '40.1', x: 785, y: 405 });
  const chair = transition(state, { type: 'sit', actor: 'luna', seat: '41.0' });
  expect(chair.state.actors[1]).toMatchObject({ seat: '41.0', ...seatPoint(state, '41.0'), resting: false });
  expect(chair.events).toEqual([{ type: 'rested', actor: 'luna' }]);
  expect(seatsOf(fixture(state, 'sofa')!)).toEqual(['2.0', '2.1']);
});
it('a vaga ocupada passa para a vaga livre da mesma peça e a cadeira cheia deixa em pé ao lado', () => {
  let state = withPieces(sala(initialWorld()), { id: 41, kind: 'chair', x: 380, y: 300 });
  state = transition(state, { type: 'sit', actor: 'bia', seat: '41.0' }).state;
  const taken = transition(state, { type: 'sit', actor: 'luna', seat: '41.0' });
  expect(taken.state.actors[1]!.seat).toBeNull();
  expect(taken.events.at(-1)).toEqual({ type: 'missing', actor: 'luna', need: 'seat', by: 'bia' });
  expect(freeSeat(state, fixture(state, 'chair')!, state.actors[1]!)).toBeUndefined();
  expect(freeSeat(state, fixture(state, 'sofa')!, state.actors[1]!)).toBe('2.0');
});
it('remover a cadeira levanta só quem estava nela; mover a cadeira leva quem está sentado', () => {
  let state = withPieces(sala(initialWorld()), { id: 41, kind: 'chair', x: 380, y: 300 });
  state = transition(state, { type: 'sit', actor: 'bia', seat: '41.0' }).state;
  state = transition(state, { type: 'sit', actor: 'luna', seat: '2.0' }).state;
  const moved = editWorld(state, { type: 'move', id: 41, point: { x: 680, y: 370 } });
  expect(moved.actors[0]).toMatchObject({ seat: '41.0', ...seatPoint(moved, '41.0') });
  expect(moved.actors[0]!.x).toBe(state.actors[0]!.x + 300);
  const removed = editWorld(moved, { type: 'remove', id: 41 });
  expect(removed.actors[0]).toMatchObject({ seat: null, resting: false });
  expect(removed.actors[1]!.seat).toBe('2.0');
});
it('um segundo sofá e uma segunda cama cabem no mesmo cômodo', () => {
  const state = editWorld(editWorld(initialWorld(), { type: 'clear' }), { type: 'add', kind: 'sofa' });
  const two = editWorld(state, { type: 'add', kind: 'sofa', point: { x: 200, y: 400 } });
  expect(two.layout.pieces.filter(p => p.kind === 'sofa')).toHaveLength(2);
});
it('deitar na segunda cama de um quarto com duas camas deita ali', () => {
  let state = addRoom(initialWorld(), { name: 'Hóspedes', template: 'empty', size: 'medium', cell: 2 });
  state = editWorld(state, { type: 'add', kind: 'bed', point: { x: 400, y: 300 } });
  state = editWorld(state, { type: 'add', kind: 'bed', point: { x: 900, y: 300 } });
  const beds = state.layout.pieces.filter(p => p.kind === 'bed' && p.room === state.room);
  expect(beds).toHaveLength(2);
  state = transition(state, { type: 'travel', actor: 'bia', room: state.room }).state;
  const second = `${beds[1]!.id}.0` as const;
  const lying = transition(state, { type: 'sit', actor: 'bia', seat: second }).state;
  expect(lying.actors[0]).toMatchObject({ seat: second, resting: true, ...seatPoint(lying, second) });
});
it('a caminha é só dos gatos e quem deita nela descansa', () => {
  const state = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
  const all = transition(state, { type: 'summon' }).state, bed = fixture(all, 'cat-bed')!;
  const human = transition(all, { type: 'sit', actor: 'bia', seat: `${bed.id}.0` });
  expect(human.state).toBe(all);
  expect(human.events).toEqual([{ type: 'missing', actor: 'bia', need: 'seat' }]);
  expect(transition(all, { type: 'sit', actor: 'mimi', seat: `${bed.id}.0` }).state.actors[4]).toMatchObject({ seat: `${bed.id}.0`, resting: true });
});
it('uma vaga fora do chão alcançável não senta', () => {
  const state = withPieces(sala(initialWorld()), { id: 42, kind: 'picnic-table', x: 300, y: 450 });
  const result = transition(state, { type: 'sit', actor: 'bia', seat: '42.0' });
  expect(result.state).toBe(state);
  expect(result.events).toEqual([{ type: 'missing', actor: 'bia', need: 'seat' }]);
});
it('o id de vaga é só `<peça>.<vaga>` inteiros sem zero à esquerda; peça que não é assento não tem vaga', () => {
  expect(parseSeat('12.10')).toEqual({ piece: 12, slot: 10 });
  for (const seat of ['x2.0', '2.0x', '02.0', '2.01', 'sofa-left']) expect(parseSeat(seat)).toBeNull();
  const state = initialWorld(), rug = state.layout.pieces.find(p => p.kind === 'rug')!;
  expect(seatPiece(state, `${rug.id}.0`)).toBeUndefined();
});
it('sentar numa peça, ocupar e caber: em outro cômodo ou com id antigo não está nela; a própria pessoa não ocupa a vaga; a caminha não cabe gente', () => {
  const state = transition(sala(initialWorld()), { type: 'sit', actor: 'bia', seat: '2.0' }).state, sofa = fixture(state, 'sofa')!, bia = state.actors[0]!;
  expect(sitsOn(bia, sofa)).toBe(true);
  expect(sitsOn({ ...bia, room: 'quarto' }, sofa)).toBe(false);
  expect(sitsOn({ ...bia, seat: null }, sofa)).toBe(false);
  expect(sitsOn({ ...bia, seat: 'sofa-left' as never }, sofa)).toBe(false);
  expect(occupant(state, bia, '2.0')).toBeUndefined();
  expect(occupant(state, state.actors[1]!, '2.0')).toBe('bia');
  expect(freeFor(state, state.actors[1]!, '2.1')).toBe(true);
  expect(freeFor(state, state.actors[1]!, '99.0')).toBe(false);
  const quarto = { ...state, room: 'quarto' as const }, cat = fixture(quarto, 'cat-bed')!;
  expect(freeFor(quarto, bia, `${cat.id}.0`)).toBe(false);
  expect(freeFor(quarto, state.actors[4]!, `${cat.id}.0`)).toBe(true);
});
it('para comer: fica no assento em que está (menos a cama), senão a cadeira livre mais perto, mesmo longe de um sofá', () => {
  const state = withPieces(sala(initialWorld()), { id: 41, kind: 'chair', x: 100, y: 300 }, { id: 42, kind: 'chair', x: 700, y: 300 });
  const at = (x: number) => ({ ...state.actors[0]!, x });
  expect(mealSeat(state, at(760))).toBe('42.0');
  expect(mealSeat(state, at(150))).toBe('41.0');
  expect(mealSeat(state, at(300))).toBe('41.0');
  const sofa = transition(state, { type: 'sit', actor: 'bia', seat: '2.0' }).state;
  expect(mealSeat(sofa, sofa.actors[0]!)).toBe('2.0');
  expect(mealSeat(sala(initialWorld()), at(0))).toBe('2.0');
  expect(mealSeat(sala(initialWorld()), at(1000))).toBe('2.1');
});
it('sentar numa peça ou num tipo: a primeira vaga livre, senão a primeira (para dizer quem está nela)', () => {
  let state = withPieces(sala(initialWorld()), { id: 41, kind: 'chair', x: 100, y: 300 }, { id: 42, kind: 'chair', x: 700, y: 300 });
  const luna = state.actors[1]!, chair = (id: number) => state.layout.pieces.find(p => p.id === id)!;
  expect(pieceSeat(state, fixture(state, 'sofa')!, luna)).toBe('2.0');
  expect(seatOfKind(state, 'chair', luna)).toBe('41.0');
  state = transition(state, { type: 'sit', actor: 'bia', seat: '41.0' }).state;
  expect(pieceSeat(state, chair(41), luna)).toBe('41.0');
  expect(seatOfKind(state, 'chair', luna)).toBe('42.0');
  state = transition(state, { type: 'sit', actor: 'leo', seat: '42.0' }).state;
  expect(seatOfKind(state, 'chair', luna)).toBe('41.0');
  expect(seatOfKind({ ...state, room: 'quarto' }, 'chair', luna)).toBeUndefined();
});
it.each([['kitchen', 'table'], ['dining', 'picnic-table']] as const)('a %s nova ganha duas cadeiras junto da mesa, com vagas alcançáveis', (template, table) => {
  for (const size of ['small', 'medium', 'large'] as const) {
    const state = addRoom(initialWorld(), { name: 'Nova', template, size, cell: 2 });
    const here = state.layout.pieces.filter(p => p.room === state.room), desk = here.find(p => p.kind === table)!;
    const chairs = here.filter(p => p.kind === 'chair');
    expect(chairs).toHaveLength(2);
    for (const chair of chairs) {
      expect(Math.min(Math.abs(chair.x + 90 - desk.x), Math.abs(chair.x - desk.x - 240))).toBeLessThanOrEqual(200);
      expect(freeSeat(state, chair, state.actors[0]!)).toBe(`${chair.id}.0`);
    }
  }
});
