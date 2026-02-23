import { test, expect } from '@playwright/test';
import { navigateToGame, placeSong, advanceTurn } from './helpers';

test.describe('Token & Steal Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGame(page, ['Alice', 'Bob']);
  });

  test('Skip Song button appears when player has tokens', async ({ page }) => {
    // Players start with 2 tokens, so Skip Song should be visible
    await expect(page.getByRole('button', { name: 'Skip Song (1 token)' })).toBeVisible();
  });

  test('Skip Song draws a new card without placing', async ({ page }) => {
    await page.getByRole('button', { name: 'Skip Song (1 token)' }).click();

    // Should still be the same player's turn (skip doesn't advance turn)
    // Drop zones should still be visible for placement
    const dropZones = page.getByLabel(/Place card at position/);
    await expect(dropZones.first()).toBeVisible();
  });

  test('Skip Song is hidden when a drop zone is selected', async ({ page }) => {
    const dropZone = page.getByLabel(/Place card at position/).first();
    await dropZone.click();

    // Skip Song button should not be visible when a position is selected
    await expect(page.getByRole('button', { name: 'Skip Song (1 token)' })).not.toBeVisible();
  });

  test('after confirming placement, steal window appears', async ({ page }) => {
    // With 2 players both having tokens, steal window should appear
    await placeSong(page, 0);

    // Steal window should show with countdown
    const stealWindowText = page.getByText('Steal Window!');
    await expect(stealWindowText).toBeVisible();

    // Timer should be visible
    const timer = page.locator('text=/\\d+s$/');
    await expect(timer).toBeVisible();
  });

  test('active player position is locked during steal window', async ({ page }) => {
    await placeSong(page, 0);

    // Wait for steal window
    await page.getByText('Steal Window!').waitFor({ state: 'visible' });

    // The locked position should show an X and be disabled
    const lockedButton = page.getByLabel(/Position 0 locked/);
    await expect(lockedButton).toBeVisible();
    await expect(lockedButton).toBeDisabled();
  });

  test('steal window resolves after timer expires', async ({ page }) => {
    await placeSong(page, 0);

    // Wait for steal window
    await page.getByText('Steal Window!').waitFor({ state: 'visible' });

    // Wait for it to resolve (10s local timer + buffer)
    const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });

    // Result should be shown
    const resultBanner = page.locator('text=/Correct!|Wrong!/');
    await expect(resultBanner).toBeVisible();
  });

  test('Next Turn appears after steal window resolves', async ({ page }) => {
    await placeSong(page, 0);

    // Wait for full resolution
    const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await expect(nextTurnButton).toBeEnabled();
  });
});
