import { describe, expect, it } from 'vitest';
import { hopCells, hopStep, ropeCue, ropeStep, startGame } from './child-games';

describe('corda sem penalidade ou pontuação', () => {
  it('oferece o primeiro salto após 1,6 segundo e aceita margem de 250 ms', () => {
    const game = startGame('rope', 100);
    expect(ropeCue(game, 1449)).toBe(false);
    expect(ropeCue(game, 1450)).toBe(true);
    expect(ropeStep(game, 1450).feedback).toBe('jump');
    expect(ropeStep(game, 1950).feedback).toBe('jump');
    expect(ropeStep(game, 1951).feedback).toBe('again');
    expect(ropeStep(game, 100).feedback).toBe('again');
  });
  it('não conta contatos repetidos nem salta antes de aterrissar; permite tentar de novo', () => {
    const game = ropeStep(startGame('rope', 0), 1600);
    expect(ropeStep(game, 1601)).toBe(game);
    expect(ropeStep(game, 1850)).toBe(game);
    expect(ropeStep(game, 3200).feedback).toBe('jump');
    const early = ropeStep(startGame('rope', 0), 600);
    expect(ropeStep(early, 1600).feedback).toBe('jump');
    const edge = ropeStep(startGame('rope', 0), 1350);
    expect(ropeStep(edge, 1750)).toBe(edge);
  });
});

describe('amarelinha de ida e volta', () => {
  it('alterna um/dois pés, destaca as casas seguintes e termina ao retornar', () => {
    let game = startGame('hopscotch', 0);
    for (const cells of [[1], [2], [3, 4], [5], [6, 7], [8], [6, 7], [5], [3, 4], [2], [1]]) {
      expect(hopCells(game)).toEqual(cells);
      game = hopStep(game, cells.at(-1)!);
    }
    expect(hopCells(game)).toEqual([]);
    expect(hopStep(game, 1)).toBe(game);
  });
  it('um toque numa casa diferente mantém a próxima indicação, sem reiniciar', () => {
    const game = startGame('hopscotch', 0);
    expect(hopStep(game, 8)).toBe(game);
    expect(hopStep(game, 1).step).toBe(1);
  });
});
