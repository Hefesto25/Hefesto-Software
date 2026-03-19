import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = './screenshots-comercial';

mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  try {
    console.log('Acessando login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    
    // Preencher email
    console.log('Preenchendo credenciais...');
    const emailInputs = await page.locator('input[type="email"], input[name="email"]');
    const firstEmail = emailInputs.first();
    if (await firstEmail.isVisible()) {
      await firstEmail.fill('admin@hefesto.com');
    }
    
    // Preencher senha
    const passwordField = await page.locator('input[type="password"]').first();
    if (await passwordField.isVisible()) {
      await passwordField.fill('123456');
    }
    
    // Clique no botão Entrar
    const buttonEntrar = await page.locator('button:has-text("Entrar"), button[type="submit"]').first();
    console.log('Clicando em Entrar...');
    await buttonEntrar.click();
    
    // Aguardar redirecionamento
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('Navegando para /comercial...');
    await page.goto(`${BASE_URL}/comercial`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Capturar painel
    console.log('Capturando painel...');
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/01-painel.png`,
      fullPage: false
    });
    
    // Capturar negócios
    const btnNeg = await page.locator('button:has-text("Negócios")').first();
    if (await btnNeg.isVisible()) {
      await btnNeg.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/02-negocios.png`,
        fullPage: false
      });
    }
    
    // Capturar CRM
    const btnCRM = await page.locator('button:has-text("CRM")').first();
    if (await btnCRM.isVisible()) {
      await btnCRM.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/03-crm.png`,
        fullPage: false
      });
    }
    
    console.log('✓ Screenshots capturadas com sucesso!');
    
  } catch (error) {
    console.error('✗ Erro:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main();
