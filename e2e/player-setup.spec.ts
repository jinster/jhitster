import { test, expect } from '@playwright/test';

test.describe('Player Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play a Local Game' }).click();
    await page.waitForURL('**/jhitster/#/packs');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL('**/jhitster/#/setup');
  });

  test('starts with 2 player inputs', async ({ page }) => {
    const inputs = page.locator('input[type="text"]');
    await expect(inputs).toHaveCount(2);
  });

  test('can add players up to 8', async ({ page }) => {
    const addButton = page.getByRole('button', { name: '+ Add Player' });
    // Start with 2, add 6 more to reach 8
    for (let i = 0; i < 6; i++) {
      await addButton.click();
    }
    const inputs = page.locator('input[type="text"]');
    await expect(inputs).toHaveCount(8);
    // Add button should be gone now
    await expect(addButton).not.toBeVisible();
  });

  test('can remove players down to 2', async ({ page }) => {
    // Add a third player
    await page.getByRole('button', { name: '+ Add Player' }).click();
    const inputs = page.locator('input[type="text"]');
    await expect(inputs).toHaveCount(3);

    // Remove buttons should appear (the "X" buttons)
    const removeButtons = page.getByRole('button', { name: '✕' });
    await removeButtons.first().click();
    await expect(inputs).toHaveCount(2);

    // Remove buttons should be gone at 2 players
    await expect(removeButtons).toHaveCount(0);
  });

  test('Continue is disabled if names are empty', async ({ page }) => {
    const continueButton = page.getByRole('button', { name: 'Continue' });
    await expect(continueButton).toBeDisabled();
  });

  test('Continue works with valid names', async ({ page }) => {
    const inputs = page.locator('input[type="text"]');
    await inputs.nth(0).fill('Alice');
    await inputs.nth(1).fill('Bob');

    const continueButton = page.getByRole('button', { name: 'Continue' });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect(page).toHaveURL(/.*#\/deal$/);
  });
});
