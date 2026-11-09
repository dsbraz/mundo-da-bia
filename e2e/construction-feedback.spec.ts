import { test, expect } from '@playwright/test';
import { ready, create, readTown } from './helpers';
import { neighborhoodAction } from '../src/domain/neighborhood';

test('ampliação iniciada na rua pertence à construção mostrada e sobrevive à recarga', async ({ page }) => {
  await ready(page);
  await page.locator('#map-toggle').click();
  await page.getByRole('button', { name: '⌂ Bairro', exact: true }).click();
  await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.locator('#construct-structure').click();
  await page.getByRole('button', { name: 'Ampliar Minha casa', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar Cozinha', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar módulo', exact: true }).click();
  expect(Object.values((await readTown(page)).buildings[0]!.layout.rooms).some(r => r.template === 'kitchen')).toBe(true);
  await page.reload();
  expect(Object.values((await readTown(page)).buildings[0]!.layout.rooms).some(r => r.template === 'kitchen')).toBe(true);
});

test('limite de doze cômodos explica como continuar', async ({ page }) => {
  await ready(page);
  let town = await readTown(page);
  for (let cell = 2; cell < 12; cell++) town = neighborhoodAction(town, { type: 'add-module', building: 1, cell, template: 'empty' });
  await page.addInitScript(value => localStorage.setItem('mundo-da-bia:neighborhood:v2', JSON.stringify({ version: 2, town: value })), town);
  await page.reload(); await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.locator('#construct-structure').click();
  await expect(page.getByText('Esta construção tem 12 de 12 cômodos. Crie outra construção para continuar.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adicionar Cozinha', exact: true })).toBeDisabled();
});

test('prévia permanece aberta e explica uma criação recusada', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const path = '/src/presentation/quick-rooms.ts';
    const { quickRooms } = await import(path);
    const root = document.createElement('div'); root.id = 'rejected-preview';
    root.style.cssText = 'position:fixed;inset:0;z-index:9999;overflow:auto;background:white';
    root.innerHTML = '<select id="room-size"><option value="medium">Médio</option></select><button id="add-room">Adicionar</button><section id="quick-rooms"><div id="room-cards"></div><button id="cancel-room-choice">Voltar</button></section>';
    document.body.append(root);
    quickRooms(root, () => 'Esse espaço acabou de ser ocupado. Escolha outro.', () => root.remove())(2);
  });
  const preview = page.locator('#rejected-preview');
  await preview.getByRole('button', { name: 'Criar Cozinha', exact: true }).click();
  await preview.getByRole('button', { name: 'Construir cômodo', exact: true }).click();
  await expect(preview.getByRole('status')).toHaveText('Esse espaço acabou de ser ocupado. Escolha outro.');
  await expect(preview.getByRole('button', { name: 'Cancelar prévia', exact: true })).toBeVisible();
});

test('andar cheio permite ampliar no próximo andar sem procurar outra opção', async ({ page }) => {
  await ready(page); await create(page); await create(page);
  await page.locator('#build-toggle').click(); await page.locator('#construct-mode').click();
  await page.locator('#construct-structure').click();
  await expect(page.getByRole('button', { name: 'Adicionar Cozinha', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Adicionar Cozinha', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar módulo', exact: true }).click();
  expect(Object.values((await readTown(page)).buildings[0]!.layout.rooms).find(r => r.cell === 4)?.template).toBe('kitchen');
});
