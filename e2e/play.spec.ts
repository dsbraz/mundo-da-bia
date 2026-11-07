import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
}
async function tray(page: Page, name: 'tools' | 'cast' | 'home', open = true) {
  const panel = page.locator(`.${name}-tray`);
  if (await panel.evaluate(node => (node as HTMLDetailsElement).open) !== open) await panel.locator('summary').click();
  await expect(panel).toHaveJSProperty('open', open);
}
const read = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
async function gestures(page: Page) {
  const box = (await page.locator('canvas').boundingBox())!;
  const xy = (x: number, y: number) => ({ x: box.x + x * box.width / 1000, y: box.y + y * box.height / 600 });
  return {
    xy,
    tap: async (x: number, y: number) => { const p = xy(x, y); await page.mouse.click(p.x, p.y); },
    drag: async (from: [number, number], to: [number, number], cancel = false) => {
      const a = xy(...from); const b = xy(...to);
      await page.mouse.move(a.x, a.y); await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 8 });
      if (cancel) await page.locator('canvas').dispatchEvent('pointercancel', { pointerId: 1 });
      await page.mouse.up();
    },
  };
}

test('brincadeira completa por controles acessíveis, com salvamento', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await tray(page, 'tools');
  await page.getByRole('button', { name: 'Lanche', exact: true }).click();
  await page.getByRole('button', { name: 'Oferecer comida' }).click();
  await expect(page.locator('#actor-status')).toContainText('Já comeu');
  await page.getByRole('button', { name: 'Festa', exact: false }).click();
  await tray(page, 'cast');
  await page.getByRole('button', { name: 'Mimi', exact: true }).click();
  await tray(page, 'tools');
  await page.getByRole('button', { name: 'Comidinha de gato' }).click();
  await page.getByRole('button', { name: 'Oferecer comida' }).click();
  await page.getByRole('button', { name: 'Descansar' }).click();
  await tray(page, 'home');
  await page.locator('#rooms').getByRole('button', { name: 'Quarto dos sonhos' }).click();
  await page.getByRole('button', { name: 'Reunir todo mundo' }).click();
  await page.locator('#rooms').getByRole('button', { name: 'Sala & palco' }).click();
  await page.getByRole('button', { name: 'Reunir todo mundo' }).click();
  await tray(page, 'cast');
  await page.getByRole('button', { name: 'Bia', exact: true }).click();
  await tray(page, 'tools');
  await page.getByRole('button', { name: 'Microfone', exact: true }).click();
  await page.getByRole('button', { name: 'Começar show' }).click();
  await page.reload();
  await tray(page, 'tools');
  await expect(page.getByRole('button', { name: 'Encerrar show' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Festa', exact: false })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#actor-status')).toContainText('Microfone');
  expect((await read(page)).actors[4]).toMatchObject({ fed: true, resting: true });
  expect(errors).toEqual([]);
});

test('arraste cancelado preserva posição e teclado move sem duplicar', async ({ page }) => {
  await ready(page);
  const { drag } = await gestures(page);
  await drag([520, 400], [550, 430], true);
  await page.locator('#world').focus();
  await page.keyboard.press('ArrowRight');
  const saved = await read(page);
  expect(saved.actors).toHaveLength(7);
  expect(saved.actors[0].x).toBeCloseTo(540, 0);
  await page.reload();
  expect(await read(page)).toEqual(saved);
});

test('salvamento inválido recupera a brincadeira inicial', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    localStorage.setItem('mundo-da-bia:v1', '{bad');
    localStorage.setItem('mundo-da-bia:houses:v1', '{bad');
  });
  await page.reload();
  await expect(page.locator('#selected')).toContainText('Bia');
  expect((await read(page)).actors).toHaveLength(7);
  await expect(page.locator('#save-status')).toHaveText('✓ Brincadeira salva');
});

test('senta, usa mesa e geladeira, cuida do gato, guarda brinquedo, veste e faz show', async ({ page }) => {
  await ready(page);
  const { drag, tap } = await gestures(page);
  await drag([520, 390], [150, 405]);
  expect((await read(page)).actors[0].seat).toBe('sofa-left');
  await drag([680, 282], [260, 450]);
  expect((await read(page)).items[0].spot).toBe('table');
  await drag([260, 447], [150, 300]);
  expect((await read(page)).actors[0].fed).toBe(true);
  await drag([680, 332], [600, 470]);
  expect((await read(page)).actors[4].fed).toBe(true);
  await tap(380, 365);
  expect((await read(page)).home.drawer).toBe(true);
  await drag([350, 382], [355, 370]);
  expect((await read(page)).items[3].spot).toBe('drawer');
  await tap(320, 390);
  expect((await read(page)).home.drawer).toBe(false);
  await tap(405, 165);
  await drag([335, 260], [150, 300]);
  expect((await read(page)).actors[0].look).toBe('festa');
  await drag([900, 252], [150, 300]);
  expect((await read(page)).show).toBe(true);
  await tap(60, 200);
  expect((await read(page)).home.lamp).toBe(false);
  const saved = await read(page);
  await page.reload();
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect(await read(page)).toEqual(saved);
  await page.screenshot({ path: 'reports/furniture-play.png' });
});

test('cancelar o arraste não perde o brinquedo e soltar no chão salva posição', async ({ page }) => {
  await ready(page);
  const { drag } = await gestures(page);
  const before = await read(page);
  await drag([350, 382], [935, 430], true);
  expect(await read(page)).toEqual(before);
  await drag([350, 382], [935, 430]);
  const after = await read(page);
  expect(after.items[3]).toMatchObject({ holder: null, spot: 'floor' });
  expect(after.items[3].x).toBeCloseTo(935, 0);
  expect(after.items[3].y).toBeCloseTo(458, 0);
  await page.reload();
  expect(await read(page)).toEqual(after);
});

test('armário respeita o cômodo e veste por toque real em tablet', async ({ page }) => {
  await ready(page);
  await tray(page, 'home');
  await page.locator('#rooms').getByRole('button', { name: 'Quarto dos sonhos' }).click();
  await page.reload();
  await tray(page, 'tools');
  await expect(page.getByRole('button', { name: 'Abrir armário' })).toBeDisabled();
  await tray(page, 'home');
  await page.locator('#rooms').getByRole('button', { name: 'Sala & palco' }).click();
  await tray(page, 'home', false);
  const { xy } = await gestures(page);
  const door = xy(405, 165);
  await page.touchscreen.tap(door.x, door.y);
  await expect(page.locator('#wardrobe-toggle')).toHaveAttribute('aria-expanded', 'true');
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [xy(427, 220)] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [xy(520, 390)] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await read(page)).actors[0].look).toBe('estrela');
  await page.screenshot({ path: 'reports/wardrobe-touch.png' });
});

test('casa ocupa a tela sem rolagem e bandejas se recolhem em ambas orientações', async ({ page }) => {
  await ready(page);
  await page.screenshot({ path: 'reports/dollhouse-landscape.png' });
  for (const size of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 915, height: 412 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await tray(page, 'tools');
    await expect(page.locator('.tools-tray .panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.tools-tray')).toHaveJSProperty('open', false);
  }
  await page.screenshot({ path: 'reports/dollhouse-compact.png' });
});

test('quarto permite deitar na cama e preserva a posição', async ({ page }) => {
  await ready(page);
  await tray(page, 'home');
  await page.locator('#rooms').getByRole('button', { name: 'Quarto dos sonhos' }).click();
  await page.getByRole('button', { name: 'Reunir todo mundo' }).click();
  await tray(page, 'home', false);
  const { drag } = await gestures(page);
  await drag([520, 390], [790, 350]);
  expect((await read(page)).actors[0]).toMatchObject({ seat: 'bed', resting: true });
  await page.screenshot({ path: 'reports/bedroom.png' });
  const saved = await read(page);
  await page.reload();
  expect(await read(page)).toEqual(saved);
});
