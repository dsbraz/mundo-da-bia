import { expect, it, vi } from 'vitest';
import { townActions } from './town-actions';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood } from '../domain/neighborhood';
import type { Neighborhood } from '../domain/neighborhood-types';

function setup(town: Neighborhood) {
  let current = town;
  const deps = { town: () => current, selected: () => 'bia' as const, commit: vi.fn((next: Neighborhood) => { current = next; }), quiet: vi.fn((next: Neighborhood) => { current = next; }), feel: vi.fn((next: Neighborhood) => { current = next; }),
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

it('atravessar uma porta: a porta balança e quem veio sai andando só depois que o novo lugar foi pintado (sob a cobertura da transição)', () => {
  const { actions, deps } = setup(migrateNeighborhood(initialAlbum(initialWorld())));
  let painted: (() => void) | undefined;
  deps.refresh.mockImplementation((then?: () => void) => { painted = then; });
  actions.dispatch({ type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: 400, y: 480 } });
  const outdoor = (deps.scene as unknown as { outdoor: { arrive: ReturnType<typeof vi.fn> } }).outdoor;
  expect(outdoor.arrive).not.toHaveBeenCalled(); expect(deps.cue).toHaveBeenCalledWith('door');
  painted!();
  expect(outdoor.arrive).toHaveBeenCalledWith({ kind: 'interior', building: 1, room: 'sala' }, 'bia');
});

it('o tick com tempo de Brincar faz a vida seguir em silêncio, só nas necessidades; sem ele (Criar) nada muda', () => {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const { actions, deps, current } = setup(town);
  actions.tick(1000);
  expect(deps.feel).not.toHaveBeenCalled();
  actions.tick(31_000, { elapsed: 30_000, phase: 'manha' });
  expect(deps.feel).toHaveBeenCalledTimes(1);
  expect(current().actors.find(a => a.id === 'bia')!.needs).toEqual({ fome: 23, sono: 1, tedio: 0, alegria: 0 });
  actions.tick(31_000, { elapsed: 0, phase: 'manha' });
  expect(deps.feel).toHaveBeenCalledTimes(1);
  expect(deps.quiet).not.toHaveBeenCalled(); expect(deps.commit).not.toHaveBeenCalled(); expect(deps.interrupt).not.toHaveBeenCalled();
  expect(actions.canUndo()).toBe(false);
});
it('W3L-13: o tédio só cresce para quem ficou parado desde o tick anterior (mesmo lugar, acordado)', () => {
  const { actions, current } = setup(migrateNeighborhood(initialAlbum(initialWorld())));
  const life = { elapsed: 60_000, phase: 'manha' as const };
  const boredom = (id: string) => Math.round((current().actors.find(a => a.id === id)!.needs?.tedio ?? 0) * 100) / 100;
  actions.tick(60_000, life);
  // The first tick has nothing to compare with: nobody counts as still yet.
  expect(boredom('bia')).toBe(0);
  actions.tick(120_000, life);
  expect([boredom('bia'), boredom('rui')]).toEqual([3.5, 4.9]);
  const moved = current(); moved.actors = moved.actors.map(a => a.id === 'bia' ? { ...a, x: a.x + 40 } : a.id === 'leo' ? { ...a, resting: true } : a);
  actions.tick(180_000, life);
  expect([boredom('bia'), boredom('leo'), boredom('luna')]).toEqual([3.5, 3.5, 7]);
});
it('W3L-13: quem está numa brincadeira parada ou no balanço não está parado à toa', () => {
  const { deps, current } = setup(migrateNeighborhood(initialAlbum(initialWorld())));
  const life = { elapsed: 60_000, phase: 'manha' as const }, boredom = (id: string) => current().actors.find(a => a.id === id)!.needs?.tedio ?? 0;
  Object.assign(deps, { busy: () => ['luna'] });
  const fresh = townActions(deps as never);
  fresh.tick(60_000, life); fresh.tick(120_000, life);
  expect([boredom('luna'), boredom('bia')]).toEqual([0, 3.5]);
});
it('W3L-13: brincar mexe só nas necessidades, em silêncio (sem salvar nem repintar)', () => {
  const { actions, deps, current } = setup(migrateNeighborhood(initialAlbum(initialWorld())));
  actions.enjoy('rui', 'bola');
  expect(deps.feel).toHaveBeenCalledTimes(1);
  expect(current().actors.find(a => a.id === 'rui')!.needs?.alegria).toBe(60_000);
  expect(deps.commit).not.toHaveBeenCalled(); expect(deps.refresh).not.toHaveBeenCalled();
});
