import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/rongyi/Desktop/dsh-team-kanban/node_modules/playwright-core/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(
  __dirname,
  '../node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell',
);

export async function openCdpPage({ width = 1920, height = 1080, scale = 2 } = {}) {
  const proc = spawn(
    BIN,
    [
      '--single-process',
      '--disable-gpu',
      `--force-device-scale-factor=${scale}`,
      `--window-size=${width},${height}`,
      '--remote-debugging-port=0',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP launch timeout')), 12000);
    proc.stderr.on('data', (chunk) => {
      const m = String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`chrome-headless-shell exited early: ${code}`));
    });
  });

  const browser = await chromium.connectOverCDP(wsUrl);
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] || (await ctx.newPage());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: scale,
    mobile: false,
  });

  const close = async () => {
    try {
      await browser.close();
    } catch {}
    try {
      proc.kill('SIGKILL');
    } catch {}
  };

  return { page, cdp, close };
}
