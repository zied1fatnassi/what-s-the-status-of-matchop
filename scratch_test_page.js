import { chromium } from '@playwright/test';

async function testScenarios() {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const routes = [
    '/',
    '/login',
    '/signup',
    '/student/login',
    '/student/signup',
    '/student/swipe',
    '/student/profile',
    '/student/matches',
    '/company/login',
    '/company/signup',
    '/company/intros',
    '/company/offers',
    '/company/profile',
    '/admin',
    '/discovery',
    '/dashboard',
    '/about',
    '/contact',
    '/legal/terms',
    '/premium'
  ];

  console.log('Testing routes with guest context...');
  for (const route of routes) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    try {
      await page.goto(`http://localhost:5173${route}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(1000);
      const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
      const isBlank = rootHtml.trim().length === 0;
      console.log(`Route: ${route.padEnd(25)} | HTML length: ${String(rootHtml.length).padEnd(6)} | isBlank: ${isBlank} | Errors: ${errors.length}`);
      if (errors.length > 0) {
        console.log('  Errors:', errors);
      }
    } catch (e) {
      console.error(`Route ${route} failed:`, e.message);
    }
    await page.close();
  }

  // Now test with corrupted cookie / localStorage
  console.log('\nTesting with corrupted / stale auth token in cookie & localStorage...');
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.cookie = 'matchop-auth-token=invalid-corrupted-json; path=/;';
    localStorage.setItem('matchop-auth-token', 'invalid-corrupted-json');
    localStorage.setItem('sb-kedqldpdvycbnznejbbl-auth-token', 'invalid-corrupted-json');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log(`Corrupted token test | HTML length: ${rootHtml.length} | isBlank: ${rootHtml.trim().length === 0} | Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('  Errors:', errors);
  }
  await page.close();

  await browser.close();
}

testScenarios();
