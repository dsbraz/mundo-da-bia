import { expect, it, vi } from 'vitest';
import { loadFirstTouchSeen, loadSoundOn, saveFirstTouchSeen, saveSoundOn } from './storage';
const key = 'mundo-da-bia:sound';
function storage(entries: [string, string][] = [], failing = false) {
  const map = new Map(entries);
  return { map, getItem: (k: string) => { if (failing) throw Error('blocked'); return map.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (failing) throw Error('quota'); map.set(k, v); } };
}

it('o som começa ligado quando não há escolha guardada', () => {
  expect(loadSoundOn(storage())).toBe(true);
});
it('lembra a escolha numa chave própria, fora do save', () => {
  const port = storage();
  expect(saveSoundOn(false, port)).toBe(true);
  expect([...port.map.keys()]).toEqual([key]);
  expect(loadSoundOn(port)).toBe(false);
  saveSoundOn(true, port);
  expect(loadSoundOn(port)).toBe(true);
});
it('valor estranho ou armazenamento bloqueado voltam ao padrão ligado sem quebrar', () => {
  expect(loadSoundOn(storage([[key, 'talvez']]))).toBe(true);
  expect(loadSoundOn(storage([], true))).toBe(true);
  expect(saveSoundOn(false, storage([], true))).toBe(false);
});
it('sem porta explícita usa o localStorage do navegador', () => {
  const port = storage();
  vi.stubGlobal('localStorage', port);
  expect(saveSoundOn(false)).toBe(true);
  expect(loadSoundOn()).toBe(false);
  vi.unstubAllGlobals();
});

it('a mão-fantasma do primeiro toque aparece até ser dispensada, numa chave própria', () => {
  const port = storage();
  expect(loadFirstTouchSeen(port)).toBe(false);
  expect(saveFirstTouchSeen(port)).toBe(true);
  expect([...port.map.keys()]).toEqual(['mundo-da-bia:first-touch']);
  expect(loadFirstTouchSeen(port)).toBe(true);
});
it('sem armazenamento a mão aparece e dispensar não quebra', () => {
  expect(loadFirstTouchSeen(storage([], true))).toBe(false);
  expect(saveFirstTouchSeen(storage([], true))).toBe(false);
  const port = storage();
  vi.stubGlobal('localStorage', port);
  expect(saveFirstTouchSeen()).toBe(true); expect(loadFirstTouchSeen()).toBe(true);
  vi.unstubAllGlobals();
});
