import { describe, expect, it } from 'vitest';
import { handUp, lessonMs, lessonProgress } from './lesson';
import { fridgeDrawings } from './school-art';
import { schoolBells } from './day-night';
import { suggestionIcon } from './routine-bubble';
import { schoolBellPoint } from './panoramic-facade';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import type { World } from '../domain/types';

describe('a aula no quadro (W3L-26)', () => {
  it('o desenho aparece da esquerda para a direita em 20 s; com movimento reduzido já pronto', () => {
    expect(lessonProgress(1000, 1000, false)).toBe(0);
    expect(lessonProgress(1000, 1000 + lessonMs / 2, false)).toBe(.5);
    expect(lessonProgress(1000, 1000 + lessonMs * 2, false)).toBe(1);
    expect(lessonProgress(1000, 500, false)).toBe(0);
    expect(lessonProgress(1000, 1000, true)).toBe(1);
  });
  it('as mãos levantam alternadas a cada 1,2 s; com movimento reduzido todas ficam levantadas', () => {
    expect([handUp(0, 0, false), handUp(1, 0, false)]).toEqual([true, false]);
    expect([handUp(0, 1200, false), handUp(1, 1200, false)]).toEqual([false, true]);
    expect([handUp(0, 1200, true), handUp(1, 0, true)]).toEqual([true, true]);
  });
  it('a porta da geladeira de casa mostra os 4 desenhos mais novos; sem geladeira, ou no mercado, nenhum', () => {
    const home = initialWorld();
    expect(fridgeDrawings(home, ['sol', 'gato', 'casa', 'flor', 'lua'])).toEqual(['gato', 'casa', 'flor', 'lua']);
    const bare: World = { ...home, layout: { ...home.layout, pieces: home.layout.pieces.filter(p => p.kind !== 'fridge') } };
    expect(fridgeDrawings(bare, ['sol'])).toEqual([]);
  });
});
describe('a rotina do dia (W3L-27)', () => {
  it('de manhã o sino de cada escola brilha no alto da fachada; nas outras horas, ou sem escola, nenhum', () => {
    const town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
    const bells = schoolBells(town, 'manha');
    expect(bells).toHaveLength(1);
    expect(bells[0]!.y).toBe(schoolBellPoint(2).y);
    expect(schoolBells(town, 'tarde')).toEqual([]);
    expect(schoolBells(null, 'manha')).toEqual([]);
    expect(schoolBells(migrateNeighborhood(initialAlbum(initialWorld())), 'manha')).toEqual([]);
  });
  it('cada sugestão tem o seu desenho', () => {
    expect(suggestionIcon('mochila')).toBe('/art/school.svg#mochila');
    expect(suggestionIcon('travesseiro')).toBe('/art/needs.svg#pillow');
  });
});
