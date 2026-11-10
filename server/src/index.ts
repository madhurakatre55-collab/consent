import { createApp } from './app.js';
import { getDb, initDb } from './db/schema.js';
import { runSeed } from './db/seed.js';
import { config } from './config/env.js';
import { startReleaseJob } from './jobs/releaseJob.js';

async function main() {
  console.log('Initializing Consent Database...');
  await initDb();

  // Auto-seed on fresh/ephemeral deployments (e.g. Render free tier) if database is empty
  const db = getDb();
  const circleCountRes = await db.execute('SELECT COUNT(*) as cnt FROM circles');
  const count = Number(circleCountRes.rows?.[0]?.cnt || 0);
  if (count === 0) {
    console.log('Empty database detected — auto-seeding hackathon demo scenarios...');
    await runSeed();
  }

  const app = createApp();

  // Start background conditional release evaluation job
  startReleaseJob(30000);

  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(` Consent Server running on http://localhost:${config.port}`);
    console.log(` LLM Provider : ${config.llmProvider}`);
    console.log(` PayPal Env   : ${config.paypalEnv} (${config.paypalClientId ? 'Real credentials configured' : 'Demo sandbox mode'})`);
    console.log(` Demo Mode    : ${config.demoMode ? 'ENABLED (1 min cooling off)' : 'DISABLED'}`);
    console.log(`====================================================`);
  });
}

main().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
