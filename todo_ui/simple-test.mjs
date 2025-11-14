import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log('Launching browser...');
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
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => console.log(`[Console ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.log('[Page Error]', err.message));

  try {
    console.log(`Navigating to ${BASE_URL}...`);
    const response = await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log(`Status: ${response.status()}`);
    console.log(`URL: ${page.url()}`);

    // Wait for any React to load
    await page.waitForTimeout(3000);

    console.log('Taking screenshot...');
    await page.screenshot({
      path: '/home/user/todo/todo_ui/test-results-20251114-004132/screenshots/test-home.png',
      fullPage: true
    });

    console.log('Success!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
