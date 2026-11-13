import { describe, expect, it } from 'vitest';
import { destination, placeOf, suggestion } from './routine';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import type { Needs } from './types';
import type { Neighborhood } from './neighborhood-types';

const needs = (patch: Partial<Needs> = {}): Needs => ({ fome: 20, sono: 0, tedio: 0, alegria: 0, ...patch });
const child = (patch: Partial<Needs> = {}) => ({ kind: 'human' as const, needs: needs(patch) });
const town = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const withSchool = () => neighborhoodAction(town(), { type: 'construct', plot: 1, model: 'school' });

describe('a rotina do dia (W3L-27): necessidades primeiro, depois a hora do dia', () => {
  it('de manhã, criança bem e em casa → mochila (escola); adulto em casa → pasta', () => {
    expect(suggestion('manha', child(), 'home')).toBe('mochila');
    expect(suggestion('manha', child(), 'home', true)).toBe('pasta');
  });
  it('de manhã, já na escola ou na rua, a mochila não aparece', () => {
    expect(suggestion('manha', child(), 'school')).toBeNull();
    expect(suggestion('manha', child(), 'street')).toBeNull();
  });
  it('a tarde é de brincar (bola), o entardecer de jantar (prato) e a noite de dormir (travesseiro); o amanhecer não sugere', () => {
    expect(suggestion('tarde', child(), 'home')).toBe('bola');
    expect(suggestion('tarde', child(), 'street')).toBeNull();
    expect(suggestion('entardecer', child(), 'school')).toBe('prato');
    expect(suggestion('noite', child(), 'home')).toBe('travesseiro');
    expect(suggestion('amanhecer', child(), 'home')).toBeNull();
  });
  it('uma necessidade em pede ou precisa sempre vence a sugestão da hora', () => {
    expect(suggestion('manha', child({ fome: 70 }), 'home')).toBe('prato');
    expect(suggestion('manha', child({ fome: 45 }), 'home')).toBe('prato');
    expect(suggestion('noite', child({ sono: 45 }), 'street')).toBe('travesseiro');
    expect(suggestion('manha', child({ tedio: 50 }), 'school')).toBe('bola');
    expect(suggestion('tarde', child({ fome: 50, sono: 75 }), 'home')).toBe('travesseiro');
  });
  it('gato não tem rotina', () => {
    expect(suggestion('manha', { kind: 'cat', needs: needs({ fome: 90 }) }, 'home')).toBeNull();
  });
  it('onde ela está: em casa, na escola, na rua ou em outro lugar', () => {
    const t = withSchool();
    expect(placeOf(t, { kind: 'interior', building: 1, room: 'sala' })).toBe('home');
    expect(placeOf(t, { kind: 'interior', building: 2, room: 'sala' })).toBe('school');
    expect(placeOf(t, { kind: 'street' })).toBe('street');
    expect(placeOf(neighborhoodAction(t, { type: 'construct', plot: 2, model: 'office' }), { kind: 'interior', building: 3, room: 'sala' })).toBe('away');
  });
  it('para onde a sugestão leva no Mapa: a escola, a rua (praça) ou a Minha casa; sem escola, a mochila não leva a lugar nenhum', () => {
    const t = withSchool();
    expect(destination(t, 'mochila')).toEqual({ kind: 'building', building: 2 });
    expect(destination(town(), 'mochila')).toBeNull();
    expect(destination(t, 'bola')).toEqual({ kind: 'street' });
    expect(destination(t, 'prato')).toEqual({ kind: 'building', building: 1 });
    expect(destination(t, 'travesseiro')).toEqual({ kind: 'building', building: 1 });
    expect(destination(t, 'pasta')).toBeNull();
    expect(destination(neighborhoodAction(t, { type: 'construct', plot: 2, model: 'office' }), 'pasta')).toEqual({ kind: 'building', building: 3 });
  });
  it('quem já está lá não ganha sugestão para onde está: com fome em casa, a bolha da fome basta', () => {
    const t = withSchool();
    expect(destination(t, 'prato', { kind: 'interior', building: 1, room: 'quarto' })).toBeNull();
    expect(destination(t, 'bola', { kind: 'street' })).toBeNull();
    expect(destination(t, 'mochila', { kind: 'interior', building: 2, room: 'sala' })).toBeNull();
    expect(destination(t, 'mochila', { kind: 'interior', building: 1, room: 'sala' })).toEqual({ kind: 'building', building: 2 });
    expect(destination(t, 'prato', { kind: 'street' })).toEqual({ kind: 'building', building: 1 });
  });
});
