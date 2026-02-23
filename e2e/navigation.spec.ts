import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('title screen loads with JHitster heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'JHitster' })).toBeVisible();
  });

  test('"Play a Local Game" navigates to packs', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play a Local Game' }).click();
    await expect(page).toHaveURL(/.*#\/packs$/);
    await expect(page.getByRole('heading', { name: 'Song Packs' })).toBeVisible();
  });

  test('"Play Multiplayer" navigates to multiplayer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play Multiplayer' }).click();
    await expect(page).toHaveURL(/.*#\/multiplayer$/);
    await expect(page.getByRole('heading', { name: 'Multiplayer' })).toBeVisible();
  });

  test('pack selection Continue navigates to setup', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play a Local Game' }).click();
    await page.waitForURL('**/jhitster/#/packs');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/.*#\/setup$/);
    await expect(page.getByRole('heading', { name: 'Player Setup' })).toBeVisible();
  });

  test('player setup Continue navigates to deal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play a Local Game' }).click();
    await page.waitForURL('**/jhitster/#/packs');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL('**/jhitster/#/setup');

    const inputs = page.locator('input[type="text"]');
    await inputs.nth(0).fill('Alice');
    await inputs.nth(1).fill('Bob');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/.*#\/deal$/);
    await expect(page.getByRole('heading', { name: 'Dealing Cards...' })).toBeVisible();
  });

  test('multiplayer back button returns to title', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play Multiplayer' }).click();
    await page.waitForURL('**/jhitster/#/multiplayer');
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/.*#\/$/);
    await expect(page.getByRole('heading', { name: 'JHitster' })).toBeVisible();
  });
});
