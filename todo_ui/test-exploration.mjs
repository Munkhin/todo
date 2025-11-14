import { chromium } from 'playwright';
import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const TEST_DIR = '/home/user/todo/todo_ui/test-results-20251114-004132';
const SCREENSHOTS_DIR = join(TEST_DIR, 'screenshots');

// Routes to test
const routes = [
  { path: '/', name: 'home' },
  { path: '/signin', name: 'signin' },
  { path: '/signup', name: 'signup' },
  { path: '/purchase', name: 'purchase' },
  { path: '/dashboard', name: 'dashboard', requiresAuth: true },
  { path: '/dashboard/schedule', name: 'schedule', requiresAuth: true },
  { path: '/dashboard/settings', name: 'settings', requiresAuth: true },
  { path: '/dashboard/feedback', name: 'feedback', requiresAuth: true },
  { path: '/dashboard/subscription', name: 'subscription', requiresAuth: true }
];

const breakpoints = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

let errorLog = [];
let consoleLog = [];
let networkLog = [];
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

function logConsole(type, message, location) {
  consoleLog.push({ type, message, location, timestamp: new Date().toISOString() });
}

function logNetwork(method, url, status, statusText) {
  networkLog.push({ method, url, status, statusText, timestamp: new Date().toISOString() });
}

async function testRoute(page, route, viewport = 'desktop') {
  const routeName = `${route.name}-${viewport}`;
  console.log(`\n=== Testing ${route.path} (${viewport}) ===`);

  try {
    const response = await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    // Check response status
    if (!response.ok()) {
      logError('HIGH', `Route returned ${response.status()}`, {
        location: route.path,
        expectedBehavior: 'Page should load with 200 status',
        actualBehavior: `Got ${response.status()} ${response.statusText()}`,
        reproSteps: [`Navigate to ${route.path}`]
      });
    }

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${routeName}-initial.png`),
      fullPage: true
    });
    console.log(`  ✓ Screenshot saved: ${routeName}-initial.png`);

    // Get page title
    const title = await page.title();
    console.log(`  Page title: ${title}`);

    // Check for specific error messages on page
    const errorElements = await page.locator('[role="alert"], .error, .error-message').count();
    if (errorElements > 0) {
      const errorTexts = await page.locator('[role="alert"], .error, .error-message').allTextContents();
      logError('MEDIUM', 'Error messages visible on page', {
        location: route.path,
        actualBehavior: `Found ${errorElements} error elements: ${errorTexts.join(', ')}`,
        screenshot: `${routeName}-initial.png`
      });
    }

    // Test interactive elements
    await testInteractiveElements(page, route, routeName);

    // Test forms if present
    await testForms(page, route, routeName);

    return true;
  } catch (error) {
    logError('CRITICAL', `Failed to load route ${route.path}`, {
      location: route.path,
      actualBehavior: error.message,
      reproSteps: [`Navigate to ${route.path}`],
      consoleOutput: error.stack
    });

    // Try to take screenshot anyway
    try {
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${routeName}-error.png`),
        fullPage: true
      });
    } catch (e) {
      console.log(`  ✗ Could not take error screenshot: ${e.message}`);
    }

    return false;
  }
}

async function testInteractiveElements(page, route, routeName) {
  console.log('  Testing interactive elements...');

  try {
    // Test buttons
    const buttons = await page.locator('button:visible').count();
    console.log(`  Found ${buttons} visible buttons`);

    // Get all button texts for documentation
    const buttonTexts = await page.locator('button:visible').allTextContents();
    console.log(`  Buttons: ${buttonTexts.slice(0, 10).join(', ')}${buttonTexts.length > 10 ? '...' : ''}`);

    // Test links
    const links = await page.locator('a:visible').count();
    console.log(`  Found ${links} visible links`);

    // Test inputs
    const inputs = await page.locator('input:visible').count();
    console.log(`  Found ${inputs} visible inputs`);

    // Test for modals/dialogs
    const dialogs = await page.locator('[role="dialog"]').count();
    if (dialogs > 0) {
      console.log(`  Found ${dialogs} dialogs on page`);
    }

    // Check for dropdown menus
    const dropdowns = await page.locator('select:visible, [role="combobox"]').count();
    if (dropdowns > 0) {
      console.log(`  Found ${dropdowns} dropdown elements`);
    }

  } catch (error) {
    logError('MEDIUM', 'Error testing interactive elements', {
      location: route.path,
      actualBehavior: error.message,
      consoleOutput: error.stack
    });
  }
}

async function testForms(page, route, routeName) {
  try {
    const forms = await page.locator('form').count();
    if (forms === 0) {
      return;
    }

    console.log(`  Testing ${forms} form(s)...`);

    for (let i = 0; i < forms; i++) {
      const form = page.locator('form').nth(i);

      // Test empty form submission
      const submitButton = form.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        console.log(`  Testing form ${i + 1} validation...`);

        // Take screenshot before submission
        await page.screenshot({
          path: join(SCREENSHOTS_DIR, `${routeName}-form${i}-before.png`),
          fullPage: true
        });

        // Try to submit empty form
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Take screenshot after submission
        await page.screenshot({
          path: join(SCREENSHOTS_DIR, `${routeName}-form${i}-after.png`),
          fullPage: true
        });

        // Check for validation messages
        const validationErrors = await page.locator('[role="alert"], .error, input:invalid').count();
        if (validationErrors > 0) {
          console.log(`  ✓ Form validation working (${validationErrors} validation messages)`);
        } else {
          console.log(`  ⚠ No validation messages found for empty form submission`);
        }
      }
    }
  } catch (error) {
    console.log(`  ⚠ Error testing forms: ${error.message}`);
  }
}

async function testAuthentication(page) {
  console.log('\n=== Testing Authentication ===');

  // Test signin page
  try {
    await page.goto(`${BASE_URL}/signin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'auth-signin-page.png'),
      fullPage: true
    });

    // Try invalid login
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await emailInput.count() > 0) {
      console.log('  Testing invalid credentials...');
      await emailInput.fill('test@example.com');
      await passwordInput.fill('wrongpassword');
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, 'auth-signin-filled.png'),
        fullPage: true
      });

      await submitButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: join(SCREENSHOTS_DIR, 'auth-signin-error.png'),
        fullPage: true
      });

      const errorMessages = await page.locator('[role="alert"], .error').allTextContents();
      if (errorMessages.length > 0) {
        console.log(`  ✓ Error message shown: ${errorMessages.join(', ')}`);
      } else {
        console.log('  ⚠ No error message shown for invalid credentials');
      }
    }
  } catch (error) {
    console.log(`  ✗ Error testing signin: ${error.message}`);
  }

  // Test signup page
  try {
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'auth-signup-page.png'),
      fullPage: true
    });

    // Test empty form validation
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      console.log('  Testing signup form validation...');
      await submitButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: join(SCREENSHOTS_DIR, 'auth-signup-validation.png'),
        fullPage: true
      });
    }
  } catch (error) {
    console.log(`  ✗ Error testing signup: ${error.message}`);
  }
}

async function testResponsiveness(page, route) {
  console.log(`\n=== Testing Responsiveness for ${route.path} ===`);

  for (const bp of breakpoints) {
    console.log(`  Testing ${bp.name} (${bp.width}x${bp.height})...`);
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${route.name}-${bp.name}.png`),
      fullPage: true
    });

    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });

    if (hasOverflow) {
      logError('MEDIUM', `Horizontal overflow detected on ${route.path}`, {
        location: `${route.path} at ${bp.name}`,
        actualBehavior: 'Page has horizontal scrollbar',
        expectedBehavior: 'Page should fit within viewport',
        screenshot: `${route.name}-${bp.name}.png`
      });
    }
  }

  // Reset to desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
}

async function generateReport() {
  console.log('\n=== Generating Error Report ===');

  let report = `# Frontend Testing Report - Todo App
**Date**: ${new Date().toISOString()}
**Base URL**: ${BASE_URL}
**Total Routes Tested**: ${routes.length}
**Total Errors Found**: ${errorLog.length}

## Executive Summary
- Critical issues: ${errorLog.filter(e => e.severity === 'CRITICAL').length}
- High priority: ${errorLog.filter(e => e.severity === 'HIGH').length}
- Medium priority: ${errorLog.filter(e => e.severity === 'MEDIUM').length}
- Low priority: ${errorLog.filter(e => e.severity === 'LOW').length}

## Console Errors Summary
- Total console messages: ${consoleLog.length}
- Errors: ${consoleLog.filter(l => l.type === 'error').length}
- Warnings: ${consoleLog.filter(l => l.type === 'warning').length}

## Network Errors Summary
- Total requests: ${networkLog.length}
- Failed requests (4xx): ${networkLog.filter(n => n.status >= 400 && n.status < 500).length}
- Server errors (5xx): ${networkLog.filter(n => n.status >= 500).length}

---

`;

  // Group errors by severity
  for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
    const errors = errorLog.filter(e => e.severity === severity);
    if (errors.length > 0) {
      report += `## ${severity} Priority Issues (${errors.length})\n\n`;

      for (const error of errors) {
        report += `### Error #${error.id}: ${error.title}\n`;
        report += `- **Severity**: ${error.severity}\n`;
        report += `- **Location**: ${error.location || 'N/A'}\n`;
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
        if (error.consoleOutput) {
          report += `- **Console Output**:\n\`\`\`\n${error.consoleOutput}\n\`\`\`\n`;
        }
        if (error.screenshot) {
          report += `- **Screenshot**: \`screenshots/${error.screenshot}\`\n`;
        }
        report += `- **Timestamp**: ${error.timestamp}\n\n`;
      }
    }
  }

  // Console Logs
  if (consoleLog.length > 0) {
    report += `## Console Logs\n\n`;
    const errorLogs = consoleLog.filter(l => l.type === 'error');
    if (errorLogs.length > 0) {
      report += `### Errors (${errorLogs.length})\n\n`;
      errorLogs.forEach((log, i) => {
        report += `${i + 1}. **${log.location}**: ${log.message}\n`;
      });
      report += '\n';
    }

    const warnLogs = consoleLog.filter(l => l.type === 'warning');
    if (warnLogs.length > 0) {
      report += `### Warnings (${warnLogs.length})\n\n`;
      warnLogs.slice(0, 20).forEach((log, i) => {
        report += `${i + 1}. **${log.location}**: ${log.message}\n`;
      });
      if (warnLogs.length > 20) {
        report += `\n... and ${warnLogs.length - 20} more warnings\n`;
      }
      report += '\n';
    }
  }

  // Network Logs
  if (networkLog.length > 0) {
    report += `## Network Activity\n\n`;
    const failedRequests = networkLog.filter(n => n.status >= 400);
    if (failedRequests.length > 0) {
      report += `### Failed Requests (${failedRequests.length})\n\n`;
      failedRequests.forEach((log, i) => {
        report += `${i + 1}. **${log.method} ${log.url}**: ${log.status} ${log.statusText}\n`;
      });
      report += '\n';
    }
  }

  // Tested Routes Summary
  report += `## Tested Routes\n\n`;
  routes.forEach(route => {
    report += `- ${route.path} (${route.name})${route.requiresAuth ? ' [Requires Auth]' : ''}\n`;
  });
  report += '\n';

  // Recommendations
  report += `## Recommendations\n\n`;
  const criticalCount = errorLog.filter(e => e.severity === 'CRITICAL').length;
  const highCount = errorLog.filter(e => e.severity === 'HIGH').length;

  if (criticalCount > 0) {
    report += `1. **URGENT**: Address ${criticalCount} critical issue(s) that prevent core functionality\n`;
  }
  if (highCount > 0) {
    report += `2. Fix ${highCount} high-priority issue(s) affecting user experience\n`;
  }
  report += `3. Review console errors and warnings for potential issues\n`;
  report += `4. Test API integration with proper Supabase credentials\n`;
  report += `5. Verify all forms have proper validation and error handling\n`;

  report += `\n## Appendix\n\n`;
  report += `- Screenshot directory: \`test-results-20251114-004132/screenshots/\`\n`;
  report += `- Full console logs: \`test-results-20251114-004132/console-logs.json\`\n`;
  report += `- Network activity: \`test-results-20251114-004132/network-log.json\`\n`;

  writeFileSync(join(TEST_DIR, 'error-report.md'), report);
  console.log(`\n✓ Report saved to: ${TEST_DIR}/error-report.md`);
}

async function run() {
  console.log('Starting comprehensive frontend testing...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Results Directory: ${TEST_DIR}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Set up console listener
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location().url || 'unknown';

    if (type === 'error' || type === 'warning') {
      logConsole(type, text, location);
      console.log(`  [Console ${type}] ${text}`);
    }
  });

  // Set up network listener
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();

    logNetwork(method, url, status, response.statusText());

    if (status >= 400) {
      console.log(`  [Network Error] ${method} ${url} - ${status}`);
    }
  });

  // Set up page error listener
  page.on('pageerror', error => {
    logError('HIGH', 'JavaScript error on page', {
      actualBehavior: error.message,
      consoleOutput: error.stack
    });
    console.log(`  [Page Error] ${error.message}`);
  });

  try {
    // Phase 1: Test authentication flows
    await testAuthentication(page);

    // Phase 2: Test all routes at desktop viewport
    for (const route of routes) {
      await testRoute(page, route, 'desktop');
    }

    // Phase 3: Test responsiveness on key routes
    const keyRoutes = routes.filter(r => ['home', 'signin', 'dashboard'].includes(r.name));
    for (const route of keyRoutes) {
      await testResponsiveness(page, route);
    }

    // Save logs
    writeFileSync(
      join(TEST_DIR, 'console-logs.json'),
      JSON.stringify(consoleLog, null, 2)
    );

    writeFileSync(
      join(TEST_DIR, 'network-log.json'),
      JSON.stringify(networkLog, null, 2)
    );

    // Generate final report
    await generateReport();

  } catch (error) {
    console.error('Fatal error during testing:', error);
    logError('CRITICAL', 'Testing script failed', {
      actualBehavior: error.message,
      consoleOutput: error.stack
    });
    await generateReport();
  } finally {
    await browser.close();
    console.log('\n✓ Testing complete!');
    console.log(`Total errors found: ${errorLog.length}`);
    console.log(`Screenshots saved: ${SCREENSHOTS_DIR}`);
  }
}

run().catch(console.error);
