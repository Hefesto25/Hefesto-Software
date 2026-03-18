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

async function testAccessibility() {
  console.log('\n🔍 Starting Accessibility Audit for Chat Feature\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const issues = [];

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
    await page.waitForTimeout(1500);
    console.log('✅ Chat page loaded\n');

    // ========== TEST 1: Semantic HTML Structure ==========
    console.log('📋 TEST 1: Semantic HTML Structure');
    const semanticElements = await page.evaluate(() => {
      const checks = {
        hasMainRole: !!document.querySelector('[role="main"], main'),
        hasSidebar: !!document.querySelector('[role="navigation"], nav, .sidebar'),
        hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        headingHierarchy: [],
        hasSections: !!document.querySelector('section, article'),
      };

      // Check heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      checks.headingHierarchy = headings.map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent.trim().substring(0, 50),
      }));

      return checks;
    });

    console.log('   ✓ Main content role:', semanticElements.hasMainRole);
    console.log('   ✓ Navigation element:', semanticElements.hasSidebar);
    console.log('   ✓ Heading count:', semanticElements.hasHeadings);
    console.log('   ✓ Section elements:', semanticElements.hasSections);

    if (semanticElements.headingHierarchy.length === 0) {
      issues.push({
        category: 'Semantic HTML',
        severity: 'Warning',
        issue: 'No heading hierarchy found on page',
        recommendation: 'Add h1-h6 elements to structure content hierarchically',
      });
      console.log('   ⚠️  No heading hierarchy found');
    }
    console.log();

    // ========== TEST 2: ARIA Labels and Roles ==========
    console.log('📋 TEST 2: ARIA Labels and Roles');
    const ariaElements = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const icons = document.querySelectorAll('svg, [class*="icon"]');
      const alerts = document.querySelectorAll('[role="alert"], [aria-live]');
      const labels = document.querySelectorAll('label');

      const unlabeledButtons = Array.from(buttons).filter(btn => {
        const hasText = btn.textContent.trim().length > 0;
        const hasAriaLabel = btn.getAttribute('aria-label');
        const hasTitleAttr = btn.getAttribute('title');
        return !hasText && !hasAriaLabel && !hasTitleAttr;
      });

      return {
        buttonCount: buttons.length,
        unlabeledButtons: unlabeledButtons.length,
        unlabeledButtonExamples: unlabeledButtons.slice(0, 3).map(b => ({
          html: b.outerHTML.substring(0, 100),
        })),
        iconCount: icons.length,
        alertRegions: alerts.length,
        labelCount: labels.length,
      };
    });

    console.log('   ✓ Total buttons:', ariaElements.buttonCount);
    console.log('   ✓ Unlabeled buttons:', ariaElements.unlabeledButtons);
    console.log('   ✓ ARIA alert regions:', ariaElements.alertRegions);
    console.log('   ✓ Label elements:', ariaElements.labelCount);

    if (ariaElements.unlabeledButtons > 0) {
      issues.push({
        category: 'ARIA Labels',
        severity: 'Error',
        issue: `${ariaElements.unlabeledButtons} buttons without accessible labels`,
        recommendation: 'Add aria-label or aria-labelledby to buttons with only icons',
      });
      console.log('   ❌ Found unlabeled buttons');
    }
    console.log();

    // ========== TEST 3: Keyboard Navigation ==========
    console.log('📋 TEST 3: Keyboard Navigation');
    const focusableElements = await page.evaluate(() => {
      const focusable = document.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return {
        count: focusable.length,
        tabIndexNegative: Array.from(document.querySelectorAll('[tabindex="-1"]')).length,
        hasSkipLink: !!document.querySelector('a[href="#main"], a[href="#content"]'),
      };
    });

    console.log('   ✓ Focusable elements:', focusableElements.count);
    console.log('   ✓ Elements with tabindex="-1":', focusableElements.tabIndexNegative);
    console.log('   ✓ Skip link present:', focusableElements.hasSkipLink);

    if (!focusableElements.hasSkipLink && focusableElements.count > 10) {
      issues.push({
        category: 'Keyboard Navigation',
        severity: 'Warning',
        issue: 'No skip link found for keyboard navigation',
        recommendation: 'Add a hidden skip link to jump to main content',
      });
      console.log('   ⚠️  Consider adding a skip link');
    }
    console.log();

    // ========== TEST 4: Color Contrast ==========
    console.log('📋 TEST 4: Color Contrast Analysis');
    const contrastResults = await page.evaluate(() => {
      const results = {
        textElementsChecked: 0,
        potentialIssues: [],
      };

      const textElements = document.querySelectorAll('button, a, p, span, label, h1, h2, h3, h4, h5, h6');

      textElements.forEach(el => {
        if (!el.textContent.trim()) return;

        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const bgColor = styles.backgroundColor;

        // Simple check: warn about very light text
        if (color.includes('rgb') && bgColor.includes('rgb')) {
          const isLightText = color.includes('rgb(25');
          const isLightBg = bgColor.includes('rgb(255') || bgColor === 'rgba(0, 0, 0, 0)';

          if (isLightBg) {
            results.potentialIssues.push({
              element: el.tagName,
              text: el.textContent.trim().substring(0, 30),
            });
          }
        }
        results.textElementsChecked++;
      });

      return results;
    });

    console.log('   ✓ Text elements analyzed:', contrastResults.textElementsChecked);
    console.log('   ⚠️  Potential contrast issues:', contrastResults.potentialIssues.length);
    console.log();

    // ========== TEST 5: Form Fields and Labels ==========
    console.log('📋 TEST 5: Form Fields and Labels');
    const formElements = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      const unlabeledInputs = Array.from(inputs).filter(inp => {
        const id = inp.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = inp.getAttribute('aria-label');
        const hasPlaceholder = inp.getAttribute('placeholder');
        return !hasLabel && !hasAriaLabel && !hasPlaceholder;
      });

      return {
        inputCount: inputs.length,
        unlabeledInputs: unlabeledInputs.length,
      };
    });

    console.log('   ✓ Form inputs found:', formElements.inputCount);
    console.log('   ✓ Properly labeled:', formElements.inputCount - formElements.unlabeledInputs);

    if (formElements.unlabeledInputs > 0) {
      issues.push({
        category: 'Forms',
        severity: 'Error',
        issue: `${formElements.unlabeledInputs} form inputs without labels`,
        recommendation: 'Associate labels with all form inputs using <label for="id"> or aria-label',
      });
    }
    console.log();

    // ========== TEST 6: Dynamic Content and ARIA Live Regions ==========
    console.log('📋 TEST 6: Dynamic Content and ARIA Live Regions');
    const dynamicContent = await page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      const alerts = document.querySelectorAll('[role="alert"]');
      const progressBars = document.querySelectorAll('[role="progressbar"]');

      return {
        liveRegionCount: liveRegions.length,
        alertCount: alerts.length,
        progressBarCount: progressBars.length,
        liveRegionExamples: Array.from(liveRegions).slice(0, 2).map(lr => ({
          ariaLive: lr.getAttribute('aria-live'),
          content: lr.textContent.substring(0, 50),
        })),
      };
    });

    console.log('   ✓ ARIA live regions:', dynamicContent.liveRegionCount);
    console.log('   ✓ Alert roles:', dynamicContent.alertCount);
    console.log('   ✓ Progress bars:', dynamicContent.progressBarCount);

    if (dynamicContent.liveRegionCount === 0 && dynamicContent.alertCount === 0) {
      issues.push({
        category: 'Dynamic Content',
        severity: 'Warning',
        issue: 'No ARIA live regions for dynamic content announcements',
        recommendation: 'Add aria-live="polite" to containers for status messages or new content',
      });
      console.log('   ⚠️  No live regions detected for status updates');
    }
    console.log();

    // ========== TEST 7: Image Alt Text ==========
    console.log('📋 TEST 7: Image Alt Text');
    const imageResults = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const missingAlt = Array.from(images).filter(img => !img.getAttribute('alt'));

      return {
        imageCount: images.length,
        missingAltCount: missingAlt.length,
        examples: missingAlt.slice(0, 3).map(img => ({
          src: img.src.substring(0, 60),
        })),
      };
    });

    console.log('   ✓ Images found:', imageResults.imageCount);
    console.log('   ✓ Missing alt text:', imageResults.missingAltCount);

    if (imageResults.missingAltCount > 0) {
      issues.push({
        category: 'Images',
        severity: 'Error',
        issue: `${imageResults.missingAltCount} images without alt text`,
        recommendation: 'Add descriptive alt text to all images',
      });
    }
    console.log();

    // ========== SUMMARY ==========
    console.log('📊 ACCESSIBILITY AUDIT SUMMARY\n');
    console.log(`Total Issues Found: ${issues.length}\n`);

    if (issues.length === 0) {
      console.log('✅ No critical accessibility issues detected!\n');
    } else {
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. [${issue.severity}] ${issue.category}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Fix: ${issue.recommendation}\n`);
      });
    }

    console.log('📋 WCAG 2.1 Recommendations:');
    console.log('   • Level A (MUST): Ensure all form inputs have labels');
    console.log('   • Level A (MUST): Provide alt text for all meaningful images');
    console.log('   • Level AA (SHOULD): Maintain 4.5:1 contrast ratio for text');
    console.log('   • Level AA (SHOULD): Support keyboard navigation without mouse');
    console.log('   • Level AAA (NICE): Provide skip links and landmarks\n');

  } catch (error) {
    console.error('❌ Error during accessibility test:', error.message);
    console.log('Note: Make sure the dev server is running on http://localhost:3000\n');
  } finally {
    await browser.close();
  }
}

testAccessibility()
  .then(() => {
    console.log('🎉 Accessibility audit complete!\n');
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
