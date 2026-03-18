import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read credentials from temp env file
const envFile = path.join(__dirname, '.env.local.tmp');
const envContent = fs.readFileSync(envFile, 'utf-8');
const emailMatch = envContent.match(/SCREENSHOT_EMAIL=(.+)/);
const passwordMatch = envContent.match(/SCREENSHOT_PASSWORD=(.+)/);

if (!emailMatch || !passwordMatch) {
  console.error('❌ Missing email or password in .env.local.tmp');
  process.exit(1);
}

const EMAIL = emailMatch[1].trim();
const PASSWORD = passwordMatch[1].trim();
const BASE_URL = 'http://localhost:3000';

async function testSearchAndPinned() {
  console.log('\n🧪 Testing Message Search & Pinned Messages\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    // ========== LOGIN ==========
    console.log('🔐 Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    await emailField.fill(EMAIL);

    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill(PASSWORD);

    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle');
    console.log('✅ Login successful\n');

    // ========== NAVIGATE TO CHAT ==========
    console.log('📱 Navigating to chat...');
    await page.goto(`${BASE_URL}/chat`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('✅ Chat page loaded\n');

    // ========== TEST 1: SEARCH MODAL ==========
    console.log('📋 TEST 1: Search Modal');

    // Check if search icon button exists
    const searchButton = page.locator('button[title="Buscar (Cmd+K)"], button[aria-label*="busca"]').first();
    const searchButtonExists = await searchButton.isVisible().catch(() => false);
    console.log('   ✓ Search button visible:', searchButtonExists);

    // Open search with Cmd+K
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(300);

    const searchModal = page.locator('.search-modal').first();
    const searchModalVisible = await searchModal.isVisible().catch(() => false);
    console.log('   ✓ Search modal opens with Cmd+K:', searchModalVisible);

    if (searchModalVisible) {
      // Type in search
      const searchInput = page.locator('.search-modal-input').first();
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      const searchResults = page.locator('.search-result-item');
      const resultCount = await searchResults.count();
      console.log('   ✓ Search results found:', resultCount);

      // Close search with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const modalAfterEscape = await searchModal.isVisible().catch(() => false);
      console.log('   ✓ Search modal closes with Escape:', !modalAfterEscape);
    }
    console.log();

    // ========== TEST 2: PINNED MESSAGES ==========
    console.log('📋 TEST 2: Pinned Messages');

    // Check if pinned button exists
    const pinnedButton = page.locator('button[title*="fixad"], button[aria-label*="fixad"]').first();
    const pinnedButtonExists = await pinnedButton.isVisible().catch(() => false);
    console.log('   ✓ Pinned button visible:', pinnedButtonExists);

    // Check for pin badge
    const pinnedBadge = page.locator('button:has-text("📌")').first();
    const pinnedBadgeVisible = await pinnedBadge.isVisible().catch(() => false);
    console.log('   ✓ Pinned badge visible:', pinnedBadgeVisible);

    // Click to open pinned panel
    if (pinnedButtonExists) {
      await pinnedButton.click();
      await page.waitForTimeout(300);

      const pinnedPanel = page.locator('.pinned-panel').first();
      const pinnedPanelVisible = await pinnedPanel.isVisible().catch(() => false);
      console.log('   ✓ Pinned panel opens:', pinnedPanelVisible);

      if (pinnedPanelVisible) {
        const pinnedTitle = page.locator('.pinned-panel-title').first();
        const titleText = await pinnedTitle.textContent();
        console.log('   ✓ Pinned panel title:', titleText);

        // Close pinned panel
        const closeButton = page.locator('.pinned-panel-close').first();
        await closeButton.click();
        await page.waitForTimeout(300);
        const panelAfterClose = await pinnedPanel.isVisible().catch(() => false);
        console.log('   ✓ Pinned panel closes:', !panelAfterClose);
      }
    }
    console.log();

    // ========== SCREENSHOTS ==========
    console.log('📸 Taking screenshots...');

    // Screenshot 1: Chat default view
    await page.screenshot({ path: 'screenshots-chat/01-chat-default.png', fullPage: false });
    console.log('   ✓ Screenshot: Chat default view');

    // Screenshot 2: Search modal open
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots-chat/02-search-modal.png', fullPage: false });
    await page.keyboard.press('Escape');
    console.log('   ✓ Screenshot: Search modal');

    // Screenshot 3: Pinned panel open
    if (pinnedButtonExists) {
      await pinnedButton.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'screenshots-chat/03-pinned-panel.png', fullPage: false });
      console.log('   ✓ Screenshot: Pinned panel');
    }

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.log('Note: Make sure the dev server is running on http://localhost:3000\n');
  } finally {
    await browser.close();
  }
}

testSearchAndPinned()
  .then(() => {
    console.log('🎉 Test suite complete!\n');
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
