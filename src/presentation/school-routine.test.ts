import { describe, expect, it } from 'vitest';
import { handUp, lessonMs } from './lesson';
import { fridgeDrawings } from './school-art';
import { schoolBells } from './day-night';
import { suggestionIcon } from './routine-bubble';
import { schoolBellPoint } from './panoramic-facade';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import type { World } from '../domain/types';

describe('a aula no quadro (W3L-26)', () => {
  it('entre os trechos de copiar no caderno, uma criança por vez levanta a mão; com movimento reduzido ninguém se mexe', () => {
    expect([0, 1, 2].map(n => handUp(n, 0, false))).toEqual([false, false, false]);
    expect([0, 1, 2].map(n => handUp(n, 6000, false))).toEqual([true, false, false]);
    expect([0, 1, 2].map(n => handUp(n, 7200, false))).toEqual([false, true, false]);
    expect([0, 1].map(n => handUp(n, 6000, true))).toEqual([false, false]);
    expect(lessonMs).toBe(20_000);
  });
  it('a porta da geladeira de casa mostra os 4 desenhos mais novos; sem geladeira, ou no mercado, nenhum', () => {
    const home = initialWorld();
    expect(fridgeDrawings(home, ['sol', 'gato', 'casa', 'flor', 'lua'])).toEqual(['gato', 'casa', 'flor', 'lua']);
    expect(fridgeDrawings(home, ['sol', 'palavra-gato', 'conta-2-3'])).toEqual(['sol', 'palavra-gato', 'conta-2-3']);
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
