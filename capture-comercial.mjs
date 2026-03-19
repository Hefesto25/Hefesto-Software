import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = './screenshots-comercial';

// Create screenshots directory
import { mkdirSync } from 'fs';
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  try {
    console.log('Navegando para /comercial...');
    await page.goto(`${BASE_URL}/comercial`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1500);
    
    console.log('Capturando: 01-painel-dashboard');
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/01-painel-dashboard.png`,
      fullPage: false
    });
    
    console.log('Screenshots capturadas com sucesso!');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await browser.close();
  }
}

main();
