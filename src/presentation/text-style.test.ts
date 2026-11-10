import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { fontStack, loadFonts, textStyle, textStyles } from './text-style';
import { cssTokens, palette } from './palette';
afterEach(() => vi.unstubAllGlobals());

const source = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? source(path) : path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
});

it('todo estilo de texto usa a fonte arredondada local com fallback', () => {
  expect(fontStack.startsWith('"Nunito"')).toBe(true);
  expect(fontStack.endsWith('sans-serif')).toBe(true);
  Object.values(textStyles).forEach(style => expect(style.fontFamily).toBe(fontStack));
});

it('respeita os tamanhos mínimos do guia', () => {
  const px = (name: keyof typeof textStyles) => Number.parseInt(String(textStyles[name].fontSize), 10);
  expect(px('bubble')).toBeGreaterThanOrEqual(22);
  expect(px('hopscotch')).toBeGreaterThanOrEqual(22);
  expect(px('sign')).toBeGreaterThanOrEqual(16);
  expect(px('label')).toBeGreaterThanOrEqual(16);
});

it('aceita ajustes sem trocar a família', () => {
  expect(textStyle('sign', { align: 'center' })).toMatchObject({ align: 'center', fontFamily: fontStack });
  expect(textStyle('sign', { fontFamily: 'Courier' } as never).fontFamily).toBe(fontStack);
});

it('só text-style.ts define fontFamily e todo add.text usa um estilo nomeado', () => {
  for (const file of source('src')) {
    const code = readFileSync(file, 'utf8');
    if (!file.endsWith('text-style.ts')) expect(code, file).not.toMatch(/fontFamily/);
    expect(code.match(/add\.text\([^)]*\{ *resolution/g) ?? [], file).toEqual([]);
  }
});

it('os tokens de cor da paleta estão espelhados no :root do CSS', () => {
  const css = readFileSync('src/presentation/style.css', 'utf8');
  for (const [name, value] of Object.entries(cssTokens)) expect(css, name).toContain(`--${name}:${value}`);
  expect(Object.values(palette).every(v => /^#[0-9a-f]{6}$/.test(v))).toBe(true);
  expect(css).toContain("url('/fonts/nunito-latin-800-normal.woff2')");
});

it('espera os dois pesos da fonte mas nunca trava sem ela', async () => {
  const load = vi.fn(() => Promise.resolve([]));
  vi.stubGlobal('document', { fonts: { load } });
  await loadFonts();
  expect(load.mock.calls.map(c => (c as unknown[])[0])).toEqual(['600 16px Nunito', '800 16px Nunito']);
  vi.stubGlobal('document', { fonts: { load: () => Promise.reject(new Error('offline')) } });
  await expect(loadFonts()).resolves.toBeUndefined();
  vi.stubGlobal('document', {});
  await expect(loadFonts()).resolves.toBeUndefined();
});

it('não espera mais que o limite quando a fonte demora', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('document', { fonts: { load: () => new Promise(() => {}) } });
  const done = vi.fn(); void loadFonts(500).then(done);
  await vi.advanceTimersByTimeAsync(499); expect(done).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect(done).toHaveBeenCalled();
  vi.useRealTimers();
});
