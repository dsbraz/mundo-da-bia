import { describe, it, expect } from 'vitest';
import { initialWorld, transition } from './world';
import { reorderRoom } from './rooms';
import { encode, decode } from '../persistence/save';

describe('ateliê: identidade e ordem', () => {
  it('transfere um objeto solto sem duplicar e salva o destino', () => {
    const state = initialWorld();
    const next = transition(state, { type: 'transfer', item: 'ursinho', room: 'quarto', point: { x: 150, y: 500 } }).state;
    expect(next.room).toBe('quarto');
    expect(next.items).toHaveLength(state.items.length);
    expect(next.items.find(i => i.id === 'ursinho')).toEqual({ id: 'ursinho', holder: null, spot: 'floor', room: 'quarto', x: 150, y: 500 });
    expect(state.items.find(i => i.id === 'ursinho')!.room).toBe('sala');
    expect(decode(encode(next))).toEqual(next);
  });
  it('recusa destino inválido, posição inválida, objeto carregado ou fora do cômodo', () => {
    const state = initialWorld();
    for (const room of ['room-99', 'quarto'] as const) {
      const point = room === 'quarto' ? { x: NaN, y: 500 } : { x: 150, y: 500 };
      expect(transition(state, { type: 'transfer', item: 'ursinho', room, point }).state).toBe(state);
    }
    for (const patch of [{ holder: 'bia' as const }, { room: 'quarto' as const }]) {
      const other = { ...state, items: state.items.map(i => i.id === 'ursinho' ? { ...i, ...patch } : i) };
      expect(transition(other, { type: 'transfer', item: 'ursinho', room: 'quarto', point: { x: 150, y: 500 } }).state).toBe(other);
    }
  });
  it('reordena células existentes sem alterar identidades ou visitar', () => {
    const state = initialWorld(); const next = reorderRoom(state, 'quarto', 'sala');
    expect(next.layout.rooms.quarto.cell).toBe(0); expect(next.layout.rooms.sala.cell).toBe(1);
    expect(next.room).toBe('sala'); expect(next.actors).toBe(state.actors);
    expect(reorderRoom(state, 'sala', 'sala')).toBe(state);
    expect(reorderRoom(state, 'room-99', 'sala')).toBe(state);
  });
});
