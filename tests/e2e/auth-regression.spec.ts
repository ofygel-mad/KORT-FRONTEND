import { test, expect } from '@playwright/test';
import { preparePage } from './helpers';

test('company registration submits on Enter from password confirmation', async ({ page }) => {
  await preparePage(page);
  await page.goto('/auth/register');

  const fields = page.locator('form input');
  await expect(fields).toHaveCount(6);

  await fields.nth(0).fill('Тестовая компания');
  await fields.nth(1).fill('Тестовый Руководитель');
  await fields.nth(2).fill('owner+enter@demo.kz');
  await fields.nth(3).fill('+7 701 555 44 33');
  await fields.nth(4).fill('superpass');
  await fields.nth(5).fill('superpass');
  await fields.nth(5).press('Enter');

  await expect(page).not.toHaveURL(/\/auth\/register$/);
  await expect(page).toHaveURL(/\/onboarding|\/$/);
});

test('company registration footer stays visible on short desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await preparePage(page);
  await page.goto('/auth/register');

  const fields = page.locator('form input');
  await expect(fields).toHaveCount(6);

  await fields.nth(0).fill('Тест');
  await fields.nth(1).fill('Жасарал Асхат');
  await fields.nth(2).fill('ofygel@gmail.com');
  await fields.nth(3).fill('+7 747 456-86-61');
  await fields.nth(4).fill('12345678');
  await fields.nth(5).fill('12345679');

  const submitButton = page.getByRole('button', { name: 'Создать компанию' });
  await expect(submitButton).toBeInViewport();
  await submitButton.click();
  await expect(page.getByText('Пароли не совпадают.')).toBeInViewport();
  await expect(submitButton).toBeInViewport();
});

test('mock login rejects invalid password', async ({ page }) => {
  await preparePage(page);
  await page.goto('/auth/login');

  const fields = page.locator('form input');
  await expect(fields).toHaveCount(2);

  await fields.nth(0).fill('owner@demo.kz');
  await fields.nth(1).fill('wrong-password');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.locator('form')).toContainText(/Неверный пароль|Неверный логин или пароль/i);
});
