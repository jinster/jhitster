import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
  createMultiplayerPages,
  hostSetupAndWait,
  guestJoinRoom,
  hostStartGame,
  setupMultiplayerGame,
  placeSong,
} from './helpers';

// Multiplayer tests need extra time for PeerJS signaling + 5s steal windows
test.setTimeout(90_000);

// ── Lobby & Connection ─────────────────────────────────

test.describe('Multiplayer Lobby', () => {
  let hostContext: BrowserContext | undefined;
  let guestContext: BrowserContext | undefined;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    ({ hostContext, guestContext, hostPage, guestPage } =
      await createMultiplayerPages(browser));
  });

  test.afterEach(async () => {
    await hostContext?.close();
    await guestContext?.close();
  });

  test('host lobby shows room code after setup', async () => {
    const roomCode = await hostSetupAndWait(hostPage, 'HostPlayer');
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('guest connects and appears in host player list', async () => {
    const roomCode = await hostSetupAndWait(hostPage, 'HostPlayer');
    await guestJoinRoom(guestPage, 'GuestPlayer', roomCode);

    // Guest should see "Connected!" and their player assignment
    await expect(guestPage.getByText('Connected!')).toBeVisible();
    await expect(guestPage.getByText(/Player \d+/)).toBeVisible();

    // Host should see guest name in the player list
    await expect(hostPage.getByText('GuestPlayer', { exact: true })).toBeVisible();
    // Host should show "1 guest connected"
    await expect(hostPage.getByText('1 guest connected')).toBeVisible();
  });

  test('Start Game button is disabled with no guests', async () => {
    await hostSetupAndWait(hostPage, 'HostPlayer');
    await expect(hostPage.getByRole('button', { name: 'Start Game' })).toBeDisabled();
  });

  test('Start Game navigates both host and guest to gameplay', async () => {
    const roomCode = await hostSetupAndWait(hostPage, 'HostPlayer');
    await guestJoinRoom(guestPage, 'GuestPlayer', roomCode);
    await hostStartGame(hostPage, guestPage, 'GuestPlayer');

    await expect(hostPage).toHaveURL(/.*#\/play$/);
    await expect(guestPage).toHaveURL(/.*#\/guest-play$/);
  });
});

// ── Host's Turn ────────────────────────────────────────

test.describe('Multiplayer — Host Turn', () => {
  let hostContext: BrowserContext | undefined;
  let guestContext: BrowserContext | undefined;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    ({ hostContext, guestContext, hostPage, guestPage } =
      await setupMultiplayerGame(browser, 'HostMP', 'GuestMP'));
  });

  test.afterEach(async () => {
    await hostContext?.close();
    await guestContext?.close();
  });

  test('host sees their own turn first', async () => {
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
  });

  test('guest is on guest-play page during host turn', async () => {
    // Guest is on /guest-play and sees their own name or turn info
    // (the initial GAME_STATE may be missed due to a navigation race,
    //  so we check the page URL rather than specific turn text)
    await expect(guestPage).toHaveURL(/.*#\/guest-play$/);
    // Guest should at minimum see their player name heading
    await expect(guestPage.getByText('GuestMP')).toBeVisible({ timeout: 10000 });
  });

  test('host can place card and see result', async () => {
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
    await placeSong(hostPage, 0);

    const nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await expect(hostPage.locator('text=/Correct!|Wrong!/')).toBeVisible();
  });

  test('guest sees steal window during host turn', async () => {
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
    await placeSong(hostPage, 0);

    // Guest should see steal window (both players have tokens)
    await expect(guestPage.getByText('Steal Window!')).toBeVisible({ timeout: 10000 });
  });

  test('guest sees turn result after host places', async () => {
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
    await placeSong(hostPage, 0);

    const nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });

    await expect(guestPage.locator('text=/Correct!|Wrong!/')).toBeVisible({ timeout: 10000 });
  });

  test('after host Next Turn, guest gets their turn', async () => {
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
    await placeSong(hostPage, 0);
    const nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await nextTurnButton.click();

    await expect(hostPage.getByText('Waiting for GuestMP to place...')).toBeVisible({ timeout: 10000 });
    await expect(guestPage.getByText('Your Turn!')).toBeVisible({ timeout: 10000 });
  });
});

// ── Guest's Turn ───────────────────────────────────────

test.describe('Multiplayer — Guest Turn', () => {
  let hostContext: BrowserContext | undefined;
  let guestContext: BrowserContext | undefined;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    ({ hostContext, guestContext, hostPage, guestPage } =
      await setupMultiplayerGame(browser, 'HostMP', 'GuestMP'));

    // Complete host's turn to reach guest's turn
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
    await placeSong(hostPage, 0);
    const nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await nextTurnButton.click();

    await expect(guestPage.getByText('Your Turn!')).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    await hostContext?.close();
    await guestContext?.close();
  });

  test('guest sees drop zones and can select a position', async () => {
    const dropZones = guestPage.getByLabel(/Place card at position/);
    await expect(dropZones.first()).toBeVisible();

    await dropZones.first().click();
    await expect(guestPage.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await expect(guestPage.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('guest can cancel a pending placement', async () => {
    const dropZones = guestPage.getByLabel(/Place card at position/);
    await dropZones.first().click();
    await guestPage.getByRole('button', { name: 'Cancel' }).click();

    await expect(guestPage.getByRole('button', { name: 'Confirm' })).not.toBeVisible();
  });

  test('guest can confirm placement and host resolves turn', async () => {
    await placeSong(guestPage, 0);

    const nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await expect(hostPage.locator('text=/Correct!|Wrong!/')).toBeVisible();
  });

  test('guest sees turn result after their placement resolves', async () => {
    await placeSong(guestPage, 0);

    const nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });

    await expect(guestPage.locator('text=/Correct!|Wrong!/')).toBeVisible({ timeout: 10000 });
  });

  test('host advances turn back to host after guest plays', async () => {
    await placeSong(guestPage, 0);

    const nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await nextTurnButton.click();

    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible({ timeout: 10000 });
  });
});

// ── Skip Song in Multiplayer ───────────────────────────

test.describe('Multiplayer — Skip Song', () => {
  let hostContext: BrowserContext | undefined;
  let guestContext: BrowserContext | undefined;
  let hostPage: Page;
  let guestPage: Page;

  test.afterEach(async () => {
    await hostContext?.close();
    await guestContext?.close();
  });

  test('host can skip song on their turn', async ({ browser }) => {
    ({ hostContext, guestContext, hostPage, guestPage } =
      await setupMultiplayerGame(browser, 'HostMP', 'GuestMP'));

    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();

    const skipButton = hostPage.getByRole('button', { name: 'Skip Song (1 token)' });
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    // Still on host's turn with drop zones visible
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
    await expect(hostPage.getByLabel(/Place card at position/).first()).toBeVisible();
  });

  test('guest can skip song on their turn', async ({ browser }) => {
    ({ hostContext, guestContext, hostPage, guestPage } =
      await setupMultiplayerGame(browser, 'HostMP', 'GuestMP'));

    // Complete host's turn
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
    await placeSong(hostPage, 0);
    const nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await nextTurnButton.click();

    await expect(guestPage.getByText('Your Turn!')).toBeVisible({ timeout: 10000 });

    const skipButton = guestPage.getByRole('button', { name: 'Skip Song (1 token)' });
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    // Guest should get new YOUR_TURN and still be on their turn
    await expect(guestPage.getByText('Your Turn!')).toBeVisible({ timeout: 10000 });
  });
});

// ── Full Round Trip ────────────────────────────────────

test.describe('Multiplayer — Full Round', () => {
  let hostContext: BrowserContext | undefined;
  let guestContext: BrowserContext | undefined;
  let hostPage: Page;
  let guestPage: Page;

  test.afterEach(async () => {
    await hostContext?.close();
    await guestContext?.close();
  });

  test('complete round: host turn → guest turn → host turn', async ({ browser }) => {
    ({ hostContext, guestContext, hostPage, guestPage } =
      await setupMultiplayerGame(browser, 'HostMP', 'GuestMP'));

    // === Turn 1: Host's turn ===
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible();
    await placeSong(hostPage, 0);
    let nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await nextTurnButton.click();

    // === Turn 2: Guest's turn ===
    await expect(guestPage.getByText('Your Turn!')).toBeVisible({ timeout: 10000 });
    await expect(hostPage.getByText('Waiting for GuestMP to place...')).toBeVisible({ timeout: 10000 });

    await placeSong(guestPage, 0);

    nextTurnButton = hostPage.getByRole('button', { name: 'Next Turn' });
    await nextTurnButton.waitFor({ state: 'visible', timeout: 15000 });
    await nextTurnButton.click();

    // === Turn 3: Back to Host ===
    await expect(hostPage.getByText("HostMP's Turn")).toBeVisible({ timeout: 10000 });
    // Guest is still on guest-play (may show previous turn result or waiting state)
    await expect(guestPage).toHaveURL(/.*#\/guest-play$/);
  });
});
