import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'matchop-job-offer-swipe-concept.html');
const outputPath = path.join(__dirname, 'matchop-job-offer-swipe-concept.png');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});

await page.goto(`file://${htmlPath.replaceAll(path.sep, '/')}`);
await page.screenshot({ path: outputPath, fullPage: false });
await browser.close();

console.log(outputPath);
