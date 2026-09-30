'use strict';

const app = require('./app');
const config = require('./config');
const { connectDb } = require('./config/db');
const recomputeJob = require('./jobs/recomputeSimilarity');

async function main() {
  await connectDb();
  app.listen(config.port, () => {
    console.log(`[api] listening on :${config.port} (${config.env})`);
    console.log(`[api] billing provider: ${require('./services/billingService').isRealStripe() ? 'stripe' : 'mock'}`);
  });

  // Optional in-process recommender. On Render, prefer a scheduled Cron service
  // running `npm run recompute` nightly instead of holding a timer here.
  if (config.recommender.inProcess) {
    const ms = config.recommender.intervalMinutes * 60 * 1000;
    setInterval(() => {
      recomputeJob.run().catch((e) => console.error('[recommender]', e.message));
    }, ms);
    console.log(`[api] in-process recommender every ${config.recommender.intervalMinutes}m`);
  }
}

main().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
