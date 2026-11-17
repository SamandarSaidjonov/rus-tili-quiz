import { expect, test } from '@playwright/test';

test('бош саҳифада тўртта бўлим бор', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Рус тили' })).toBeVisible();
  for (const name of ['Мавзулар', 'Машқлар', 'Луғатлар', 'Тестлар']) {
    await expect(page.getByRole('navigation').getByRole('link', { name })).toBeVisible();
  }
});

test('эски ҳавола #dars-2 луғат тўпламига олиб боради', async ({ page }) => {
  await page.goto('./#dars-2');
  await expect(page).toHaveURL(/lugatlar\/003-feellar\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Феъллар' })).toBeVisible();
});

test('луғат квизи: жавобдан кейин ўзи ўтиб кетмайди', async ({ page }) => {
  await page.goto('./lugatlar/quiz/?set=003-feellar');

  const prompt = page.locator('.quiz__prompt');
  await expect(prompt).toBeVisible();
  const first = await prompt.textContent();

  await page.locator('.opt').first().click();

  // Изоҳ чиқади, савол эса ўзгармайди
  await expect(page.locator('.verdict')).toBeVisible();
  await expect(prompt).toHaveText(first ?? '');

  // Кейингисига фақат тугма босилганда ўтилади
  await page.getByRole('button', { name: /Кейинги/ }).click();
  await expect(prompt).not.toHaveText(first ?? '');

  // «Олдинги» фақат кўриш учун: вариантлар босилмайди
  await page.getByRole('button', { name: /Олдинги/ }).click();
  await expect(page.locator('.review-note')).toBeVisible();
  await expect(page.locator('.opt').first()).toBeDisabled();
});

test('машқ: бўш жавобда огоҳлантиради, хато жавобда тўғрисини кўрсатади', async ({ page }) => {
  await page.goto('./mashqlar/mixed/');
  await expect(page.locator('.quiz__task')).toBeVisible();

  await page.getByRole('button', { name: 'Текшириш' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  const field = page.locator('input[type="text"], textarea').first();
  await field.fill('ҳали билмайман');
  await page.getByRole('button', { name: 'Текшириш' }).click();

  await expect(page.locator('.verdict--bad')).toBeVisible();
  await expect(page.locator('.feedback__answer')).toBeVisible();
  await expect(page.locator('.note').last()).toBeVisible();
});

test('машқда «Билмайман» хато деб ҳисобланади', async ({ page }) => {
  await page.goto('./mashqlar/mixed/');
  await page.getByRole('button', { name: /Билмайман/ }).click();
  await expect(page.locator('.verdict--bad')).toBeVisible();
  await expect(page.locator('.progressrow__counts')).toContainText('✗ 1');
});

test('қоронғи тема танлови сақланади', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /тема/ }).click();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['dark', 'light']).toContain(theme);
  await page.reload();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe(theme);
});
