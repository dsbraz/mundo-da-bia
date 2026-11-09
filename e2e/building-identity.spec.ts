import { expect, test } from '@playwright/test';
import { ready } from './helpers';

test('hospital, delegacia e escritório têm silhuetas distintas mesmo sem cores e símbolos', async ({ page }) => {
  await ready(page);
  const signatures = await page.evaluate(async () => {
    const path = '/src/presentation/architecture-art.ts'; const { facadeSvg, svgUrl } = await import(path);
    return Promise.all(['hospital', 'police', 'office'].map(async model => {
      const image = new Image(); image.src = svgUrl(facadeSvg(model, 2)); await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 220; canvas.height = 240;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0, 220, 240);
      const data = context.getImageData(0, 0, 220, 240).data;
      const mask = Uint8Array.from({ length: 220 * 240 }, (_, i) => data[i * 4 + 3]! > 128 ? 1 : 0);
      const digest = await crypto.subtle.digest('SHA-256', mask);
      return Array.from(new Uint8Array(digest)).join(',');
    }));
  });
  expect(new Set(signatures).size).toBe(3);
});

test('prévia de mudança conserva os três andares da construção', async ({ page }) => {
  await ready(page);
  const expected = await page.evaluate(async () => {
    const movePath = '/src/presentation/move-house.ts', modelPath = '/src/domain/neighborhood.ts', storagePath = '/src/persistence/storage.ts', artPath = '/src/presentation/architecture-art.ts';
    const { moveHouse } = await import(movePath), { neighborhoodAction } = await import(modelPath), { loadNeighborhood } = await import(storagePath), { facadeSvg, svgUrl } = await import(artPath);
    let town = loadNeighborhood();
    town = neighborhoodAction(town, { type: 'add-floor', building: 1 });
    town = neighborhoodAction(town, { type: 'add-floor', building: 1 });
    moveHouse(document.querySelector('#app')!, town, town.buildings[0], () => {});
    return svgUrl(facadeSvg('house', 3));
  });
  await page.getByRole('button', { name: 'Terreno 2 · vazio', exact: true }).click();
  await expect(page.locator('.moving-house')).toHaveAttribute('src', expected);
});
