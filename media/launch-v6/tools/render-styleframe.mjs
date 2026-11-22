import { chromium } from '/Users/rongyi/Desktop/dsh-team-kanban/node_modules/playwright-core/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(dir, '../styleframe/styleframe.html');
const outPath = path.resolve(dir, '../styleframe/styleframe.png');

const browser = await chromium.launch({
  executablePath: path.resolve(dir, '../node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
  args: ['--single-process', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
await page.screenshot({ path: outPath });
await browser.close();
console.log('Saved v6 styleframe ->', outPath);
process.exit(0);
