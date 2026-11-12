import { expect, test, type Page } from '@playwright/test';
import { ready, tray, closeTray, openPlay } from './helpers';

// Every visible text inside a visible button or tab (buttons, Map tabs, <summary>, including spans and <small> inside cards)
// is drawn with a computed font-size of 16 px or more.
const small = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, summary, [role=tab]')]
  .filter(node => node.checkVisibility({ visibilityProperty: true }) && !node.closest('[inert], .sr-only'))
  .flatMap(node => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), found: { label: string; size: number }[] = [];
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const owner = text.parentElement!;
      if (!text.textContent!.trim() || !owner.checkVisibility({ visibilityProperty: true })) continue;
      found.push({ label: text.textContent!.trim().replace(/\s+/g, ' ').slice(0, 40), size: Number.parseFloat(getComputedStyle(owner).fontSize) });
    }
    return found;
  })
  .filter(item => item.size < 16));

// Every visible text and icon inside a visible button or tab stays inside the button's box (1 px tolerance).
const spilled = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, summary, [role=tab]')]
  .filter(node => node.checkVisibility({ visibilityProperty: true }) && !node.closest('[inert], .sr-only'))
  .flatMap(node => {
    const box = node.getBoundingClientRect(), found: string[] = [], name = (node.textContent!.trim() || node.getAttribute('aria-label') || node.id).slice(0, 30);
    const out = (r: DOMRect) => r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (!text.textContent!.trim() || !text.parentElement!.checkVisibility({ visibilityProperty: true })) continue;
      const range = document.createRange(); range.selectNodeContents(text);
      if ([...range.getClientRects()].some(out)) found.push(`${name}: texto "${text.textContent!.trim().slice(0, 20)}"`);
    }
    for (const icon of node.querySelectorAll<HTMLElement>('img, svg')) if (icon.checkVisibility({ visibilityProperty: true }) && out(icon.getBoundingClientRect())) found.push(`${name}: ícone`);
    // Drawn icons are ::before boxes: any content (icon or text) spilling past the padding box shows up as scroll overflow.
    if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) found.push(`${name}: conteúdo transborda`);
    return found;
  }));

for (const viewport of [{ width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`nenhum rótulo de botão ou aba tem menos de 16 px nem sai do botão a ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport); await ready(page);
    const check = async (where: string) => { expect.soft(await small(page), where).toEqual([]); expect.soft(await spilled(page), `${where}: contido no botão`).toEqual([]); };
    await check('inicial');
    for (const tab of ['Turma', 'Looks', 'Objetos']) { await tray(page, tab); await check(`bandeja ${tab}`); }
    await tray(page, 'Turma'); await page.locator('#cast .character').first().click(); await closeTray(page);
    await expect(page.locator('#actor-context')).toBeVisible(); await check('painel da Bia');
    await openPlay(page); await check('escolha da brincadeira');
    await page.getByRole('button', { name: 'Pular corda', exact: true }).click();
    await expect(page.locator('#game-panel')).toBeVisible(); await check('brincadeira');
    await page.locator('#game-stop').click();
    await page.locator('#build-toggle').click(); await check('Criar');
    await page.locator('#construct-mode').click(); await check('Ampliar');
    await page.locator('#construct-structure').click(); await check('ampliar casa');
    await page.keyboard.press('Escape');
    await page.locator('#map-toggle').click();
    for (const tab of ['Lugares', 'Organizar', 'Ideias']) { await page.getByRole('button', { name: tab, exact: true }).click(); await check(`Mapa ${tab}`); }
    await page.getByRole('button', { name: 'Organizar', exact: true }).click();
    await page.getByRole('button', { name: 'Ampliar, mover ou excluir Minha casa', exact: true }).click(); await check('ações da casa');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.locator('#play-mode').click();
    await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click();
    if (await page.locator('#room-dialog').isVisible()) await page.locator('#close-map').click();
    await check('rua');
    await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
    await page.getByRole('button', { name: 'Nova casa pronta', exact: true }).click(); await expect(page.locator('#plot-dialog')).toBeVisible(); await check('nova casa pronta');
  });
}
