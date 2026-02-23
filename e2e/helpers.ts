import type { Page, Browser } from '@playwright/test';

/**
 * Navigate through Title → Packs → Setup → Deal → Play with given player names.
 * Uses HashRouter paths (e.g. /#/packs).
 */
export async function navigateToGame(page: Page, playerNames: string[]) {
  // Title screen → click "Play a Local Game"
  await page.goto('/');
  await page.getByRole('button', { name: 'Play a Local Game' }).click();

  // Pack selection → click "Continue" (first pack is pre-selected)
  await page.waitForURL('**/jhitster/#/packs');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Player setup → fill in names
  await page.waitForURL('**/jhitster/#/setup');
  const inputs = page.locator('input[type="text"]');

  // Fill the first two default inputs
  for (let i = 0; i < Math.min(2, playerNames.length); i++) {
    await inputs.nth(i).fill(playerNames[i]);
  }

  // Add and fill extra players beyond the first two
  for (let i = 2; i < playerNames.length; i++) {
    await page.getByRole('button', { name: '+ Add Player' }).click();
    await inputs.nth(i).fill(playerNames[i]);
  }

  // Continue to deal
  await page.getByRole('button', { name: 'Continue' }).click();

  // Deal screen → wait for "Start Playing!" button and click it
  await page.waitForURL('**/jhitster/#/deal');
  const startButton = page.getByRole('button', { name: 'Start Playing!' });
  await startButton.waitFor({ state: 'visible', timeout: 15000 });
  await startButton.click();

  // Wait for game screen
  await page.waitForURL('**/jhitster/#/play');
}

/**
 * Wait until the heading shows the given player's turn.
 */
export async function waitForTurn(page: Page, playerName: string) {
  await page.getByText(`${playerName}'s Turn`).waitFor({ state: 'visible', timeout: 30000 });
}

/**
 * Click the drop zone at the given position, then click Confirm.
 */
export async function placeSong(page: Page, position: number) {
  await page.getByLabel(`Place card at position ${position}`).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
}

/**
 * Advance to the next turn. Handles waiting for the steal window to resolve
 * and for the Next Turn button to appear.
 */
export async function advanceTurn(page: Page) {
  // Wait for either the steal window to finish or the result to show
  const nextTurnButton = page.getByRole('button', { name: 'Next Turn' });
  await nextTurnButton.waitFor({ state: 'visible', timeout: 30000 });
  await nextTurnButton.click();
}

// ── Multiplayer helpers ────────────────────────────────

const BASE_URL = 'http://localhost:5173/jhitster/';

/**
 * Create two independent browser contexts (host + guest) with separate pages.
 */
export async function createMultiplayerPages(browser: Browser) {
  const hostContext = await browser.newContext({ baseURL: BASE_URL });
  const guestContext = await browser.newContext({ baseURL: BASE_URL });
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  return { hostContext, guestContext, hostPage, guestPage };
}

/**
 * Host: Navigate to host lobby, enter name, select packs, proceed to waiting room.
 * Returns the room code displayed on the waiting screen.
 */
export async function hostSetupAndWait(hostPage: Page, hostName: string) {
  await hostPage.goto('/');
  await hostPage.getByRole('button', { name: 'Play Multiplayer' }).click();
  await hostPage.waitForURL('**/jhitster/#/multiplayer');
  await hostPage.getByRole('button', { name: 'Host a Game' }).click();
  await hostPage.waitForURL('**/jhitster/#/host');

  // Enter host name and continue (first pack pre-selected)
  await hostPage.getByPlaceholder('Enter your name').fill(hostName);
  await hostPage.getByRole('button', { name: 'Continue' }).click();

  // Wait for "Waiting for Players" heading and room code to appear
  await hostPage.getByRole('heading', { name: 'Waiting for Players' }).waitFor({ state: 'visible', timeout: 15000 });
  // Room code is displayed inside a button with monospace font — wait for it to not be "..."
  const codeButton = hostPage.locator('.font-mono.font-bold.text-purple-400');
  await codeButton.waitFor({ state: 'visible' });
  // Poll until the code is not "..." (PeerJS signaling server can be slow)
  let roomCode = '';
  for (let i = 0; i < 60; i++) {
    roomCode = (await codeButton.textContent())?.trim() ?? '';
    if (roomCode && roomCode !== '...') break;
    await hostPage.waitForTimeout(500);
  }
  if (!roomCode || roomCode === '...') {
    throw new Error('Room code did not appear within timeout');
  }
  return roomCode;
}

/**
 * Guest: Navigate to join page, enter name and room code, submit, wait for connection.
 */
export async function guestJoinRoom(guestPage: Page, guestName: string, roomCode: string) {
  await guestPage.goto('/');
  await guestPage.getByRole('button', { name: 'Play Multiplayer' }).click();
  await guestPage.waitForURL('**/jhitster/#/multiplayer');
  await guestPage.getByRole('button', { name: 'Join a Game' }).click();
  await guestPage.waitForURL('**/jhitster/#/join');

  await guestPage.getByPlaceholder('Enter your name').fill(guestName);
  await guestPage.getByPlaceholder('Enter 6-character code').fill(roomCode);
  await guestPage.getByRole('button', { name: 'Join' }).click();

  // Wait for "Connected!" text
  await guestPage.getByText('Connected!').waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Host: Wait for guest to appear in player list, then click "Start Game".
 * Both host and guest navigate to their game screens.
 */
export async function hostStartGame(hostPage: Page, guestPage: Page, guestName: string) {
  // Wait for guest name to appear in host's player list
  await hostPage.getByText(guestName, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

  // Click Start Game
  await hostPage.getByRole('button', { name: 'Start Game' }).click();

  // Host goes through deal screen
  await hostPage.waitForURL('**/jhitster/#/deal');
  const startButton = hostPage.getByRole('button', { name: 'Start Playing!' });
  await startButton.waitFor({ state: 'visible', timeout: 15000 });
  await startButton.click();

  // Host arrives at /play
  await hostPage.waitForURL('**/jhitster/#/play');

  // Guest auto-navigates to /guest-play
  await guestPage.waitForURL('**/jhitster/#/guest-play', { timeout: 15000 });
}

/**
 * Full multiplayer setup: host creates room, guest joins, host starts game.
 * Returns both pages ready for gameplay.
 */
export async function setupMultiplayerGame(
  browser: Browser,
  hostName: string,
  guestName: string,
) {
  const { hostContext, guestContext, hostPage, guestPage } = await createMultiplayerPages(browser);

  const roomCode = await hostSetupAndWait(hostPage, hostName);
  await guestJoinRoom(guestPage, guestName, roomCode);
  await hostStartGame(hostPage, guestPage, guestName);

  return { hostContext, guestContext, hostPage, guestPage, roomCode };
}
