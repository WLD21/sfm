import { spawn, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4208', '--strictPort'], { stdio: 'inherit' });
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:4208')).ok) break; } catch {}
    if (i === 99) throw new Error('Production preview server did not start');
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  const summaries = [];
  for (const mode of ['gym', 'spa']) {
    for (const [size, width, height, reduced] of [['desktop', 1440, 900, false], ['mobile', 390, 844, false], ['reduced', 390, 844, true]]) {
      const out = 'docs/previews/scroll-' + mode + '-' + size;
      const args = ['tools/scroll-craft/scripts/shoot.mjs', '--url', 'http://127.0.0.1:4208/?lang=en&experience=' + mode, '--out', out, '--width', String(width), '--height', String(height), '--steps', '4'];
      if (reduced) args.push('--reduced-motion');
      const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
      process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
      if (result.status !== 0) throw new Error('Upstream harness failed: ' + mode + ' ' + size);
      await writeFile(out + '/harness.txt', result.stdout);
      const report = JSON.parse(await readFile(out + '/report.json', 'utf8'));
      summaries.push({ mode, size, samples: Array.isArray(report) ? report.length : null, output: out });
    }
  }
  await mkdir('docs/previews', { recursive: true });
  await writeFile('docs/previews/scroll-summary.json', JSON.stringify(summaries, null, 2) + '\n');
} finally { server.kill(); }
