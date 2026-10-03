'use strict';

const mongoose = require('mongoose');

/**
 * A free-to-air broadcast channel (Ethiopian and international), surfaced on the
 * Live TV page.
 *
 * We do not host, re-stream or transcode any of this: each channel points at the
 * BROADCASTER'S OWN publicly published live stream, which is why no signed
 * playback URL or subscription entitlement applies here. That is deliberately
 * different from the VOD catalogue, where we serve the media ourselves through
 * /player/segment and gate it on an active plan.
 */
const CHANNEL_CATEGORIES = ['News', 'Entertainment', 'Movies', 'Sports', 'Music', 'Kids', 'Documentary', 'Religion'];

const channelSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, enum: CHANNEL_CATEGORIES, required: true, index: true },
    // 'tv' is a picture channel; 'radio' streams audio only.
    kind: { type: String, enum: ['tv', 'radio'], default: 'tv', index: true },
    country: { type: String, required: true, index: true },
    language: { type: String, default: 'English' },
    description: { type: String, default: '' },
    // The broadcaster's own channel id. Live stream and latest-uploads embeds are
    // derived from it, so a single field is all it takes to add a channel.
    youtubeChannelId: { type: String, default: '', index: true },
    // The broadcaster's own public channel avatar; blank means the name lockup shows.
    logoUrl: { type: String, default: '' },
    homepageUrl: { type: String, default: '' },
    // Ethiopian channels first on the grid: this build leads with local content.
    displayRank: { type: Number, default: 100, index: true },
    active: { type: Boolean, default: true, index: true },
  },
  { versionKey: false }
);

channelSchema.statics.CATEGORIES = CHANNEL_CATEGORIES;

module.exports = mongoose.model('Channel', channelSchema);
