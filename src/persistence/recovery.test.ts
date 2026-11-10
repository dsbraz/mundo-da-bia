import { expect, it } from 'vitest';
import { loadNeighborhood, saveNeighborhood } from './storage';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { migrateNeighborhood } from '../domain/neighborhood';
const current = 'mundo-da-bia:neighborhood:v2';
const recovery = 'mundo-da-bia:neighborhood:v2:recovery';
function storage(entries: [string, string][] = [], failing: string[] = []) {
  const map = new Map(entries);
  return { map, getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => {
    if (failing.includes(key)) throw Error('quota');
    map.set(key, value);
  } };
}
function town() { return migrateNeighborhood(initialAlbum(initialWorld())); }
function corrupt() { const value = town(); value.plots = 3; return JSON.stringify({ version: 2, town: value }); }

it('copia o v2 inválido para a chave de recuperação antes de gravar o bairro novo', () => {
  const raw = corrupt(); const port = storage([[current, raw]]);
  const loaded = loadNeighborhood(port);
  expect(port.map.get(recovery)).toBe(raw);
  expect(saveNeighborhood(loaded, port)).toBe(true);
  expect(port.map.get(recovery)).toBe(raw);
  expect(decodeNeighborhood(port.map.get(current)!)).toEqual(loaded);
});
it('guarda também texto que nem é JSON', () => {
  const port = storage([[current, '{"version":2,']]);
  loadNeighborhood(port);
  expect(port.map.get(recovery)).toBe('{"version":2,');
});
it('não sobrescreve o v2 inválido quando a cópia de recuperação falha', () => {
  const raw = corrupt(); const port = storage([[current, raw]], [recovery]);
  const loaded = loadNeighborhood(port);
  expect(port.map.get(current)).toBe(raw);
  expect(saveNeighborhood(loaded, port)).toBe(false);
  expect(port.map.get(current)).toBe(raw);
  expect(port.map.has(recovery)).toBe(false);
});
it('não cria recuperação para v2 válido nem para armazenamento vazio', () => {
  const valid = storage([[current, encodeNeighborhood(town())]]);
  expect(saveNeighborhood(loadNeighborhood(valid), valid)).toBe(true);
  expect(valid.map.has(recovery)).toBe(false);
  const empty = storage();
  expect(saveNeighborhood(loadNeighborhood(empty), empty)).toBe(true);
  expect(empty.map.has(recovery)).toBe(false);
});
it('mantém a recuperação já guardada quando o mesmo texto inválido continua no v2', () => {
  const raw = corrupt(); const port = storage([[current, raw], [recovery, raw]]);
  let writes = 0; const counting = { ...port, setItem: (key: string, value: string) => { if (key === recovery) writes++; port.setItem(key, value); } };
  expect(saveNeighborhood(town(), counting)).toBe(true);
  expect(writes).toBe(0);
  expect(port.map.get(recovery)).toBe(raw);
});
it('não apaga a recuperação guardada quando o v2 não existe', () => {
  const port = storage([[recovery, 'antigo']]);
  expect(saveNeighborhood(town(), port)).toBe(true);
  expect(port.map.get(recovery)).toBe('antigo');
});
