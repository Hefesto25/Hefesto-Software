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
    console.log('🔐 Acessando login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    
    // Preencher email
    const emailField = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailField.fill('marcelsgarioni@hefestoia.com');
    
    // Preencher senha
    const passwordField = await page.locator('input[type="password"]').first();
    await passwordField.fill('Marcel@08090');
    
    // Clique Entrar
    const btnEntrar = await page.locator('button:has-text("Entrar"), button[type="submit"]').first();
    await btnEntrar.click();
    
    // Aguardar redirecionamento
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('✓ Login realizado');
    console.log('📸 Capturando screenshots da aba Comercial...\n');
    
    // Ir para comercial
    await page.goto(`${BASE_URL}/comercial`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const screens = [
      { name: '01-painel-kpis', label: 'Painel com KPIs' },
      { name: '02-painel-widgets', label: 'Painel com Widgets (Dashboard Hub)' },
      { name: '03-negocios-kanban', label: 'Negócios - Kanban', btn: 'Negócios' },
      { name: '04-crm', label: 'CRM - Diretório de Clientes', btn: 'CRM' },
      { name: '05-fila-retorno', label: 'Fila de Retorno', btn: 'Fila de Retorno' },
      { name: '06-funil-conversao', label: 'Funil de Conversão', btn: 'Funil' },
    ];
    
    for (const screen of screens) {
      if (screen.btn) {
        console.log(`  Navegando para: ${screen.label}...`);
        const btn = await page.locator(`button:has-text("${screen.btn}")`).first();
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1500);
        }
      } else {
        console.log(`  Capturando: ${screen.label}...`);
      }
      
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/${screen.name}.png`,
        fullPage: false
      });
      console.log(`    ✓ ${screen.name}.png\n`);
    }
    
    console.log('✓ Todas as screenshots foram capturadas com sucesso!');
    
  } catch (error) {
    console.error('✗ Erro:', error.message);
  } finally {
    await browser.close();
  }
}

main();
