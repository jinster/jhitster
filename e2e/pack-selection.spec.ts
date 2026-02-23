import { test, expect } from '@playwright/test';

test.describe('Pack Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play a Local Game' }).click();
    await page.waitForURL('**/jhitster/#/packs');
  });

  test('at least one pack is pre-selected', async ({ page }) => {
    await expect(page.getByText('Selected').first()).toBeVisible();
  });

  test('can toggle packs on and off', async ({ page }) => {
    // The second pack should show "Tap to add" initially
    const kpopPack = page.getByRole('button', { name: /K-Pop Hits/ });
    await expect(kpopPack.getByText('Tap to add')).toBeVisible();

    // Toggle it on
    await kpopPack.click();
    await expect(kpopPack.getByText('Selected')).toBeVisible();

    // Toggle it back off
    await kpopPack.click();
    await expect(kpopPack.getByText('Tap to add')).toBeVisible();
  });

  test('must keep at least one pack selected', async ({ page }) => {
    // First pack is selected, try clicking it to deselect — should stay selected
    const billboardPack = page.getByRole('button', { name: /Billboard/ });
    await expect(billboardPack.getByText('Selected')).toBeVisible();
    await billboardPack.click();
    // Should still be selected since it's the only one
    await expect(billboardPack.getByText('Selected')).toBeVisible();
  });

  test('song count updates when toggling packs', async ({ page }) => {
    const songCountText = page.locator('text=/\\d+ songs selected/');
    const initialText = await songCountText.textContent();

    // Toggle second pack on
    await page.getByRole('button', { name: /K-Pop Hits/ }).click();
    const updatedText = await songCountText.textContent();

    expect(updatedText).not.toBe(initialText);
  });

  test('Continue button works when packs are selected', async ({ page }) => {
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/.*#\/setup$/);
  });
});
