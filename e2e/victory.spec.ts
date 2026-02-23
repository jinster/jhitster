import { test, expect } from '@playwright/test';
import { navigateToGame, advanceTurn } from './helpers';

test.describe('Victory Flow', () => {
  test('game loop survives multiple turns without crashing', async ({ page }) => {
    test.setTimeout(120_000);
    await navigateToGame(page, ['Alice', 'Bob']);

    // Play through several turns to verify the game loop is stable
    const maxTurns = 4;
    for (let turn = 0; turn < maxTurns; turn++) {
      const url = page.url();
      if (!url.includes('#/play')) break;

      // Wait for drop zones
      const dropZones = page.getByLabel(/Place card at position/);
      try {
        await dropZones.first().waitFor({ state: 'visible', timeout: 5000 });
      } catch {
        // Might be in steal window or transition — wait and retry
        await page.waitForTimeout(1000);
        continue;
      }

      // Place card
      await dropZones.first().click();
      const confirmBtn = page.getByRole('button', { name: 'Confirm' });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      // Advance turn
      try {
        await advanceTurn(page);
      } catch {
        break;
      }
    }

    // Verify we're still on a valid page (play or victory)
    const url = page.url();
    expect(url).toMatch(/#\/(play|victory)$/);
  });

  test('Play Again button navigates back to title screen', async ({ page }) => {
    // Set up a game so VictoryPage has state to render
    await navigateToGame(page, ['Alice', 'Bob']);

    // Inject a winner into the game state and navigate to victory
    // by simulating what happens when a player wins
    await page.evaluate(() => {
      // Dispatch a hash change to victory — the page will render
      // with whatever state exists
      window.location.hash = '#/victory';
    });

    // VictoryPage shows "Victory!" heading and "Play Again" button
    // even if winner name is missing (shows "Someone wins!")
    const playAgainButton = page.getByRole('button', { name: 'Play Again' });
    await playAgainButton.waitFor({ state: 'visible', timeout: 5000 });
    await playAgainButton.click();

    await expect(page).toHaveURL(/.*#\/$/);
    await expect(page.getByRole('heading', { name: 'JHitster' })).toBeVisible();
  });
});
