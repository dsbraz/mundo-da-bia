import { test, expect } from '@playwright/test';
import { ready } from './helpers';
import { buildingModels } from '../src/domain/neighborhood-types';
test('contact sheets cover every furniture asset and facade variant', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 }); await ready(page);
  await page.evaluate(async () => {
    const piecesPath = '/src/presentation/piece-assets.ts', typesPath = '/src/domain/types.ts', facadePath = '/src/presentation/architecture-art.ts';
    const { pieceImage } = await import(piecesPath), { pieceKinds } = await import(typesPath), { facadeSvg, svgUrl } = await import(facadePath);
    const sheet = document.createElement('section'); sheet.id = 'review-sheet';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:200;background:#faf5e9;overflow:auto;padding:20px;display:grid;grid-template-columns:repeat(7,1fr);gap:12px';
    for (const kind of pieceKinds) {
      const card = document.createElement('figure'); card.style.cssText = 'margin:0;display:grid;align-content:end;text-align:center;border-bottom:1px solid #c7bba5';
      const img = new Image(); img.src = pieceImage(kind, 'original', true); img.style.cssText = 'width:170px;height:160px;object-fit:contain';
      const label = document.createElement('figcaption'); label.textContent = kind; card.append(img, label); sheet.append(card);
    }
    document.body.append(sheet);
    const facades = document.createElement('section'); facades.id = 'facade-sheet'; facades.hidden = true;
    facades.style.cssText = 'position:fixed;inset:0;z-index:201;background:#faf5e9;display:grid;grid-template-columns:repeat(3,1fr);overflow:auto';
    const neighborhoodPath = '/src/domain/neighborhood-types.ts';
    const { buildingModels } = await import(neighborhoodPath);
    for (const model of buildingModels) for (const floors of [1, 2, 3]) {
      const card = document.createElement('figure'); card.style.cssText = 'margin:0;text-align:center'; card.dataset.model = model;
      const img = new Image(); img.src = svgUrl(facadeSvg(model, floors)); img.style.cssText = 'height:350px;width:320px;object-fit:contain';
      const label = document.createElement('figcaption'); label.textContent = `${model} · ${floors}`; card.append(img, label); facades.append(card);
    }
    document.body.append(facades);
  });
  await expect.poll(() => page.locator('#review-sheet img').evaluateAll(images => images.every(i => (i as HTMLImageElement).complete))).toBe(true);
  await page.screenshot({ path: 'reports/catalog-all.png' });
  await expect.poll(() => page.locator('#facade-sheet img').evaluateAll(images => images.every(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.locator('#facade-sheet').evaluate(n => { (n as HTMLElement).hidden = false; });
  await page.screenshot({ path: 'reports/facades-all.png' });
  for (const model of buildingModels) {
    await page.locator(`#facade-sheet [data-model="${model}"]`).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `reports/facades-${model}.png` });
  }
});
