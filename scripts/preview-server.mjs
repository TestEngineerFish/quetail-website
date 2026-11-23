// snap / perf / og 共用：起 astro preview（独立进程组，结束整组回收）、解析 Chrome 路径。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

// 系统默认 Chrome 不存在且没设 CHROME 时直接报错退出，别等到 playwright 启动才炸。
export function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  const p = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!existsSync(p)) {
    console.error(`找不到 Chrome：${p}；装了别的位置请设 CHROME=/path/to/chrome`);
    process.exit(1);
  }
  return p;
}

// detached: 让 npx 自成进程组，后面能一次杀掉它拉起的整棵子树。
export async function startPreview(port) {
  const server = spawn('npx', ['astro', 'preview', '--port', String(port)], { stdio: 'pipe', detached: true });
  await new Promise((ok, bad) => {
    const timer = setTimeout(() => bad(new Error(`astro preview 15 秒内没监听 ${port}`)), 15000);
    server.on('error', bad);
    server.on('exit', () => bad(new Error(`astro preview 提前退出（code ${server.exitCode}）`)));
    server.stdout.on('data', (d) => {
      if (String(d).includes(String(port))) { clearTimeout(timer); ok(); }
    });
  });
  return server;
}

// 先 SIGTERM 整个进程组（组杀失败回退杀父进程），3 秒没退干净再 SIGKILL。
export async function stopPreview(server) {
  if (!server || !server.pid || server.exitCode !== null) return;
  const kill = (sig) => {
    try { process.kill(-server.pid, sig); }
    catch { try { server.kill(sig); } catch { /* 已经退了 */ } }
  };
  const exited = () => new Promise((ok) => server.once('exit', () => ok(true)));
  const within = (ms) => Promise.race([exited(), new Promise((ok) => setTimeout(() => ok(false), ms))]);
  kill('SIGTERM');
  if (!(await within(3000))) {
    kill('SIGKILL');
    await within(1000);
  }
}
