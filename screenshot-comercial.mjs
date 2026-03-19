import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = './screenshots-comercial';

// Ensure directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Authentication config
const AUTH = {
  needed: true,
  loginUrl: '/login',
  email: 'marcelsgarioni@hefestoia.com',
  password: 'Marcel@08090',
};

// Screenshots to capture
const SCREENSHOTS = [
  { name: '01-dashboard-painel', url: '/comercial?tab=painel', waitFor: '.widget', actions: [{ wait: 500 }] },
  { name: '02-dashboard-widgets', url: '/comercial?tab=painel', waitFor: '.widget-leads-retorno', actions: [{ wait: 800 }] },
  { name: '03-fila-retorno', url: '/comercial?tab=fila_retorno', waitFor: '.space-y-3', actions: [{ wait: 600 }] },
  { name: '04-fila-retorno-cards', url: '/comercial?tab=fila_retorno', waitFor: '[class*="CardLeadRetorno"]', actions: [{ wait: 500 }] },
  { name: '05-funil-conversao', url: '/comercial?tab=funil', waitFor: '.h-96', actions: [{ wait: 800 }] },
  { name: '06-crm-tab', url: '/comercial?tab=crm', waitFor: '[class*="ClienteCRM"]', actions: [{ wait: 500 }] },
  { name: '07-kanban-negocios', url: '/comercial?tab=negocios', waitFor: '[class*="kanban"]', actions: [{ wait: 600 }] },
];

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    // Create context with HiDPI settings and dark mode
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
    });

    const page = await context.newPage();

    // Login
    if (AUTH.needed) {
      console.log('🔐 Logging in...');
      await page.goto(`${BASE_URL}${AUTH.loginUrl}`);
      await page.waitForLoadState('networkidle');

      // Fill email
      const emailField = page.locator([
        'input[type="email"]',
        'input[name="email"]',
        'input[id="email"]',
        'input[placeholder*="email" i]',
        'input[name="username"]',
      ].join(', ')).first();

      await emailField.fill(AUTH.email);
      console.log('✓ Email filled');

      // Fill password
      const passwordField = page.locator([
        'input[type="password"]',
        'input[name="password"]',
        'input[id="password"]',
      ].join(', ')).first();

      await passwordField.fill(AUTH.password);
      console.log('✓ Password filled');

      // Click submit
      const submitButton = page.locator([
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Log in")',
        'button:has-text("Login")',
        'button:has-text("Entrar")',
      ].join(', ')).first();

      await submitButton.click();
      console.log('✓ Login button clicked');

      // Wait for navigation
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      console.log('✓ Login complete\n');
    }

    // Capture each screenshot
    for (const shot of SCREENSHOTS) {
      try {
        console.log(`📸 Capturing: ${shot.name}`);

        const fullUrl = `${BASE_URL}${shot.url}`;
        await page.goto(fullUrl, { waitUntil: 'networkidle' });
        await page.waitForLoadState('domcontentloaded');

        // Wait for specific element if provided
        if (shot.waitFor) {
          try {
            await page.waitForSelector(shot.waitFor, { timeout: 5000 });
          } catch (e) {
            console.log(`⚠️  Element not found: ${shot.waitFor}, continuing anyway`);
          }
        }

        // Perform actions before screenshot
        if (shot.actions) {
          for (const action of shot.actions) {
            if (action.wait) {
              await page.waitForTimeout(action.wait);
            }
            if (action.click) {
              await page.click(action.click);
              await page.waitForTimeout(300);
            }
          }
        }

        // Take screenshot
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/${shot.name}.png`,
          fullPage: false,
        });

        console.log(`   ✓ Saved: ${shot.name}.png\n`);
      } catch (error) {
        console.error(`❌ Error capturing ${shot.name}: ${error.message}\n`);
      }
    }

    await context.close();
    console.log('✅ All screenshots captured!');

    // List generated files
    console.log('\n📁 Generated files:');
    const files = fs.readdirSync(SCREENSHOTS_DIR);
    files.forEach((file) => {
      const path = `${SCREENSHOTS_DIR}/${file}`;
      const stats = fs.statSync(path);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   ${file} (${sizeMB} MB)`);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
