import { describe, expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { usableKinds } from './use';
import { pieceKinds } from './types';
import type { Piece, PieceKind, World } from './types';

/** The living room with one piece of `kind` (id 900), a sofa (id 901) and a quarto piano (id 902). */
function withPiece(kind: PieceKind, active?: boolean): World {
  const world = initialWorld();
  const piece: Piece = { id: 900, kind, room: 'sala', x: 300, y: 300, color: 'original', flipped: false, ...(active === undefined ? {} : { active }) };
  const others: Piece[] = [{ id: 901, kind: 'sofa', room: 'sala', x: 40, y: 300, color: 'original', flipped: false }, { id: 902, kind: 'piano', room: 'quarto', x: 40, y: 300, color: 'original', flipped: false }];
  return { ...world, layout: { ...world.layout, pieces: [piece, ...others] } };
}
const piece = (world: World, id = 900) => world.layout.pieces.find(p => p.id === id)!;
const newKinds = ['sink', 'washer', 'planter', 'bookcase', 'picnic-table'] as const;
const oldKinds = ['bath', 'desk', 'speaker', 'mirror', 'piano', 'tv', 'aquarium', 'reading-lamp'] as const;

describe('móveis que respondem a usar', () => {
  it('a lista de usáveis é a antiga mais pia, lavadora, horta, estante de livros e mesa de piquenique; fogão e carrinho abrem a bancada', () => {
    expect([...usableKinds].sort()).toEqual([...oldKinds, ...newKinds].sort());
    expect(usableKinds).not.toContain('stove'); expect(usableKinds).not.toContain('kitchen-cart');
  });
  it.each([...oldKinds, ...newKinds])('%s liga e desliga só com active, avisando a peça usada', kind => {
    const before = withPiece(kind);
    const on = transition(before, { type: 'use', id: 900 });
    expect(piece(on.state)).toEqual({ ...piece(before), active: true });
    expect(on.events).toEqual([{ type: 'furniture', piece: 900 }]);
    expect(on.state.actors).toEqual(before.actors);
    expect(on.state.items).toEqual(before.items);
    expect(piece(on.state, 901)).toBe(piece(before, 901));
    expect(on.state.layout.rooms).toBe(before.layout.rooms);
    expect(on.state.show).toBe(kind === 'piano');
    const off = transition(on.state, { type: 'use', id: 900 });
    expect(piece(off.state).active).toBe(false);
    expect(off.state.show).toBe(false);
    expect(off.events).toEqual([{ type: 'furniture', piece: 900 }]);
  });
  it.each(pieceKinds.filter(kind => !(usableKinds as readonly string[]).includes(kind)))('%s não responde a usar', kind => {
    const before = withPiece(kind);
    expect(transition(before, { type: 'use', id: 900 })).toEqual({ state: before, events: [] });
  });
  it('não usa peça de outro cômodo nem peça que não existe', () => {
    const before = withPiece('sink');
    expect(transition(before, { type: 'use', id: 902 })).toEqual({ state: before, events: [] });
    expect(transition(before, { type: 'use', id: 999 })).toEqual({ state: before, events: [] });
  });
  it('desligar o piano encerra o show; outra peça não mexe num show em curso', () => {
    const showing = { ...withPiece('sink'), show: true };
    expect(transition(showing, { type: 'use', id: 900 }).state.show).toBe(true);
    const piano = { ...withPiece('piano', true), show: true };
    expect(transition(piano, { type: 'use', id: 900 }).state.show).toBe(false);
  });
});
