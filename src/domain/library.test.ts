import { describe, expect, it } from 'vitest';
import { booksOut, borrow, readers, reading, shelve, startReading, loanSlots } from './library';
import { localWorld, migrateNeighborhood, neighborhoodAction, storeWorld } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld, transition } from './world';
import { needsOf } from './needs';
import type { Neighborhood } from './neighborhood-types';
import type { ActorId, RoomId, SeatRef } from './types';

const classroom = { kind: 'interior' as const, building: 2, room: 'quarto' as const };
/** A school next door; Bia and Léo stand in its classroom with empty hands (the view there). */
function school(): Neighborhood {
  const built = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
  return { ...built, location: classroom, items: built.items.map(i => ({ ...i, holder: null })),
    actors: built.actors.map(a => ['bia', 'leo'].includes(a.id) ? { ...a, seat: null, location: classroom, room: 'quarto' as const, x: 500, y: 520 } : a) };
}
const shelfIn = (t: Neighborhood, room: RoomId = 'quarto') => t.buildings[1]!.layout.pieces.find(p => p.room === room && p.kind === 'bookcase')!.id;
const book = (t: Neighborhood, who: ActorId = 'bia') => t.items.find(i => i.kind === 'livro' && i.holder === who);

describe('os livros da estante (lote 8C)', () => {
  it('tocar na estante põe um livro na mão, emprestado daquela estante, e a estante fica com um a menos', () => {
    const before = school(), shelf = shelfIn(before), result = borrow(before, 'bia', shelf);
    expect(result.outcome).toBe('took');
    expect(book(result.town)).toMatchObject({ kind: 'livro', holder: 'bia', spot: 'floor', location: classroom, loan: { building: 2, piece: shelf, slot: 0 } });
    expect(result.town.nextItem).toBe(before.nextItem + 1);
    expect(booksOut(result.town, 2, shelf)).toEqual([0]);
    expect(booksOut(result.town, 2, shelfIn(before, 'room-3' as RoomId))).toEqual([]);
  });
  it('cada livro tem a sua capa: o segundo leitor leva o próximo lugar livre', () => {
    const shelf = shelfIn(school()), first = borrow(school(), 'bia', shelf).town, second = borrow(first, 'leo', shelf).town;
    expect(book(second, 'leo')!.loan).toMatchObject({ slot: 1 });
    expect(booksOut(second, 2, shelf)).toEqual([0, 1]);
  });
  it('com um livro na mão, tocar na estante devolve o livro; com outra coisa na mão, falta mão livre', () => {
    const shelf = shelfIn(school()), lent = borrow(school(), 'bia', shelf).town, back = borrow(lent, 'bia', shelf);
    expect(back.outcome).toBe('returned');
    expect(back.town.items.some(i => i.kind === 'livro')).toBe(false);
    const busy = { ...school(), items: [...school().items, { id: '90:bola' as const, kind: 'bola' as const, room: 'quarto' as const, location: classroom, x: 500, y: 520, holder: 'bia' as const, spot: 'floor' as const }] };
    expect(borrow(busy, 'bia', shelf)).toEqual({ town: busy, outcome: 'hands' });
  });
  it(`a estante empresta no máximo ${loanSlots}; vazia, os livros largados voltam para ela antes do próximo`, () => {
    const shelf = shelfIn(school());
    let town = school();
    for (let n = 0; n < loanSlots; n++) town = borrow({ ...town, items: town.items.map(i => i.holder === 'bia' ? { ...i, holder: null } : i) }, 'bia', shelf).town;
    const dropped = { ...town, items: town.items.map(i => i.holder === 'bia' ? { ...i, holder: null } : i) };
    expect(booksOut(dropped, 2, shelf)).toEqual([0, 1, 2]);
    const again = borrow(dropped, 'bia', shelf);
    expect(again.outcome).toBe('took');
    expect(again.town.items.filter(i => i.kind === 'livro')).toHaveLength(1);
    expect(book(again.town)!.loan!.slot).toBe(0);
  });
  it('fora da sala da estante, ou com os 3 livros em mãos, a estante não empresta', () => {
    const shelf = shelfIn(school());
    const street = { ...school(), location: { kind: 'street' as const } };
    expect(borrow(street, 'bia', shelf)).toEqual({ town: street, outcome: 'none' });
    expect(borrow(school(), 'rui', shelf).outcome).toBe('none');
    expect(borrow(school(), 'bia', 999).outcome).toBe('none');
    const held = ['bia', 'leo', 'luna'].reduce((t, who) => borrow({ ...t, actors: t.actors.map(a => a.id === who ? { ...a, location: classroom, room: 'quarto' as const } : a) }, who as ActorId, shelf).town, school());
    expect(booksOut(held, 2, shelf)).toEqual([0, 1, 2]);
    const full = { ...held, actors: held.actors.map(a => a.id === 'rui' ? { ...a, location: classroom, room: 'quarto' as const } : a) };
    expect(borrow(full, 'rui', shelf)).toEqual({ town: full, outcome: 'none' });
  });
  it('soltar o livro sobre a estante o guarda; outra peça, outro objeto ou fora da vista não', () => {
    const shelf = shelfIn(school()), lent = borrow(school(), 'bia', shelf).town, id = book(lent)!.id;
    expect(shelve(lent, id, shelf).town.items.some(i => i.id === id)).toBe(false);
    expect(shelve(lent, id, 999).town).toBe(lent);
    expect(shelve(lent, '1:microfone', shelf).town).toBe(lent);
    const away = { ...lent, location: { kind: 'street' as const } };
    expect(shelve(away, id, shelf).town).toBe(away);
  });
  it('fora da escola: a estante da sala de casa empresta do mesmo jeito', () => {
    const home = { kind: 'interior' as const, building: 1, room: 'sala' as const };
    const built = school(), layout = built.buildings[0]!.layout;
    const town = { ...built, location: home, buildings: built.buildings.map(b => b.id === 1 ? { ...b, layout: { ...layout, pieces: [...layout.pieces, { id: 50, kind: 'bookcase' as const, room: 'sala' as const, x: 300, y: 200, color: 'original' as const, flipped: false }] } } : b),
      actors: built.actors.map(a => a.id === 'bia' ? { ...a, location: home, room: 'sala' as const } : a) };
    expect(book(borrow(town, 'bia', 50).town)!.loan).toEqual({ building: 1, piece: 50, slot: 0 });
  });
  it('o livro emprestado vai para casa na mão de quem leva, e a estante da escola continua com a falta', () => {
    const shelf = shelfIn(school()), lent = borrow(school(), 'bia', shelf).town;
    const home = { kind: 'interior' as const, building: 1, room: 'sala' as const };
    const moved = neighborhoodAction(lent, { type: 'transport', actor: 'bia', location: home, point: { x: 500, y: 520 } });
    expect(book(moved)!.location).toEqual(home);
    expect(booksOut(moved, 2, shelf)).toEqual([0]);
  });
});

describe('ler sentada (lote 8C)', () => {
  const seated = (t: Neighborhood, who: ActorId, seat: SeatRef) => transition(localWorld(t), { type: 'sit', actor: who, seat });
  const deskSeat = (t: Neighborhood): SeatRef => `${t.buildings[1]!.layout.pieces.find(p => p.room === 'quarto' && p.kind === 'school-desk')!.id}.0`;
  it('com um livro na mão, sentar na carteira é ler: o tédio cai 30 e ela fala de leitura em vez de descanso', () => {
    const lent = borrow(school(), 'bia', shelfIn(school())).town, world = localWorld(lent);
    const bored = { ...world, actors: world.actors.map(a => a.id === 'bia' ? { ...a, needs: { fome: 20, sono: 0, tedio: 70, alegria: 0 } } : a) };
    const result = transition(bored, { type: 'sit', actor: 'bia', seat: deskSeat(lent) });
    const bia = result.state.actors.find(a => a.id === 'bia')!;
    expect(reading(result.state, bia)).toBe(true);
    expect(needsOf(bia).tedio).toBe(40);
    expect(result.events).toEqual([{ type: 'read', actor: 'bia' }]);
    // The relief reaches the neighborhood with the rest of the world.
    expect(needsOf(storeWorld(lent, result.state).actors.find(a => a.id === 'bia')!).tedio).toBe(40);
  });
  it('sem livro, sentar é só sentar; e quem já lê não lê de novo ao trocar de nada', () => {
    const plain = seated(school(), 'bia', deskSeat(school()));
    expect(plain.events).toEqual([{ type: 'rested', actor: 'bia' }]);
    const lent = borrow(school(), 'bia', shelfIn(school())).town, read = seated(lent, 'bia', deskSeat(lent)).state;
    expect(startReading(read, { state: read, events: [] }).events).toEqual([]);
  });
  it('um livro entregue a quem está sentada também é leitura', () => {
    const lent = borrow(school(), 'bia', shelfIn(school())).town, id = book(lent)!.id;
    const world = seated({ ...lent, items: lent.items.map(i => i.id === id ? { ...i, holder: null, x: 400, y: 520 } : i) }, 'leo', deskSeat(lent)).state;
    const given = transition(world, { type: 'give', actor: 'leo', item: id });
    expect(given.events).toEqual([{ type: 'read', actor: 'leo' }]);
  });
  it('deitada é dormir, não ler; no vaso sanitário ou em pé também não; gato não lê', () => {
    const lent = borrow(school(), 'bia', shelfIn(school())).town, world = localWorld(lent);
    const bia = world.actors.find(a => a.id === 'bia')!;
    expect(reading(world, { ...bia, seat: deskSeat(lent) })).toBe(true);
    expect(reading(world, { ...bia, seat: deskSeat(lent), resting: true })).toBe(false);
    expect(reading(world, bia)).toBe(false);
    expect(reading(world, { ...bia, kind: 'cat', seat: deskSeat(lent) })).toBe(false);
    const toilet = { id: 77, kind: 'toilet' as const, room: 'quarto' as const, x: 700, y: 400, color: 'original' as const, flipped: false };
    expect(reading({ ...world, layout: { ...world.layout, pieces: [...world.layout.pieces, toilet] } }, { ...bia, seat: '77.0' })).toBe(false);
  });
  it('quem lê na sala mostrada são as leitoras dela; a fala de quem não começou a ler fica', () => {
    const lent = borrow(borrow(school(), 'bia', shelfIn(school())).town, 'leo', shelfIn(school())).town;
    const read = seated(lent, 'bia', deskSeat(lent)).state;
    expect(readers(read)).toEqual(['bia']);
    const desk2 = `${lent.buildings[1]!.layout.pieces.filter(p => p.room === 'quarto' && p.kind === 'school-desk')[1]!.id}.0` as SeatRef;
    const both = transition(read, { type: 'sit', actor: 'leo', seat: desk2 }).state;
    expect(readers(both)).toEqual(['bia', 'leo']);
    const events = [{ type: 'rested' as const, actor: 'luna' as const }, { type: 'moved' as const, actor: 'leo' as const }, { type: 'picked' as const, actor: 'leo' as const }, { type: 'show' as const }];
    expect(startReading(read, { state: both, events }).events).toEqual([events[0], events[1], events[3], { type: 'read', actor: 'leo' }]);
  });
});
