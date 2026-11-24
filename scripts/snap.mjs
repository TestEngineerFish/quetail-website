// 视觉自检：起 astro preview，用系统 Chrome 截图（桌面 1440×900 + 手机 390×844），并收集控制台错误。
// 首页按天空的每一层各截一张（最后一层要底边对齐视口底边，相机才落到枝头）。输出到 .shots-tmp/snap/（不进仓）。
// 用法：npm run build && npm run snap   （CHROME=/path/to/chrome 可改浏览器路径）
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { chromePath, startPreview, stopPreview } from './preview-server.mjs';

const CHROME = chromePath();
const PORT = 4329;
const OUT = new URL('../.shots-tmp/snap/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const server = await startPreview(PORT);
const errors = [];
let browser;
try {
  browser = await chromium.launch({ executablePath: CHROME });
  const pages = ['/', '/features/', '/features/vault/', '/features/ledger/', '/download/', '/pricing/', '/studio/', '/plugins/', '/changelog/', '/help/', '/privacy/', '/about/', '/nope/'];

  for (const [tag, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, colorScheme: scheme, isMobile: tag === 'phone', hasTouch: tag === 'phone' });
      const page = await ctx.newPage();
      // /nope/ 截的就是 404 页，它自己的资源 404 不算错误
      page.on('console', (m) => m.type() === 'error' && !(page.url().includes('/nope/') && m.text().includes('status of 404')) && errors.push(`${tag}/${scheme} ${page.url()}: ${m.text()}`));
      page.on('pageerror', (e) => errors.push(`${tag}/${scheme} ${page.url()}: ${e.message}`));
      for (const p of pages) {
        if (p === '/' && scheme === 'dark') continue; // 首页不跟主题
        await page.goto(`http://localhost:${PORT}${p}`, { waitUntil: 'networkidle' });
        const name = (p.replace(/\//g, '_') || '_').replace(/^_|_$/g, '') || 'home';
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow > 0) errors.push(`${tag} ${p}: 横向溢出 ${overflow}px`);
        if (p === '/') {
          const ids = await page.$$eval('.dive .sec', (els) => els.map((e) => e.id));
          for (const id of ids) {
            await page.evaluate(([i, end]) => {
              const el = document.getElementById(i);
              scrollTo({ top: end ? el.offsetTop + el.offsetHeight - innerHeight : el.offsetTop + el.offsetHeight / 2 - innerHeight / 2, behavior: 'instant' });
            }, [id, id === ids[ids.length - 1]]);
            await page.waitForTimeout(1200);
            await page.screenshot({ path: `${OUT}${tag}-home-${id}.png` });
          }
          // 两段之间（星空往云海落的那一帧）
          await page.evaluate(() => scrollTo({ top: innerHeight * 0.55, behavior: 'instant' }));
          await page.waitForTimeout(1200);
          await page.screenshot({ path: `${OUT}${tag}-home-between.png` });
        } else {
          await page.screenshot({ path: `${OUT}${tag}-${scheme}-${name}.png`, fullPage: true });
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser?.close().catch(() => {});
  await stopPreview(server);
}
console.log(errors.length ? errors.join('\n') : '无控制台错误、无横向溢出');
console.log('截图在', OUT);
process.exit(errors.length ? 1 : 0);
