'use strict';

const app = require('./app');
const config = require('./config');
const { connectDb } = require('./config/db');
const recomputeJob = require('./jobs/recomputeSimilarity');
const { ensureCatalogue } = require('./seed/seed');

async function main() {
  await connectDb();
  app.listen(config.port, () => {
    console.log(`[api] listening on :${config.port} (${config.env})`);
    console.log(`[api] billing provider: ${require('./services/billingService').isRealStripe() ? 'stripe' : 'mock'}`);

    // Off the boot path on purpose: a host probes for a listening socket, and an
    // empty database should not stop the API from answering.
    ensureCatalogue().catch((e) => console.error('[api] catalogue could not be filled in:', e.message));
  });

  // Optional in-process recommender (Render free tier has no cron). runOnce() assumes
  // the DB is already connected and never disconnects it.
  if (config.recommender.inProcess) {
    const ms = config.recommender.intervalMinutes * 60 * 1000;
    setInterval(() => {
      recomputeJob.runOnce().catch((e) => console.error('[recommender]', e.message));
    }, ms);
    console.log(`[api] in-process recommender every ${config.recommender.intervalMinutes}m`);
  }
}

main().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
