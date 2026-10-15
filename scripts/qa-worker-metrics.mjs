// Read-only, bounded live diagnosis. Never prints headers, query strings or tokens.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const env = { ...process.env };
delete env.CLOUDFLARE_API_TOKEN;
delete env.CLOUDFLARE_ACCOUNT_ID;
const child = spawn(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), 'tail', 'chile3x', '--format', 'json'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let buffer = '';
child.stdout.on('data', chunk => {
  buffer += chunk;
  while (buffer.includes('{')) {
    const start = buffer.indexOf('{');
    let depth = 0, quoted = false, escaped = false, end = -1;
    for (let i = start; i < buffer.length; i++) {
      const character = buffer[i];
      if (quoted) { if (escaped) escaped = false; else if (character === '\\') escaped = true; else if (character === '"') quoted = false; }
      else if (character === '"') quoted = true;
      else if (character === '{') depth++;
      else if (character === '}' && --depth === 0) { end = i + 1; break; }
    }
    if (end < 0) break;
    const record = JSON.parse(buffer.slice(start, end)); buffer = buffer.slice(end);
    const request = record.event?.request;
    const path = request?.url ? new URL(request.url).pathname : '';
    if (path.startsWith('/perfil/') || record.outcome?.includes('exceeded')) console.log(JSON.stringify({ path, outcome: record.outcome, status: record.event?.response?.status, cpuMs: record.cpuTimeMs, wallMs: record.wallTimeMs, exceptionNames: record.exceptions?.map(item => item.name) }));
  }
});
// CLI diagnostic text can contain account identifiers. Surface status only.
child.stderr.on('data', () => {});
child.on('error', () => console.error('Could not start read-only Worker tail.'));
const timeout = setTimeout(() => child.kill(), 45_000);
child.on('exit', code => { clearTimeout(timeout); console.log('Live metric collection stopped', code ?? 'bounded timeout'); });
