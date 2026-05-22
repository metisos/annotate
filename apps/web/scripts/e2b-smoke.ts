import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Sandbox } from 'e2b';

config({ path: resolve(import.meta.dirname, '../../../.env.local') });

async function main() {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error('E2B_API_KEY not set');
  console.log('[e2b] creating sandbox…');
  const t0 = Date.now();
  const sbx = await Sandbox.create({ apiKey, timeoutMs: 120_000 });
  console.log(`[e2b] sandbox up in ${Date.now() - t0}ms`);

  try {
    for (const probe of [
      'sh -c "whoami; id"',
      'sh -c "sudo -n true 2>&1; echo exit=$?"',
      'sh -c "apt-get update 2>&1 | tail -3; echo exit=$?"',
      'sh -c "sudo apt-get update 2>&1 | tail -3; echo exit=$?"',
      'sh -c "sudo apt-get install -y ffmpeg 2>&1 | tail -5; which ffmpeg; echo exit=$?"',
      'sh -c "pip install -q yt-dlp && which yt-dlp; echo exit=$?"',
    ]) {
      const r = await sbx.commands.run(probe);
      console.log(`$ ${probe}`);
      console.log(`  exit=${r.exitCode} stdout=${r.stdout.trim().slice(0, 200)}`);
      if (r.stderr.trim()) console.log(`  stderr=${r.stderr.trim().slice(0, 200)}`);
    }
  } finally {
    await sbx.kill();
    console.log('[e2b] sandbox killed');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
