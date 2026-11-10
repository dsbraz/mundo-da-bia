import { afterEach, expect, it, vi } from 'vitest';
import { bubbleExit, followFactor, reducedMotion, reducedQuery } from './motion';
afterEach(() => vi.unstubAllGlobals());

it('lê a preferência do sistema numa consulta única', () => {
  const asked: string[] = [];
  vi.stubGlobal('matchMedia', (query: string) => { asked.push(query); return { matches: true }; });
  expect(reducedMotion()).toBe(true);
  vi.stubGlobal('matchMedia', (query: string) => { asked.push(query); return { matches: false }; });
  expect(reducedMotion()).toBe(false);
  expect(new Set(asked)).toEqual(new Set([reducedQuery]));
  vi.stubGlobal('matchMedia', undefined);
  expect(reducedMotion()).toBe(false);
});
it('segue a câmera pelo tempo, igual em 30 e 60 quadros por segundo', () => {
  const sixty = 1 - (1 - followFactor(1000 / 60, false)) ** 2;
  expect(followFactor(1000 / 30, false)).toBeCloseTo(sixty, 10);
  expect(followFactor(1000 / 60, false)).toBeCloseTo(.12, 10);
  expect(followFactor(0, false)).toBe(0);
});
it('corta a câmera de uma vez com movimento reduzido', () => {
  expect(followFactor(1000 / 60, true)).toBe(1);
  expect(followFactor(0, true)).toBe(1);
});
it('balão sobe e esmaece, ou fica parado e só esmaece em 120 ms', () => {
  expect(bubbleExit(300, 24, 1300, false)).toEqual({ y: 276, alpha: 0, delay: 0, duration: 1300 });
  expect(bubbleExit(300, 24, 1300, true)).toEqual({ y: 300, alpha: 0, delay: 1180, duration: 120 });
});
