const { test, expect } = require('@playwright/test');

test.describe('IndiVote E2E Tests', () => {
  test('should load the homepage and render core components', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/IndiVote/i);

    // Check map container
    const map = page.locator('#regions_div');
    await expect(map).toBeVisible();

    // Check language switcher
    const langSwitcher = page.locator('#langSwitcher');
    await expect(langSwitcher).toBeVisible();
  });

  test('should open chat widget, type a message, and send it', async ({ page }) => {
    await page.goto('/');

    // Locate and click the chat floating action button
    const chatFab = page.locator('#chatFab');
    await expect(chatFab).toBeVisible();
    await chatFab.click();

    // Verify chat panel opened
    const chatPanel = page.locator('#chatPanel');
    await expect(chatPanel).toHaveClass(/open/);

    // If API Key setup is visible, we bypass it for this test
    // We just want to check if typing and sending adds the message to the DOM
    const chatInput = page.locator('#chatInput');
    await chatInput.fill('What is the voting age in India?');

    const sendBtn = page.locator('#chatSend');
    await sendBtn.click();

    // Verify the user message appeared in the chat box
    const messages = page.locator('#chatMessages');
    await expect(messages).toContainText('What is the voting age in India?');
  });
});
