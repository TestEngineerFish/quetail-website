// 生成分享卡片 public/og.jpg（1200×630）：首页首屏那一帧。改了首屏后重跑：npm run build && node scripts/og.mjs
// 用 JPEG：星空和银河是连续色调，存 PNG 有 300 KB，JPEG q82 不到 200 KB、看不出差别。
import { chromium } from 'playwright-core';
import { chromePath, startPreview, stopPreview } from './preview-server.mjs';

const CHROME = chromePath();
const server = await startPreview(4330);
let browser;
try {
  browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('http://localhost:4330/', { waitUntil: 'networkidle' });
  // 分享图里不要顶栏、刻度尺、按钮
  await page.addStyleTag({ content: '.hd,.gauge,.cta,.hero .eyebrow{display:none!important}.hero{padding-top:140px!important;padding-left:72px!important}.hero-lead{max-width:30rem!important}' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: new URL('../public/og.jpg', import.meta.url).pathname, type: 'jpeg', quality: 82 });
} finally {
  await browser?.close().catch(() => {});
  await stopPreview(server);
}
console.log('public/og.jpg');
process.exit(0);
