// #11：snap / perf / og 起预览要放独立进程组、结束整组回收，异常路径也走 finally，打完日志按错误退出。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('预览脚本回收', () => {
  it('公共 helper 起独立进程组，并按进程组杀、父进程兜底', () => {
    const helper = source('scripts/preview-server.mjs');
    expect(helper).toContain('detached: true');
    expect(helper).toMatch(/process\.kill\(-server\.pid/);
    expect(helper).toContain('server.kill(');
  });
  it('三份脚本都走公共 helper + finally + process.exit，不再裸 spawn', () => {
    for (const s of ['snap', 'perf', 'og']) {
      const f = source(`scripts/${s}.mjs`);
      expect(f, s).toContain('startPreview');
      expect(f, s).toContain('stopPreview');
      expect(f, s).toContain('finally');
      expect(f, s).toContain('process.exit');
      expect(f, s).not.toContain("spawn('npx'");
    }
  });
});
