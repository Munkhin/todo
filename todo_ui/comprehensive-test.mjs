import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const TEST_DIR = '/home/user/todo/todo_ui/test-results-20251114-004132';
const SCREENSHOTS_DIR = join(TEST_DIR, 'screenshots');

const routes = [
  { path: '/', name: 'home' },
  { path: '/signin', name: 'signin' },
  { path: '/signup', name: 'signup' },
  { path: '/purchase', name: 'purchase' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/dashboard/schedule', name: 'schedule' },
  { path: '/dashboard/settings', name: 'settings' },
  { path: '/dashboard/feedback', name: 'feedback' },
  { path: '/dashboard/subscription', name: 'subscription' }
];

const breakpoints = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

let errorLog = [];
let consoleLog = [];
let networkLog = [];
let testResults = [];
let errorCount = 0;

function logError(severity, title, details) {
  errorCount++;
  errorLog.push({
    id: errorCount,
    severity,
    title,
    ...details,
    timestamp: new Date().toISOString()
  });
  console.log(`[${severity}] Error #${errorCount}: ${title}`);
}

async function testRoute(page, route) {
  const routeName = route.name;
  console.log(`\n=== Testing ${route.path} ===`);

  const result = {
    route: route.path,
    name: route.name,
    success: false,
    errors: [],
    warnings: [],
    elements: {}
  };

  try {
    const response = await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    if (!response.ok()) {
      logError('HIGH', `Route returned ${response.status()}`, {
        location: route.path,
        expectedBehavior: 'Page should load with 200 status',
        actualBehavior: `Got ${response.status()} ${response.statusText()}`
      });
      result.errors.push(`HTTP ${response.status()}`);
    }

    console.log(`  Status: ${response.status()}`);
    console.log(`  Final URL: ${page.url()}`);

    // Wait for React/Next.js to hydrate
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${routeName}-desktop.png`),
      fullPage: true
    });
    console.log(`  ✓ Screenshot saved`);

    // Get page title
    const title = await page.title();
    console.log(`  Title: "${title}"`);
    result.title = title;

    // Count interactive elements
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const inputs = await page.locator('input').count();
    const forms = await page.locator('form').count();

    result.elements = { buttons, links, inputs, forms };
    console.log(`  Interactive elements: ${buttons} buttons, ${links} links, ${inputs} inputs, ${forms} forms`);

    // Get all visible button texts
    const buttonTexts = await page.locator('button:visible').allTextContents();
    console.log(`  Visible buttons: ${buttonTexts.filter(t => t.trim()).join(', ')}`);

    // Check for error messages on page
    const errorAlerts = await page.locator('[role="alert"]').count();
    if (errorAlerts > 0) {
      const alertTexts = await page.locator('[role="alert"]').allTextContents();
      console.log(`  ⚠ Found ${errorAlerts} alert(s): ${alertTexts.join(', ')}`);
      result.warnings.push(`${errorAlerts} alert messages visible`);
    }

    // Test clicking first few visible buttons (non-submit)
    const clickableButtons = await page.locator('button:visible:not([type="submit"])').all();
    for (let i = 0; i < Math.min(3, clickableButtons.length); i++) {
      try {
        const btnText = await clickableButtons[i].textContent();
        console.log(`  Testing button: "${btnText?.trim()}"`);

        await clickableButtons[i].click({ timeout: 2000 });
        await page.waitForTimeout(1000);

        // Take screenshot after click
        await page.screenshot({
          path: join(SCREENSHOTS_DIR, `${routeName}-btn${i}-clicked.png`),
          fullPage: true
        });
      } catch (err) {
        console.log(`  ⚠ Could not click button ${i}: ${err.message}`);
      }
    }

    // Test forms if present
    if (forms > 0) {
      await testForms(page, route, routeName);
    }

    result.success = true;
  } catch (error) {
    logError('CRITICAL', `Failed to test route ${route.path}`, {
      location: route.path,
      actualBehavior: error.message,
      consoleOutput: error.stack
    });
    result.errors.push(error.message);

    try {
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${routeName}-error.png`),
        fullPage: true
      });
    } catch (e) {
      console.log(`  ✗ Could not take error screenshot`);
    }
  }

  testResults.push(result);
  return result.success;
}

async function testForms(page, route, routeName) {
  console.log(`  Testing forms...`);

  try {
    const forms = await page.locator('form').all();

    for (let i = 0; i < forms.length; i++) {
      console.log(`    Form ${i + 1}:`);

      // Get form inputs
      const formInputs = await forms[i].locator('input:visible').all();
      console.log(`      Inputs: ${formInputs.length}`);

      // Try empty submission
      const submitBtn = forms[i].locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await page.screenshot({
          path: join(SCREENSHOTS_DIR, `${routeName}-form${i}-empty.png`),
          fullPage: true
        });

        await submitBtn.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, `${routeName}-form${i}-submitted.png`),
          fullPage: true
        });

        // Check for validation
        const validationErrors = await page.locator('[role="alert"], .error, input:invalid').count();
        if (validationErrors > 0) {
          console.log(`      ✓ Validation working (${validationErrors} messages)`);
        } else {
          console.log(`      ⚠ No validation messages shown`);
        }
      }

      // Try filling with test data
      if (formInputs.length > 0) {
        console.log(`      Testing with sample data...`);

        for (const input of formInputs) {
          const type = await input.getAttribute('type');
          const name = await input.getAttribute('name');

          try {
            if (type === 'email') {
              await input.fill('test@example.com');
            } else if (type === 'password') {
              await input.fill('testpass123');
            } else if (type === 'text' || type === 'tel') {
              await input.fill('Test User');
            } else if (type === 'checkbox') {
              await input.check();
            }
          } catch (err) {
            console.log(`      ⚠ Could not fill input ${name}: ${err.message}`);
          }
        }

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, `${routeName}-form${i}-filled.png`),
          fullPage: true
        });

        // Submit filled form
        if (await submitBtn.count() > 0) {
          await submitBtn.click();
          await page.waitForTimeout(3000);

          await page.screenshot({
            path: join(SCREENSHOTS_DIR, `${routeName}-form${i}-result.png`),
            fullPage: true
          });

          console.log(`      ✓ Form submitted with test data`);
        }
      }
    }
  } catch (error) {
    console.log(`  ⚠ Error testing forms: ${error.message}`);
  }
}

async function testResponsiveness(page, route) {
  console.log(`\n=== Testing Responsiveness: ${route.path} ===`);

  for (const bp of breakpoints) {
    try {
      console.log(`  ${bp.name} (${bp.width}x${bp.height})`);
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${route.name}-${bp.name}.png`),
        fullPage: true
      });

      // Check overflow
      const overflow = await page.evaluate(() => {
        return {
          hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
          bodyWidth: document.body.scrollWidth,
          windowWidth: window.innerWidth
        };
      });

      if (overflow.hasHorizontalScroll) {
        logError('MEDIUM', `Horizontal overflow on ${route.path}`, {
          location: `${route.path} at ${bp.name} (${bp.width}px)`,
          actualBehavior: `Body width ${overflow.bodyWidth}px exceeds viewport ${overflow.windowWidth}px`,
          screenshot: `${route.name}-${bp.name}.png`
        });
        console.log(`  ⚠ Horizontal overflow detected`);
      } else {
        console.log(`  ✓ No overflow`);
      }
    } catch (error) {
      console.log(`  ✗ Error testing ${bp.name}: ${error.message}`);
    }
  }

  // Reset viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
}

function generateReport() {
  console.log('\n=== Generating Report ===');

  const criticalCount = errorLog.filter(e => e.severity === 'CRITICAL').length;
  const highCount = errorLog.filter(e => e.severity === 'HIGH').length;
  const mediumCount = errorLog.filter(e => e.severity === 'MEDIUM').length;
  const lowCount = errorLog.filter(e => e.severity === 'LOW').length;

  let report = `# Frontend Testing Report - Todo App
**Date**: ${new Date().toISOString()}
**Base URL**: ${BASE_URL}
**Total Routes Tested**: ${routes.length}
**Successful Tests**: ${testResults.filter(r => r.success).length}
**Failed Tests**: ${testResults.filter(r => !r.success).length}
**Total Errors Found**: ${errorLog.length}

## Executive Summary
- **Critical issues**: ${criticalCount}
- **High priority**: ${highCount}
- **Medium priority**: ${mediumCount}
- **Low priority**: ${lowCount}

## Console Activity
- Total console messages: ${consoleLog.length}
- Errors: ${consoleLog.filter(l => l.type === 'error').length}
- Warnings: ${consoleLog.filter(l => l.type === 'warning').length}

## Network Activity
- Total requests logged: ${networkLog.length}
- Failed requests (4xx): ${networkLog.filter(n => n.status >= 400 && n.status < 500).length}
- Server errors (5xx): ${networkLog.filter(n => n.status >= 500).length}

---

`;

  // Detailed Errors by Severity
  for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
    const errors = errorLog.filter(e => e.severity === severity);
    if (errors.length > 0) {
      report += `## ${severity} Priority Issues (${errors.length})\n\n`;

      for (const error of errors) {
        report += `### Error #${error.id}: ${error.title}\n`;
        report += `- **Severity**: ${error.severity}\n`;
        if (error.location) report += `- **Location**: ${error.location}\n`;
        if (error.reproSteps) {
          report += `- **Steps to Reproduce**:\n`;
          error.reproSteps.forEach((step, i) => {
            report += `  ${i + 1}. ${step}\n`;
          });
        }
        if (error.expectedBehavior) {
          report += `- **Expected Behavior**: ${error.expectedBehavior}\n`;
        }
        if (error.actualBehavior) {
          report += `- **Actual Behavior**: ${error.actualBehavior}\n`;
        }
        if (error.screenshot) {
          report += `- **Screenshot**: \`screenshots/${error.screenshot}\`\n`;
        }
        if (error.consoleOutput) {
          report += `- **Console Output**:\n\`\`\`\n${error.consoleOutput.substring(0, 500)}${error.consoleOutput.length > 500 ? '...' : ''}\n\`\`\`\n`;
        }
        report += `- **Timestamp**: ${error.timestamp}\n\n`;
      }
    }
  }

  // Test Results Summary
  report += `## Route Test Results\n\n`;
  report += `| Route | Status | Title | Buttons | Forms | Issues |\n`;
  report += `|-------|--------|-------|---------|-------|--------|\n`;

  for (const result of testResults) {
    const status = result.success ? '✅' : '❌';
    const title = result.title || 'N/A';
    const buttons = result.elements?.buttons || 0;
    const forms = result.elements?.forms || 0;
    const issues = result.errors.length + result.warnings.length;
    report += `| ${result.route} | ${status} | ${title} | ${buttons} | ${forms} | ${issues} |\n`;
  }
  report += '\n';

  // Console Errors
  const consoleErrors = consoleLog.filter(l => l.type === 'error');
  if (consoleErrors.length > 0) {
    report += `## Console Errors (${consoleErrors.length})\n\n`;
    consoleErrors.slice(0, 20).forEach((log, i) => {
      report += `${i + 1}. **${log.location}**: ${log.message}\n`;
    });
    if (consoleErrors.length > 20) {
      report += `\n... and ${consoleErrors.length - 20} more errors\n`;
    }
    report += '\n';
  }

  // Console Warnings
  const consoleWarnings = consoleLog.filter(l => l.type === 'warning');
  if (consoleWarnings.length > 0) {
    report += `## Console Warnings (${consoleWarnings.length})\n\n`;
    consoleWarnings.slice(0, 10).forEach((log, i) => {
      report += `${i + 1}. **${log.location}**: ${log.message}\n`;
    });
    if (consoleWarnings.length > 10) {
      report += `\n... and ${consoleWarnings.length - 10} more warnings\n`;
    }
    report += '\n';
  }

  // Network Failures
  const failedRequests = networkLog.filter(n => n.status >= 400);
  if (failedRequests.length > 0) {
    report += `## Failed Network Requests (${failedRequests.length})\n\n`;

    // Group by status code
    const by4xx = failedRequests.filter(n => n.status >= 400 && n.status < 500);
    const by5xx = failedRequests.filter(n => n.status >= 500);

    if (by4xx.length > 0) {
      report += `### Client Errors (4xx) - ${by4xx.length}\n\n`;
      const grouped = {};
      by4xx.forEach(req => {
        const key = `${req.status} ${req.statusText}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(req.url);
      });

      Object.entries(grouped).forEach(([status, urls]) => {
        report += `**${status}** (${urls.length} requests):\n`;
        urls.slice(0, 5).forEach(url => {
          report += `- ${url}\n`;
        });
        if (urls.length > 5) {
          report += `- ... and ${urls.length - 5} more\n`;
        }
        report += '\n';
      });
    }

    if (by5xx.length > 0) {
      report += `### Server Errors (5xx) - ${by5xx.length}\n\n`;
      by5xx.forEach((req, i) => {
        report += `${i + 1}. **${req.method} ${req.url}**: ${req.status} ${req.statusText}\n`;
      });
      report += '\n';
    }
  }

  // Recommendations
  report += `## Recommendations\n\n`;

  if (criticalCount > 0) {
    report += `1. **URGENT**: Fix ${criticalCount} critical issue(s) preventing core functionality\n`;
  }
  if (highCount > 0) {
    report += `${criticalCount > 0 ? '2' : '1'}. Address ${highCount} high-priority issue(s) affecting user experience\n`;
  }
  if (mediumCount > 0) {
    report += `${criticalCount + highCount > 0 ? (criticalCount > 0 && highCount > 0 ? '3' : '2') : '1'}. Review ${mediumCount} medium-priority issue(s)\n`;
  }

  const nextNum = [criticalCount, highCount, mediumCount].filter(c => c > 0).length + 1;

  if (consoleErrors.length > 0) {
    report += `${nextNum}. Investigate and fix ${consoleErrors.length} console error(s)\n`;
  }

  if (failedRequests.length > 0) {
    report += `${nextNum + (consoleErrors.length > 0 ? 1 : 0)}. Review ${failedRequests.length} failed network request(s) (may be due to missing Supabase credentials)\n`;
  }

  report += `${nextNum + 2}. Ensure all forms have proper validation and error handling\n`;
  report += `${nextNum + 3}. Test with proper backend API credentials\n`;
  report += `${nextNum + 4}. Verify responsive design works correctly across all breakpoints\n`;

  report += `\n## Test Coverage\n\n`;
  report += `### Routes Tested\n`;
  routes.forEach(route => {
    const result = testResults.find(r => r.route === route.path);
    const status = result?.success ? '✅' : '❌';
    report += `- ${status} ${route.path}\n`;
  });

  report += `\n### Breakpoints Tested\n`;
  breakpoints.forEach(bp => {
    report += `- ${bp.name} (${bp.width}x${bp.height})\n`;
  });

  report += `\n## Appendix\n\n`;
  report += `- **Test Directory**: \`test-results-20251114-004132/\`\n`;
  report += `- **Screenshots**: \`test-results-20251114-004132/screenshots/\`\n`;
  report += `- **Console Logs**: \`test-results-20251114-004132/console-logs.json\`\n`;
  report += `- **Network Logs**: \`test-results-20251114-004132/network-log.json\`\n`;
  report += `- **Test Results**: \`test-results-20251114-004132/test-results.json\`\n`;

  writeFileSync(join(TEST_DIR, 'error-report.md'), report);
  console.log(`✓ Report saved: ${TEST_DIR}/error-report.md`);
}

async function run() {
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE FRONTEND TESTING');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Directory: ${TEST_DIR}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Console listener
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location().url || page.url();

    consoleLog.push({ type, message: text, location, timestamp: new Date().toISOString() });

    if (type === 'error') {
      console.log(`  [Console Error] ${text}`);
    }
  });

  // Network listener
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();
    const statusText = response.statusText();

    networkLog.push({ method, url, status, statusText, timestamp: new Date().toISOString() });

    if (status >= 400 && !url.includes('_next/static')) {
      console.log(`  [Network ${status}] ${method} ${url}`);
    }
  });

  // Page error listener
  page.on('pageerror', error => {
    logError('HIGH', 'JavaScript runtime error', {
      location: page.url(),
      actualBehavior: error.message,
      consoleOutput: error.stack
    });
    console.log(`  [Page Error] ${error.message}`);
  });

  try {
    // Test all routes
    console.log('PHASE 1: Testing All Routes\n');
    for (const route of routes) {
      await testRoute(page, route);
    }

    // Test responsiveness on key pages
    console.log('\nPHASE 2: Testing Responsiveness\n');
    const keyRoutes = [
      routes.find(r => r.name === 'home'),
      routes.find(r => r.name === 'signin'),
      routes.find(r => r.name === 'dashboard')
    ].filter(Boolean);

    for (const route of keyRoutes) {
      await testResponsiveness(page, route);
    }

    // Save all logs
    writeFileSync(
      join(TEST_DIR, 'console-logs.json'),
      JSON.stringify(consoleLog, null, 2)
    );

    writeFileSync(
      join(TEST_DIR, 'network-log.json'),
      JSON.stringify(networkLog, null, 2)
    );

    writeFileSync(
      join(TEST_DIR, 'test-results.json'),
      JSON.stringify(testResults, null, 2)
    );

    // Generate report
    generateReport();

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    logError('CRITICAL', 'Testing script crashed', {
      actualBehavior: error.message,
      consoleOutput: error.stack
    });
    generateReport();
  } finally {
    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log('TESTING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total Routes Tested: ${testResults.length}`);
    console.log(`Successful: ${testResults.filter(r => r.success).length}`);
    console.log(`Failed: ${testResults.filter(r => !r.success).length}`);
    console.log(`Total Errors: ${errorLog.length}`);
    console.log(`Console Messages: ${consoleLog.length}`);
    console.log(`Network Requests: ${networkLog.length}`);
    console.log(`\nReport: ${TEST_DIR}/error-report.md`);
    console.log('='.repeat(60));
  }
}

run().catch(console.error);
