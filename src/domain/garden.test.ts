import { describe, expect, it } from 'vitest';
import { initialWorld } from './world';
import { initialAlbum } from './houses';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { growMinutes, harvest, nearestPlot, plotSpots, thirsty } from './garden';
import { plazaPlots } from './progress';
import type { PlazaPlot } from './progress';
import type { Neighborhood } from './neighborhood-types';
import { cropIds } from './types';
import type { CropId, Plant } from './types';

const minute = 60_000, day = 24 * 60 * minute;
const start = 1_000_000;
const town = (change: Partial<Neighborhood['progress']> = {}): Neighborhood => {
  const t = migrateNeighborhood(initialAlbum(initialWorld()));
  return { ...t, progress: { ...t.progress, ...change } };
};
const plant = (crop: CropId, stage: Plant['stage'], since: number, watered: boolean): Plant => ({ crop, stage, since, watered });
const at = (t: Neighborhood, plot: PlazaPlot = 'praca-1') => t.progress.plaza[plot];
const act = neighborhoodAction;

describe('plantar', () => {
  it('uma semente que ela tem vai para o canteiro vazio no estágio 0, sem rega', () => {
    const next = act(town(), { type: 'plant', plot: 'praca-2', crop: 'alface', now: start });
    expect(next.progress.plaza).toEqual({ 'praca-2': plant('alface', 0, start, false) });
    // The seed stays in the bag.
    expect(next.progress.seeds).toEqual(['alface', 'tomate', 'cenoura']);
  });
  it('plantar semente que não tem não faz nada', () => {
    const t = town();
    expect(act(t, { type: 'plant', plot: 'praca-1', crop: 'milho', now: start })).toBe(t);
  });
  it('canteiro ocupado, canteiro desconhecido ou relógio inválido não mudam nada', () => {
    const t = town({ plaza: { 'praca-1': plant('tomate', 2, 5, true) } });
    expect(act(t, { type: 'plant', plot: 'praca-1', crop: 'alface', now: start })).toBe(t);
    expect(act(t, { type: 'plant', plot: 'praca-9' as PlazaPlot, crop: 'alface', now: start })).toBe(t);
    for (const now of [Number.NaN, Number.POSITIVE_INFINITY, -1]) expect(act(t, { type: 'plant', plot: 'praca-3', crop: 'alface', now })).toBe(t);
    expect(act(t, { type: 'plant', plot: 'praca-3', crop: 'alface', now: 0 }).progress.plaza['praca-3']).toEqual(plant('alface', 0, 0, false));
  });
});

describe('regar e crescer', () => {
  const watered = () => act(act(town(), { type: 'plant', plot: 'praca-1', crop: 'alface', now: start }), { type: 'water-plot', plot: 'praca-1', now: start + 10 });
  it('regar marca a planta e começa a contar dali', () => {
    expect(at(watered())).toEqual(plant('alface', 0, start + 10, true));
  });
  it('alface regada avança em exatamente 2 min e não avança em 2 min − 1 ms; ao avançar, pede nova rega', () => {
    const t = watered();
    expect(act(t, { type: 'tick', now: start + 10 + 2 * minute - 1 })).toBe(t);
    expect(at(act(t, { type: 'tick', now: start + 10 + 2 * minute }))).toEqual(plant('alface', 1, start + 10 + 2 * minute, false));
  });
  it('cada transição de cada cultura usa a duração da tabela, nas bordas', () => {
    expect(growMinutes).toEqual({ alface: [2, 4, 4, 5], tomate: [3, 7, 10, 10], cenoura: [5, 10, 20, 25], milho: [10, 20, 40, 50],
      morango: [15, 45, 60, 120], abobora: [30, 90, 150, 210] });
    for (const crop of cropIds) for (const stage of [0, 1, 2, 3] as const) {
      const t = town({ seeds: [...cropIds], plaza: { 'praca-4': plant(crop, stage, start, true) } }), wait = growMinutes[crop][stage] * minute;
      expect(act(t, { type: 'tick', now: start + wait - 1 }), `${crop} ${stage}`).toBe(t);
      expect(at(act(t, { type: 'tick', now: start + wait }), 'praca-4'), `${crop} ${stage}`).toEqual(plant(crop, stage + 1 as Plant['stage'], start + wait, false));
    }
  });
  it('sem rega não avança em 30 dias, nunca murcha e continua com sede', () => {
    const t = town({ plaza: { 'praca-1': plant('alface', 1, start, false) } });
    expect(act(t, { type: 'tick', now: start + 30 * day })).toBe(t);
    expect(thirsty(at(t)!)).toBe(true);
  });
  it('relógio adiantado avança só um estágio: cada estágio pede uma rega', () => {
    const t = town({ plaza: { 'praca-1': plant('abobora', 0, start, true) } });
    const later = act(act(t, { type: 'tick', now: start + 365 * day }), { type: 'tick', now: start + 366 * day });
    expect(at(later)).toEqual(plant('abobora', 1, start + 365 * day, false));
  });
  it('relógio para trás rebaseia a planta regada sem avançar, e ela cresce a partir dali', () => {
    const t = town({ plaza: { 'praca-1': plant('alface', 2, start, true), 'praca-2': plant('tomate', 1, start, false) } });
    const back = act(t, { type: 'tick', now: start - 5 * minute });
    expect(at(back)).toEqual(plant('alface', 2, start - 5 * minute, true));
    // The thirsty one has no watering time to go back from: it stays as it was.
    expect(at(back, 'praca-2')).toBe(at(t, 'praca-2'));
    expect(act(back, { type: 'tick', now: start - 5 * minute + 4 * minute - 1 })).toBe(back);
    expect(at(act(back, { type: 'tick', now: start - minute }))!.stage).toBe(3);
  });
  it('regar de novo não reinicia a contagem, e regar canteiro vazio ou planta pronta não faz nada', () => {
    const t = watered();
    expect(act(t, { type: 'water-plot', plot: 'praca-1', now: start + minute })).toBe(t);
    expect(act(t, { type: 'water-plot', plot: 'praca-2', now: start })).toBe(t);
    const ready = town({ plaza: { 'praca-1': plant('alface', 4, start, false) } });
    expect(act(ready, { type: 'water-plot', plot: 'praca-1', now: start + minute })).toBe(ready);
    expect(act(ready, { type: 'tick', now: start + 30 * day })).toBe(ready);
    expect(thirsty(at(ready)!)).toBe(false);
  });
  it('relógio inválido não rega nem cresce: a planta nunca ganha um horário que o save descartaria', () => {
    const t = town({ plaza: { 'praca-1': plant('alface', 0, start, false), 'praca-2': plant('alface', 0, start, true) } });
    for (const now of [Number.NaN, Number.NEGATIVE_INFINITY, -1]) {
      expect(act(t, { type: 'water-plot', plot: 'praca-1', now })).toBe(t);
      expect(act(t, { type: 'tick', now })).toBe(t);
      expect(act(t, { type: 'rain', now })).toBe(t);
    }
  });
  it('um tick sem nada para mudar devolve o mesmo bairro, inclusive no instante exato da rega e com uma pronta marcada como regada', () => {
    const t = town();
    expect(act(t, { type: 'tick', now: start })).toBe(t);
    const same = town({ plaza: { 'praca-1': plant('alface', 1, start, true), 'praca-2': plant('tomate', 4, 0, true) } });
    expect(act(same, { type: 'tick', now: start })).toBe(same);
    expect(act(same, { type: 'tick', now: start + 30 * day }).progress.plaza['praca-2']).toEqual(plant('tomate', 4, 0, true));
  });
  it('regar um canteiro não rega o vizinho com sede', () => {
    const t = town({ plaza: { 'praca-1': plant('alface', 1, 0, false), 'praca-2': plant('tomate', 1, 0, false) } });
    expect(act(t, { type: 'water-plot', plot: 'praca-2', now: start }).progress.plaza).toEqual({ 'praca-1': plant('alface', 1, 0, false), 'praca-2': plant('tomate', 1, start, true) });
  });
});

describe('chuva', () => {
  it('chuva rega todos os canteiros com estágio abaixo de 4, sem reiniciar quem já estava regado', () => {
    const t = town({ plaza: { 'praca-1': plant('alface', 0, 5, false), 'praca-2': plant('tomate', 3, 5, false), 'praca-3': plant('milho', 4, 5, false),
      'praca-4': plant('cenoura', 1, 7, true) } });
    const next = act(t, { type: 'rain', now: start });
    expect(next.progress.plaza).toEqual({ 'praca-1': plant('alface', 0, start, true), 'praca-2': plant('tomate', 3, start, true),
      'praca-3': plant('milho', 4, 5, false), 'praca-4': plant('cenoura', 1, 7, true) });
  });
  it('chuva sem planta com sede não muda nada', () => {
    const t = town({ plaza: { 'praca-3': plant('milho', 4, 5, false) } });
    expect(act(t, { type: 'rain', now: start })).toBe(t);
    const empty = town();
    expect(act(empty, { type: 'rain', now: start })).toBe(empty);
  });
});

describe('colher', () => {
  const ready = (basket: Neighborhood['progress']['basket']) => town({ basket, plaza: { 'praca-2': plant('tomate', 4, 5, false), 'praca-3': plant('alface', 3, 5, true) } });
  it('colheita dá +2 na cesta e esvazia o canteiro; a semente continua no saco', () => {
    const result = harvest(ready({ alface: 1 }), 'praca-2');
    expect(result.amount).toBe(2);
    expect(result.town.progress.basket).toEqual({ alface: 1, tomate: 2 });
    expect(result.town.progress.plaza).toEqual({ 'praca-3': plant('alface', 3, 5, true) });
    expect(result.town.progress.seeds).toEqual(['alface', 'tomate', 'cenoura']);
  });
  it('com teto de 6: entra só o que cabe; sem lugar, a planta continua pronta e nada muda', () => {
    const five = harvest(ready({ tomate: 5 }), 'praca-2');
    expect(five.amount).toBe(1);
    expect(five.town.progress.basket).toEqual({ tomate: 6 });
    expect(five.town.progress.plaza['praca-2']).toBeUndefined();
    const four = harvest(ready({ tomate: 4 }), 'praca-2');
    expect([four.amount, four.town.progress.basket.tomate]).toEqual([2, 6]);
    const full = ready({ tomate: 6 }), none = harvest(full, 'praca-2');
    expect(none).toEqual({ town: full, amount: 0 });
    expect(none.town).toBe(full);
  });
  it('só colhe planta pronta: estágio 3, canteiro vazio ou desconhecido não mudam nada', () => {
    const t = ready({});
    for (const plot of ['praca-3', 'praca-1', 'praca-7'] as PlazaPlot[]) {
      expect(harvest(t, plot)).toEqual({ town: t, amount: 0 });
      expect(act(t, { type: 'harvest', plot })).toBe(t);
    }
  });
  it('pela ação do bairro, colher muda a cesta igual', () => {
    expect(act(ready({}), { type: 'harvest', plot: 'praca-2' }).progress.basket).toEqual({ tomate: 2 });
  });
});

describe('canteiros da praça', () => {
  it('os quatro ficam juntos à direita da praça, dois atrás e dois na frente', () => {
    expect(Object.keys(plotSpots)).toEqual([...plazaPlots]);
    const [a, b, c, d] = plazaPlots.map(p => plotSpots[p]);
    expect(a!.y).toBe(b!.y); expect(c!.y).toBe(d!.y); expect(c!.y).toBeGreaterThan(a!.y);
    expect(a!.x).toBe(c!.x); expect(b!.x).toBe(d!.x); expect(b!.x).toBeGreaterThan(a!.x);
  });
  it('o canteiro mais próximo com sede vem primeiro; sem sede, o mais próximo de todos', () => {
    const near = (p: PlazaPlot) => plotSpots[p];
    expect(nearestPlot(town().progress, near('praca-4'))).toBe('praca-4');
    expect(nearestPlot(town().progress, { x: near('praca-1').x - 50, y: near('praca-1').y })).toBe('praca-1');
    const dry = town({ plaza: { 'praca-2': plant('alface', 1, 0, false), 'praca-3': plant('alface', 1, 0, true), 'praca-4': plant('alface', 4, 0, false) } });
    expect(nearestPlot(dry.progress, near('praca-3'))).toBe('praca-2');
    expect(nearestPlot(dry.progress, near('praca-4'))).toBe('praca-2');
    const both = town({ plaza: { 'praca-1': plant('alface', 0, 0, false), 'praca-4': plant('alface', 2, 0, false) } });
    expect(nearestPlot(both.progress, near('praca-3'))).toBe('praca-1');
    expect(nearestPlot(both.progress, near('praca-2'))).toBe('praca-4');
  });
  it('sede: plantada, abaixo do estágio 4 e sem rega', () => {
    expect(thirsty(plant('alface', 0, 0, false))).toBe(true);
    expect(thirsty(plant('alface', 3, 0, false))).toBe(true);
    expect(thirsty(plant('alface', 3, 0, true))).toBe(false);
    expect(thirsty(plant('alface', 4, 0, false))).toBe(false);
  });
});
