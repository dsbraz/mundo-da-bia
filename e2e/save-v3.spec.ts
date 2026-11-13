import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ready, readTown } from './helpers';
import { knownCast } from '../src/persistence/cast';

const v2 = 'mundo-da-bia:neighborhood:v2';
const raw = readFileSync(new URL('../src/persistence/fixtures/rich-save-v2.json', import.meta.url), 'utf8');

test('o save v2 rico carrega igual, o jogo grava só no v3 e a chave v2 fica byte a byte igual', async ({ page }) => {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [v2, raw]);
  await ready(page);
  const { progress, nextItem: _next, ...town } = await readTown(page);
  // W3L-24: the grown-ups, missing from this old save, arrive in the living room; everything else loads as saved.
  expect(town).toEqual(knownCast(JSON.parse(raw).town));
  expect(progress.seeds).toEqual(['alface', 'tomate', 'cenoura']);
  await page.locator('#world').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await readTown(page)).actors[0]!.x).toBe(540);
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect((await readTown(page)).actors[0]!.x).toBe(540);
  expect(await page.evaluate(key => localStorage.getItem(key), v2)).toBe(raw);
});
