// #6 / #7 / #8 / #12：文案从字典出来，显隐和顶栏定位按约定写在样式里；插件页两侧取数一起判定线上。
// 容器渲染整页需要 Astro.site，当前 container 不会带上站点地址，所以 404 / 首页核对模板与样式原文；顶栏组件本身可以渲染。
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Header from '../src/components/Header.astro';
import { zh } from '../src/i18n/zh';

const NOTE = '你的系统设置了「减少动态效果」，这一页不播动画。';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function styles(path: string): string {
  const blocks = [...source(path).matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  expect(blocks.length).toBeGreaterThan(0);
  return blocks.join('\n');
}

describe('404 眉题', () => {
  it('中性眉题在文案字典，模板读取它，不再写深度', () => {
    expect(zh.site.notFound.eyebrow).toBe('404');
    const page = source('src/pages/404.astro');
    expect(page).toContain('{N.eyebrow}');
    expect(page).toContain('{N.title}');
    expect(page).not.toMatch(/∞/);
    expect(page).not.toContain('data/site');
  });
});

describe('减少动态说明', () => {
  it('原句只在减少动态或 static 档出现，默认隐藏', () => {
    expect(zh.home.reducedNote).toBe(NOTE);
    const page = source('src/pages/index.astro');
    expect(page.match(/\{t\.home\.reducedNote\}/g)).toEqual(['{t.home.reducedNote}']);
    expect(page).toContain('class="reduced-note"');

    const css = styles('src/pages/index.astro');
    expect(css).toMatch(/\.reduced-note\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{\s*\.reduced-note\s*\{\s*display:\s*block/);
    expect(css).toMatch(/html\[data-sky-tier=['"]static['"]\][^{]*\.reduced-note\s*\{\s*display:\s*block/);
    expect(css).not.toMatch(/data-sky-tier=['"](?:high|mid|low)['"]/);
  });
});

describe('首页顶栏', () => {
  it('透明固定在视口上，内页仍吸顶，深字规则保留', async () => {
    const css = styles('src/components/Header.astro');
    expect(css).toMatch(/\.hd\.sky\s*\{[^}]*position:\s*fixed/);
    expect(css).not.toMatch(/\.hd\.sky\s*\{[^}]*background/);
    expect(css).toMatch(/\.hd\.page\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/html\[data-ink=['"]dark['"]\][\s\S]*\.sky \.mark[\s\S]*?color:\s*#16202c/);
    expect(css).toMatch(/html\[data-ink=['"]dark['"]\][\s\S]*\.sky \.nav a\s*\{\s*color:\s*#16202c/);
    expect(css).not.toMatch(/rgba\(22,\s*32,\s*44,\s*\.75\)/);

    const container = await AstroContainer.create();
    const sky = await container.renderToString(Header, { props: { variant: 'sky' } });
    const page = await container.renderToString(Header, { props: { variant: 'page' } });
    expect(sky).toContain('class="hd sky"');
    expect(page).toContain('class="hd page"');
  });
});

describe('插件页线上判定', () => {
  it('#12：插件与主题接口都成功才算线上，任一边失败两边一起回落离线清单', () => {
    const page = source('src/pages/plugins.astro');
    expect(page).toContain('rawP !== null && rawT !== null');
    expect(page).toMatch(/normalizePlugins\(live \? rawP : snapshot\)/);
    expect(page).toMatch(/normalizeThemes\(live \? rawT : \{ plugins: snapshot\.themes \}\)/);
    expect(page).not.toContain('rawP ?? snapshot');
  });
});
