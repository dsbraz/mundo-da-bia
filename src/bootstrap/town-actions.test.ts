import { expect, it, vi } from 'vitest';
import { townActions } from './town-actions';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood } from '../domain/neighborhood';
import type { Neighborhood } from '../domain/neighborhood-types';

function setup(town: Neighborhood) {
  let current = town;
  const deps = { town: () => current, selected: () => 'bia' as const, commit: vi.fn((next: Neighborhood) => { current = next; }), quiet: vi.fn((next: Neighborhood) => { current = next; }),
    camera: () => 0, setCamera: vi.fn(), refresh: vi.fn(), interrupt: vi.fn(), pause: vi.fn(), cue: vi.fn(),
    scene: { captureMotion: () => () => {}, outdoor: { arrive: vi.fn(), reaction: vi.fn() }, neighborhood: vi.fn(), paint: vi.fn() } as never,
    structure: { open: vi.fn(), refresh: vi.fn() } };
  return { actions: townActions(deps), deps, current: () => current };
}

it('o tick que faz uma planta crescer só troca o bairro em silêncio: sem repintar a cena, interromper quem anda nem entrar no desfazer', () => {
  const base = migrateNeighborhood(initialAlbum(initialWorld()));
  const town = { ...base, progress: { ...base.progress, plaza: { 'praca-1': { crop: 'alface' as const, stage: 0 as const, since: 0, watered: true } } } };
  const { actions, deps, current } = setup(town);
  actions.tick(60_000);
  expect(deps.quiet).not.toHaveBeenCalled();
  actions.tick(120_000);
  expect(deps.quiet).toHaveBeenCalledTimes(1);
  expect(current().progress.plaza['praca-1']).toEqual({ crop: 'alface', stage: 1, since: 120_000, watered: false });
  expect(deps.commit).not.toHaveBeenCalled(); expect(deps.refresh).not.toHaveBeenCalled(); expect(deps.interrupt).not.toHaveBeenCalled();
  expect(actions.canUndo()).toBe(false);
});
