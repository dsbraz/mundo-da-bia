import { expect, test } from '@playwright/test';
import { ready, readTown } from './helpers';

test('W3L-21: com todo texto transparente, o mercado se constrói pelo cartão ilustrado e nasce com prateleiras e caixa', async ({ page }) => {
  await ready(page);
  await page.addStyleTag({ content: '*{color:transparent!important}' });
  await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.locator('#construct-plot').click();
  const card = page.locator('#plot-dialog .building-choice[data-plan="market"]');
  await expect(card.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await card.click();
  await page.locator('#plot-dialog button').last().click();
  const market = (await readTown(page)).buildings.at(-1)!;
  expect(market.model).toBe('shop');
  expect(market.layout.rooms.sala!.template).toBe('market');
  const kinds = market.layout.pieces.filter(p => p.room === 'sala').map(p => p.kind);
  expect(kinds.filter(k => k === 'market-shelf')).toHaveLength(2);
  expect(kinds).toContain('checkout');
});
