import { chromium } from 'playwright';

const BASE_URL = 'https://main.d1y1mst8p5nat3.amplifyapp.com';

async function runSmokeTest() {
  console.log(`Starting automated smoke test against: ${BASE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  const failedRequests = [];
  const cspViolations = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (text.includes('Content Security Policy') || text.includes('CSP')) {
        cspViolations.push(text);
      }
      errors.push(text);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`Page Error: ${err.message}`);
  });

  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText || 'Unknown failure'}`);
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push(`HTTP ${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  const routesToTest = [
    { path: '/', expectedTitle: 'MatchOp' },
    { path: '/auth/callback', checkSelector: '#root' },
    { path: '/student/profile', checkSelector: '#root' },
    { path: '/company/profile', checkSelector: '#root' },
    { path: '/admin/dashboard', checkSelector: '#root' },
  ];

  const results = [];

  for (const route of routesToTest) {
    console.log(`Testing route: ${route.path}...`);
    try {
      const response = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      const status = response.status();
      const title = await page.title();
      const rootElement = await page.$('#root');
      const rootContent = rootElement ? (await rootElement.innerHTML()).length : 0;

      results.push({
        path: route.path,
        status,
        title,
        hasRoot: !!rootElement,
        rootHtmlLength: rootContent,
        success: status === 200 && rootContent > 0,
      });
      console.log(`  -> Status: ${status}, Title: "${title}", Root DOM bytes: ${rootContent}`);
    } catch (err) {
      results.push({
        path: route.path,
        error: err.message,
        success: false,
      });
      console.error(`  -> Failed: ${err.message}`);
    }
  }

  await browser.close();

  console.log('\n=== SMOKE TEST SUMMARY ===');
  console.log('Routes tested:', JSON.stringify(results, null, 2));
  console.log('Console Errors:', errors.length ? errors : 'None');
  console.log('CSP Violations:', cspViolations.length ? cspViolations : 'None');
  console.log('Failed Requests:', failedRequests.length ? failedRequests : 'None');

  const allPassed = results.every((r) => r.success) && cspViolations.length === 0;
  console.log(`\nOVERALL TEST RESULT: ${allPassed ? 'ALL PASSED ✅' : 'SOME CHECKS FAILED ❌'}`);
  process.exit(allPassed ? 0 : 1);
}

runSmokeTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
