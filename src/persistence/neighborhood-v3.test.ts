import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadNeighborhood, saveNeighborhood } from './storage';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { upgradeToV3 } from './neighborhood-v3';
import { upgradeNeighborhood } from './neighborhood-upgrade';
import { initialProgress } from '../domain/progress';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { migrateNeighborhood } from '../domain/neighborhood';
import type { Neighborhood } from '../domain/neighborhood-types';

const v1 = 'mundo-da-bia:neighborhood:v1', v2 = 'mundo-da-bia:neighborhood:v2', v3 = 'mundo-da-bia:neighborhood:v3', recovery = `${v3}:recovery`;
const rich = readFileSync(new URL('./fixtures/rich-save-v2.json', import.meta.url), 'utf8');
const richTown = JSON.parse(rich).town;
/** A storage that refuses any write to the v1 and v2 keys, so a test fails if they are ever rewritten. */
function storage(entries: [string, string][] = [], failing: string[] = []) {
  const map = new Map(entries);
  return { map, getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => {
    if (key === v1 || key === v2) throw Error(`escreveu ${key}`);
    if (failing.includes(key)) throw Error('quota');
    map.set(key, value);
  } };
}
const omit = (town: Neighborhood) => Object.fromEntries(Object.entries(town).filter(([key]) => key !== 'progress' && key !== 'nextItem'));

it('o fixture rico da v2 migra para um v3 igual ao bairro v2 fora de progress e nextItem', () => {
  const town = upgradeToV3(richTown);
  expect(omit(town)).toEqual(richTown);
  expect(town.progress).toEqual(initialProgress());
  expect(town.nextItem).toBe(Math.max(...richTown.items.map((i: { id: string }) => Number(i.id.split(':')[0]))) + 1);
});
it('o progresso inicial tem todos os campos de 4.2', () => {
  expect(initialProgress()).toEqual({ recipes: [], fancy: [], seeds: ['alface', 'tomate', 'cenoura'], specials: [], basket: {}, plaza: {},
    post: { day: null, next: 0, inbox: [] }, revealed: [], favorites: [], goals: [] });
});
it('carregar o v2 grava o v3 e deixa a chave v2 byte a byte igual, também depois de salvar de novo', () => {
  const port = storage([[v2, rich]]);
  const town = loadNeighborhood(port);
  expect(omit(town)).toEqual(richTown);
  expect(port.map.get(v2)).toBe(rich);
  expect(decodeNeighborhood(port.map.get(v3)!)).toEqual(town);
  expect(JSON.parse(port.map.get(v3)!).version).toBe(3);
  expect(saveNeighborhood({ ...town, progress: { ...town.progress, recipes: ['pizza'] } }, port)).toBe(true);
  expect(port.map.get(v2)).toBe(rich);
  expect(loadNeighborhood(port).progress.recipes).toEqual(['pizza']);
  expect(port.map.has(recovery)).toBe(false);
});
it('o v3 faz round-trip com progresso cheio e planta na horta em caixa', () => {
  const base = upgradeToV3(richTown);
  const planter = { id: 99, kind: 'planter' as const, room: 'sala' as const, x: 500, y: 440, color: 'original' as const, flipped: false,
    plant: { crop: 'tomate' as const, stage: 2 as const, since: 1000, watered: true } };
  const town: Neighborhood = { ...base, buildings: base.buildings.map((b, n) => n ? b : { ...b, layout: { ...b.layout, nextId: 100, pieces: [...b.layout.pieces, planter] } }),
    progress: { recipes: ['pizza', 'curau'], fancy: ['panqueca'], seeds: ['alface', 'milho'], specials: ['mel'], basket: { alface: 2, tomate: 6 },
      plaza: { 'praca-2': { crop: 'alface', stage: 4, since: 5, watered: false } }, post: { day: 20400, next: 3, inbox: [1, 2] },
      revealed: ['sopa-de-legumes'], favorites: ['luna'], goals: ['panqueca'] } };
  expect(decodeNeighborhood(encodeNeighborhood(town))).toEqual(town);
});
it('v3 com conteúdo desconhecido carrega sem ele e com template e modelo padrão', () => {
  const base = upgradeToV3(richTown), building = base.buildings[0]!;
  const robo = { ...building.layout.pieces[0]!, id: 98, kind: 'robo' };
  const raw = { ...base, buildings: [{ ...building, model: 'castelo', layout: { ...building.layout, nextId: 99, pieces: [...building.layout.pieces, robo],
    rooms: { ...building.layout.rooms, quarto: { ...building.layout.rooms.quarto, template: 'castelo' } } } }, ...base.buildings.slice(1)],
  progress: { ...base.progress, recipes: ['lasanha', 'pizza'], seeds: ['kiwi', 'alface'], basket: { kiwi: 3, alface: 1 } } };
  const town = decodeNeighborhood(JSON.stringify({ version: 3, town: raw }))!;
  expect(town.buildings[0]!.model).toBe('house');
  expect(town.buildings[0]!.layout.rooms.quarto.template).toBe('empty');
  expect(town.buildings[0]!.layout.pieces).toEqual(building.layout.pieces);
  expect(town.progress.recipes).toEqual(['pizza']);
  expect(town.progress.seeds).toEqual(['alface']);
  expect(town.progress.basket).toEqual({ alface: 1 });
  expect(town.buildings.slice(1)).toEqual(base.buildings.slice(1));
});
it('v3 corrompido carrega a partir da v2 e deixa o texto em :v3:recovery', () => {
  const broken = '{"version":3,"town":{"plots":3}}';
  const port = storage([[v2, rich], [v3, broken]]);
  const town = loadNeighborhood(port);
  expect(omit(town)).toEqual(richTown);
  expect(port.map.get(recovery)).toBe(broken);
  expect(port.map.get(v2)).toBe(rich);
  expect(decodeNeighborhood(port.map.get(v3)!)).toEqual(town);
});
it('não sobrescreve o v3 corrompido quando a cópia de recuperação falha', () => {
  const broken = '{"version":3,';
  const port = storage([[v2, rich], [v3, broken]], [recovery]);
  const town = loadNeighborhood(port);
  expect(omit(town)).toEqual(richTown);
  expect(saveNeighborhood(town, port)).toBe(false);
  expect(port.map.get(v3)).toBe(broken);
});
it('sem nenhuma chave nasce o bairro inicial com o progresso inicial', () => {
  const port = storage();
  const town = loadNeighborhood(port);
  expect(town.progress).toEqual(initialProgress());
  expect(omit(town)).toEqual(omit(upgradeNeighborhood(migrateNeighborhood(initialAlbum(initialWorld())))));
  expect(port.map.has(v2)).toBe(false);
  expect(decodeNeighborhood(port.map.get(v3)!)).toEqual(town);
});
it('o v1 antigo também migra direto para o v3 sem tocar na v1', () => {
  const old = JSON.stringify({ version: 1, town: migrateNeighborhood(initialAlbum(initialWorld())) });
  const port = storage([[v1, old]]);
  const town = loadNeighborhood(port);
  expect(port.map.get(v1)).toBe(old);
  expect(town.progress).toEqual(initialProgress());
  expect(loadNeighborhood(port)).toEqual(town);
});
it('v3 com planta fora da horta em caixa, planta inválida e assento desconhecido carrega sem eles', () => {
  const base = upgradeToV3(richTown), building = base.buildings[0]!;
  const good = { crop: 'alface', stage: 1, since: 0, watered: false };
  const pieces = [...building.layout.pieces.map((p, n) => n ? p : { ...p, plant: good }),
    { id: 97, kind: 'planter', room: 'sala', x: 300, y: 440, color: 'original', flipped: false, plant: { ...good, crop: 'kiwi' } },
    { id: 98, kind: 'planter', room: 'sala', x: 700, y: 440, color: 'original', flipped: false, plant: good }];
  const actors = base.actors.map(a => a.id === 'leo' ? { ...a, seat: 'banco-da-padaria' } : a);
  const raw = { ...base, actors, buildings: [{ ...building, layout: { ...building.layout, nextId: 99, pieces } }, ...base.buildings.slice(1)], moedas: 9 };
  const town = decodeNeighborhood(JSON.stringify({ version: 3, town: raw }))!;
  const loaded = town.buildings[0]!.layout.pieces;
  expect(loaded[0]).toEqual(building.layout.pieces[0]);
  expect(loaded.find(p => p.id === 97)).not.toHaveProperty('plant');
  expect(loaded.find(p => p.id === 98)!.plant).toEqual(good);
  expect(town.actors.find(a => a.id === 'leo')!.seat).toBeNull();
  expect(town).not.toHaveProperty('moedas');
  expect(decodeNeighborhood(JSON.stringify({ version: 3, town: { ...raw, actors: base.actors.map(a => a.id === 'leo' ? { ...a, seat: 'bed' } : a) } }))).toBeNull();
});
it('nextItem ausente ou até o maior prefixo é recalculado; um maior é mantido', () => {
  const base = upgradeToV3(richTown), first = base.nextItem;
  const decode = (nextItem: unknown) => decodeNeighborhood(JSON.stringify({ version: 3, town: { ...base, nextItem } }))!.nextItem;
  expect(decode(undefined)).toBe(first);
  expect(decode(first - 1)).toBe(first);
  expect(decode(first)).toBe(first);
  expect(decode(first + 5)).toBe(first + 5);
  expect(decode(2.5)).toBe(first);
  expect(decodeNeighborhood(JSON.stringify({ version: 3, town: { ...base, progress: undefined } }))!.progress).toEqual(initialProgress());
});
it('v3 rejeita estrutura inválida e versões desconhecidas', () => {
  const base = upgradeToV3(richTown);
  expect(decodeNeighborhood(JSON.stringify({ version: 3, town: { ...base, plots: 3 } }))).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 3, town: 'x' }))).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 3, town: { ...base, buildings: [{ ...base.buildings[0], layout: 'x' }] } }))).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 4, town: base }))).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 3, town: { ...base, buildings: base.buildings.map((b, n) => n ? b : { ...b, layout: { ...b.layout, pieces: [null] } }) } }))).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 3, town: { ...base, buildings: base.buildings.map((b, n) => n ? b : { ...b, layout: { ...b.layout, rooms: { ...b.layout.rooms, sala: null } } }) } }))).toBeNull();
});
