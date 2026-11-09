import { createApp } from './app.js';
import { initDb } from './db/schema.js';
import { config } from './config/env.js';
import { startReleaseJob } from './jobs/releaseJob.js';

async function main() {
  console.log('Initializing Consent Database...');
  await initDb();

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
