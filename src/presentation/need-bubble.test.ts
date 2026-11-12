import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import type { ActorId, Needs, World } from '../domain/types';
import { portraitNeed, thoughtIcon, thoughtOf, thoughtShown } from './need-bubble';

const needs = (fome: number, sono = 0, tedio = 0): Needs => ({ fome, sono, tedio, alegria: 0 });
const feeling = (world: World, patch: Partial<Record<ActorId, Needs>>): World =>
  ({ ...world, actors: world.actors.map(a => { const n = patch[a.id]; return n ? { ...a, needs: n } : a; }) });

it('ninguém pedindo nada: nenhuma bolha', () => {
  expect(thoughtOf(initialWorld(), 'bia')).toBeNull();
});
it('uma bolha por cômodo: a de quem está selecionado, se ela pede algo; senão a da necessidade mais alta do cômodo', () => {
  const world = feeling(initialWorld(), { bia: needs(45), leo: needs(20, 0, 90), rui: needs(60) });
  expect(thoughtOf(world, 'bia')).toEqual({ actor: 'bia', need: 'fome', band: 'pede' });
  expect(thoughtOf(world, 'luna')).toEqual({ actor: 'leo', need: 'tedio', band: 'precisa' });
});
it('cada personagem pensa na sua necessidade mais alta; quem dorme ou está noutro cômodo não entra', () => {
  const world = feeling(initialWorld(), { bia: needs(50, 80), luna: needs(95) });
  expect(thoughtOf(world, 'bia')).toEqual({ actor: 'bia', need: 'sono', band: 'precisa' });
  const away = { ...world, actors: world.actors.map(a => a.id === 'luna' ? { ...a, room: 'quarto' as const } : a.id === 'bia' ? { ...a, resting: true } : a) };
  expect(thoughtOf(away, 'bia')).toBeNull();
});
it('em pede a bolha fica 4 s e volta a cada 40 s; em precisa fica fixa', () => {
  expect([0, 3999, 4000, 39_999, 40_000, 43_999, 44_000].map(t => thoughtShown('pede', 1000, 1000 + t))).toEqual([true, true, false, false, true, true, false]);
  expect([0, 5000, 20_000].every(t => thoughtShown('precisa', 0, t))).toBe(true);
});
it('a bolha desenha um prato, um travesseiro ou uma bola, nunca texto', () => {
  expect(thoughtIcon('fome')).toBe('/art/needs.svg#food');
  expect(thoughtIcon('sono')).toBe('/art/needs.svg#pillow');
  expect(thoughtIcon('tedio')).toBe('/icons/bola.svg');
});
it('no retrato da Turma, a bolha pequena é de quem pede algo noutro lugar', () => {
  const world = feeling(initialWorld(), { luna: needs(50), rui: needs(20, 69) });
  const away = { ...world, actors: world.actors.map(a => ['luna', 'rui'].includes(a.id) ? { ...a, room: 'quarto' as const } : a) };
  expect(portraitNeed(away, 'luna')).toBe('fome');
  expect(portraitNeed(away, 'rui')).toBe('sono');
  expect(portraitNeed(world, 'luna')).toBeNull();
  expect(portraitNeed(away, 'bia')).toBeNull();
});
