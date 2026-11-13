import { expect, it } from 'vitest';
import { besideMenu, bubblePlace, missingParts } from './missing-bubble';
import { needLine } from '../content/feedback-text';
import type { Need } from '../domain/types';

const needs: Need[] = ['seat', 'place', 'hands', 'food', 'path'];
const lines: Need[] = [...needs, 'stove', 'counter', 'market', 'checkout'];
it('toda recusa desenha o que falta; quem ocupa aparece pelo rosto e a porta quando a peça está em outro cômodo', () => {
  for (const need of needs) expect(missingParts({ need, label: needLine(need) })[0]).toBe(`/art/needs.svg#${need}`);
  expect(missingParts({ need: 'seat', by: 'rui', label: '' })).toEqual(['/art/needs.svg#seat', '/icons/rui.svg']);
  expect(missingParts({ need: 'seat', door: true, label: '' })).toEqual(['/art/needs.svg#seat', '/art/needs.svg#door']);
});
it('as faltas do lote 4 (fogão, bancada, mercado e caixa) vêm da folha do mercado, com a mesma porta', () => {
  for (const need of ['stove', 'counter', 'market', 'checkout'] as Need[]) expect(missingParts({ need, label: needLine(need) })[0]).toBe(`/art/market.svg#${need}`);
  expect(missingParts({ need: 'stove', door: true, label: '' })).toEqual(['/art/market.svg#stove', '/art/needs.svg#door']);
});
it('a frase vai só para o leitor de tela: curta, sem números, e diz quem está no lugar', () => {
  for (const need of lines) { const line = needLine(need); expect(line.split(/\s+/).length).toBeLessThanOrEqual(6); expect(line).not.toMatch(/\d/); }
  expect(needLine('seat', 'Rui')).toContain('Rui');
});
it('a bolha fica inteira dentro da cena, acima do ponto', () => {
  const scene = { left: 0, top: 76, right: 1024, bottom: 700 };
  expect(bubblePlace({ x: 500, y: 300 }, scene)).toEqual({ x: 500, y: 300 });
  expect(bubblePlace({ x: 10, y: 90 }, scene)).toEqual({ x: 100, y: 76 + 120 });
  expect(bubblePlace({ x: 1020, y: 900 }, scene)).toEqual({ x: 924, y: 700 });
});
it('a peça que falta: aqui, em outro cômodo (porta) ou em nenhum lugar (cartão de Criar)', async () => {
  const { initialWorld } = await import('../domain/world');
  const { missingWay } = await import('./missing-bubble');
  const world = initialWorld();
  expect(missingWay(world, 'sofa')).toBe('here');
  expect(missingWay(world, 'bed')).toBe('door');
  expect(missingWay(world, 'piano')).toBe('create');
  expect(missingWay(world, undefined)).toBe('here');
});

it('a bolha do que falta (16 px acima da ponta) também sai de baixo do anel de ações aberto (W3L-15: ela agora é tocável)', () => {
  const size = { width: 200, height: 100 }, menu = { left: 300, right: 600, top: 300, bottom: 400 };
  // Same tip: with the thought bubble's 40 px it clears the ring; with this bubble's 16 px it would cover it, so it goes beside it.
  expect(besideMenu({ x: 450, y: 330 }, size, menu, 1024)).toEqual({ x: 450, y: 330 });
  expect(besideMenu({ x: 450, y: 330 }, size, menu, 1024, 16)).toEqual({ x: 712, y: 330 });
  expect(besideMenu({ x: 450, y: 530 }, size, menu, 1024, 16)).toEqual({ x: 450, y: 530 });
});
