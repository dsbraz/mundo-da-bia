import { test, expect } from '@playwright/test';
const read = async (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
test('atravessa portas por toque e arraste levando o ursinho', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.locator('.tools-tray summary').click();
  await page.getByRole('button', { name: 'Ursinho', exact: true }).click();
  await page.locator('.tools-tray summary').click();
  await page.getByRole('button', { name: 'Porta para Quarto dos sonhos', exact: true }).click();
  await expect(page.locator('#app')).not.toHaveAttribute('data-crossing', 'true');
  expect((await read(page)).actors[0]).toMatchObject({ room: 'quarto', x: 110 });
  expect((await read(page)).items.find((i: { id: string }) => i.id === 'ursinho').holder).toBe('bia');
  await page.getByRole('button', { name: 'Porta para Sala & palco', exact: true }).click();
  await expect(page.locator('#app')).not.toHaveAttribute('data-crossing', 'true');
  await page.getByRole('button', { name: 'Porta para Quarto dos sonhos', exact: true }).click();
  await expect(page.locator('#app')).not.toHaveAttribute('data-crossing', 'true');
  const box = (await page.locator('canvas').boundingBox())!;
  const p = (x: number, y: number) => ({ x: box.x + x * box.width / 1000, y: box.y + y * box.height / 600 });
  const a = p(110, 400), b = p(35, 370);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up();
  await expect(page.locator('#app')).not.toHaveAttribute('data-crossing', 'true');
  expect((await read(page)).room).toBe('sala');
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect((await read(page)).actors[0]).toMatchObject({ room: 'sala', x: 890 });
  await page.screenshot({ path: 'reports/doors.png' });
});
test('monta canto de leitura, senta e troca os três looks novos', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: 'Construir no espaço 3', exact: true }).click();
  await page.getByRole('button', { name: 'Criar Livre', exact: true }).click();
  const box = (await page.locator('canvas').boundingBox())!;
  const p = (x: number, y: number) => ({ x: box.x + x * box.width / 1200, y: box.y + y * box.height / 600 });
  const drag = async (from: number[], to: number[]) => { const a = p(from[0]!, from[1]!), b = p(to[0]!, to[1]!); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up(); };
  for (const [index, name] of ['Poltrona de leitura', 'Luminária de leitura', 'Mesinha com livros'].entries()) {
    await page.getByRole('button', { name: `Adicionar ${name}`, exact: true }).click();
    await page.locator('#catalog-toggle').click();
    await drag([500, 340], [[250, 340], [750, 340], [920, 420]][index]!);
    await page.locator('#catalog-toggle').click();
  }
  await page.locator('#build-toggle').click();
  await drag([520, 400], [290, 445]);
  expect((await read(page)).actors[0].seat).toBe('armchair');
  const lamp = p(750, 340); await page.mouse.click(lamp.x, lamp.y);
  expect((await read(page)).layout.pieces.find((v: { kind: string }) => v.kind === 'reading-lamp').active).toBe(true);
  await page.locator('.tools-tray summary').click();
  for (const [name, id] of [['Jaqueta jeans', 'denim'], ['Ensaio pop', 'rehearsal'], ['Macacão criativo', 'overalls']]) {
    await page.getByRole('button', { name: name!, exact: false }).click();
    expect((await read(page)).actors[0].look).toBe(id);
  }
  await page.locator('.tools-tray summary').click();
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect((await read(page)).actors[0]).toMatchObject({ seat: 'armchair', look: 'overalls' });
  await page.screenshot({ path: 'reports/reading-corner.png' });
});
