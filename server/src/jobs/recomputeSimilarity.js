'use strict';

const { connectDb, disconnectDb } = require('../config/db');
const Title = require('../models/Title');
const WatchEvent = require('../models/WatchEvent');
const { recomputeSimilarity } = require('../services/recommendation');

/**
 * Nightly batch. Refresh popularity/completion stats and materialize the
 * "similar titles" lists, so a browse request never triggers a model run.
 * Run standalone (`npm run recompute`) or as a Render Cron service.
 */
async function run() {
  await connectDb();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const stats = await WatchEvent.aggregate([
    { $match: { completed: true, watchedAt: { $gte: since } } },
    { $group: { _id: '$titleId', completed: { $sum: 1 } } },
  ]);

  const updates = stats.map((s) => ({
    updateOne: {
      filter: { _id: s._id },
      // popularity is an exponentially-decaying recent-completion count; a simple
      // recency weight so trending reflects "now", not all-time.
      update: { $set: { completedLast30d: s.completed, popularity: Math.round(s.completed * 1.5) } },
    },
  }));
  // Zero out titles with no recent completions.
  const allIds = (await Title.find({}, '_id')).map((t) => t._id);
  const haveIds = new Set(stats.map((s) => String(s._id)));
  for (const id of allIds) {
    if (!haveIds.has(String(id))) {
      updates.push({ updateOne: { filter: { _id: id }, update: { $set: { completedLast30d: 0, popularity: 0 } } } });
    }
  }

  if (updates.length) await Title.bulkWrite(updates);

  const sim = await recomputeSimilarity();
  console.log('[recompute]', { stats: updates.length, ...sim });

  await disconnectDb();
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[recompute] failed', err);
      process.exit(1);
    });
}

module.exports = { run };
