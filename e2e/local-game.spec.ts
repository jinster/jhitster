import { test, expect } from '@playwright/test';
import { navigateToGame, placeSong, advanceTurn } from './helpers';

test.describe('Local Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGame(page, ['Alice', 'Bob']);
  });

  test('game screen shows current player turn heading', async ({ page }) => {
    // One of the two players should be shown
    const heading = page.locator('h2');
    await expect(heading).toContainText("'s Turn");
  });

  test('game screen shows timeline with drop zones', async ({ page }) => {
    // Drop zones should be visible (buttons with "Place card at position" aria-label)
    const dropZones = page.getByLabel(/Place card at position/);
    await expect(dropZones.first()).toBeVisible();
  });

  test('clicking a drop zone shows Confirm and Cancel buttons', async ({ page }) => {
    const dropZone = page.getByLabel(/Place card at position/).first();
    await dropZone.click();

    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('clicking Cancel deselects the drop zone', async ({ page }) => {
    const dropZone = page.getByLabel(/Place card at position/).first();
    await dropZone.click();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('button', { name: 'Confirm' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible();
  });

  test('confirming placement shows result banner and Next Turn', async ({ page }) => {
    // Place at first available position
    await placeSong(page, 0);

    // Wait for the steal window to resolve (if applicable), then check result
    const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 30000 });

    // Should show either Correct or Wrong result
    const resultBanner = page.locator('text=/Correct!|Wrong!/');
    await expect(resultBanner).toBeVisible();
  });

  test('Next Turn advances to next player', async ({ page }) => {
    const heading = page.locator('h2');
    const firstPlayerTurn = await heading.textContent();

    await placeSong(page, 0);
    await advanceTurn(page);

    // Heading should now show a different player (or same if only 2 and wraps around)
    const secondPlayerTurn = await heading.textContent();
    // With 2 players, it should switch
    expect(secondPlayerTurn).not.toBe(firstPlayerTurn);
  });

  test('token display shows for each player', async ({ page }) => {
    // Token chips visible for all players
    const tokenChips = page.locator('text=/\\d+ tokens?/');
    await expect(tokenChips.first()).toBeVisible();
  });
});
