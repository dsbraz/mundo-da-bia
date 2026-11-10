import { expect, test, type Page } from '@playwright/test';
import { ready, tray, closeTray } from './helpers';

// Every visible button or tab that shows text (buttons, Map tabs, <summary>) uses a computed font-size of 16 px or more.
const small = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, summary, [role=tab]')]
  .filter(node => node.checkVisibility({ visibilityProperty: true }) && !node.closest('[inert], .sr-only') && node.innerText.trim())
  .map(node => ({ label: node.innerText.trim().replace(/\s+/g, ' '), size: Number.parseFloat(getComputedStyle(node).fontSize) }))
  .filter(item => item.size < 16));

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`nenhum rótulo de botão ou aba tem menos de 16 px a ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page);
    const check = async (where: string) => expect.soft(await small(page), where).toEqual([]);
    await check('inicial');
    for (const tab of ['Turma', 'Looks', 'Objetos']) { await tray(page, tab); await check(`bandeja ${tab}`); }
    await tray(page, 'Turma'); await page.locator('#cast .character').first().click(); await closeTray(page);
    await expect(page.locator('#actor-context')).toBeVisible(); await check('painel da Bia');
    await page.getByRole('button', { name: 'Jogar', exact: true }).click(); await check('escolha da brincadeira');
    await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
    await expect(page.locator('#game-panel')).toBeVisible(); await check('brincadeira');
    await page.locator('#game-stop').click();
    await page.locator('#build-toggle').click(); await check('Criar');
    await page.locator('#construct-mode').click(); await check('Ampliar');
    await page.locator('#map-toggle').click();
    for (const tab of ['Lugares', 'Organizar', 'Ideias']) { await page.getByRole('button', { name: tab, exact: true }).click(); await check(`Mapa ${tab}`); }
    await page.getByRole('button', { name: 'Organizar', exact: true }).click();
    await page.getByRole('button', { name: 'Ampliar, mover ou excluir Minha casa', exact: true }).click(); await check('ações da casa');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.locator('#play-mode').click();
    await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
    if (await page.locator('#room-dialog').isVisible()) await page.locator('#close-map').click();
    await check('rua');
  });
}
