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
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-chat');

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function main() {
  console.log('\n🎬 Starting screenshot capture for Chat...\n');

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  try {
    // ========== LOGIN ==========
    console.log('🔐 Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Find and fill email field
    const emailField = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    await emailField.fill(EMAIL);
    console.log('   ✓ Email entered');

    // Find and fill password field
    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill(PASSWORD);
    console.log('   ✓ Password entered');

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
    await submitButton.click();
    console.log('   ✓ Login submitted');

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('✅ Login successful\n');

    // ========== NAVIGATE TO CHAT ==========
    console.log('📱 Navigating to chat...');
    await page.goto(`${BASE_URL}/chat`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    console.log('✅ Chat page loaded\n');

    // ========== SCREENSHOT 1: Full Chat View (DMs Mode) ==========
    console.log('📸 Capturing: Full Chat View with DMs');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-chat-full-view-dms.png'),
      fullPage: false,
    });
    console.log('   ✓ Saved: 01-chat-full-view-dms.png\n');

    // ========== SCREENSHOT 2: Switch to Canais ==========
    console.log('📸 Capturing: Chat View with Canais');
    // Click on "Canais" tab
    const canaisTab = page.locator('button:has-text("Canais")').first();
    await canaisTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-chat-full-view-canais.png'),
      fullPage: false,
    });
    console.log('   ✓ Saved: 02-chat-full-view-canais.png\n');

    // ========== SCREENSHOT 3: Sidebar Detail (DMs) ==========
    console.log('📸 Capturing: Sidebar DMs Section');
    const dmsTab = page.locator('button:has-text("DMs")').first();
    await dmsTab.click();
    await page.waitForTimeout(500);

    const sidebar = page.locator('.chat-channels');
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({
        path: path.join(SCREENSHOTS_DIR, '03-sidebar-dms.png'),
      });
      console.log('   ✓ Saved: 03-sidebar-dms.png\n');
    }

    // ========== SCREENSHOT 4: Sidebar Detail (Canais) ==========
    console.log('📸 Capturing: Sidebar Canais Section');
    await canaisTab.click();
    await page.waitForTimeout(500);

    if (await sidebar.isVisible()) {
      await sidebar.screenshot({
        path: path.join(SCREENSHOTS_DIR, '04-sidebar-canais.png'),
      });
      console.log('   ✓ Saved: 04-sidebar-canais.png\n');
    }

    // ========== SCREENSHOT 5: Main Chat Area (Canal Selecionado) ==========
    console.log('📸 Capturing: Main Chat Area with Channel');
    const mainArea = page.locator('.chat-main');
    if (await mainArea.isVisible()) {
      await mainArea.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05-main-chat-area.png'),
      });
      console.log('   ✓ Saved: 05-main-chat-area.png\n');
    }

    // ========== SCREENSHOT 6: User Header ==========
    console.log('📸 Capturing: Chat Header');
    const header = page.locator('.chat-header');
    if (await header.isVisible()) {
      await header.screenshot({
        path: path.join(SCREENSHOTS_DIR, '06-chat-header.png'),
      });
      console.log('   ✓ Saved: 06-chat-header.png\n');
    }

    console.log('✅ All screenshots captured successfully!\n');

    // List all created files
    console.log('📋 Generated Files:');
    const files = fs.readdirSync(SCREENSHOTS_DIR).sort();
    for (const file of files) {
      const filePath = path.join(SCREENSHOTS_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ✓ ${file} (${sizeMB} MB)`);
    }
    console.log();

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error.message);
    console.log('\nNote: Make sure the dev server is running on http://localhost:3000');
    console.log('If not, start it with: npm run dev\n');
  } finally {
    await browser.close();
  }
}

main()
  .then(() => {
    // Clean up temp env file
    console.log('🧹 Cleaning up temporary files...');
    try {
      fs.unlinkSync(path.join(__dirname, '.env.local.tmp'));
      console.log('   ✓ Removed .env.local.tmp\n');
    } catch (e) {
      console.warn('   ⚠ Could not remove .env.local.tmp (might already be deleted)\n');
    }
    console.log('🎉 Screenshot capture complete!\n');
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    // Clean up on error
    try {
      fs.unlinkSync(path.join(__dirname, '.env.local.tmp'));
    } catch (e) {}
    process.exit(1);
  });
