import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, RefreshCw } from 'lucide-react';
import { catalog } from '../api/client';
import ChannelTile from '../components/ChannelTile';

export default function ChannelPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);
  // The embed only loads on request: an off-air live stream is better explained
  // than autoplayed, and a phone should not download a video it was not asked for.
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState('live');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    setStarted(false);
    catalog
      .channel(slug)
      .then((d) => {
        if (!alive) return;
        setData(d);
        // The answer that matters for what opens: the broadcaster's own current
        // stream if it has one, its published uploads if it does not.
        setMode(d.channel.onAir || !d.channel.embeds?.latest ? 'live' : 'latest');
      })
      .catch((e) => alive && setError(e.status === 404 ? 'no such channel' : e.message));
    return () => {
      alive = false;
    };
  }, [slug, nonce]);

  const reload = () => setNonce((n) => n + 1);

  if (error) {
    return (
      <div className="container">
        <div className="notice notice--error">
          <h2>We could not open this channel</h2>
          <p>{error === 'no such channel' ? 'This channel is not in the line-up. It may have been renamed.' : error}</p>
          <Link to="/live" className="btn btn-primary">
            Back to Live TV
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container" style={{ paddingTop: 'clamp(20px, 4vw, 36px)' }} role="status">
        <div className="skel skel-channel-frame" />
      </div>
    );
  }

  const { channel, related } = data;
  const embed = mode === 'live' ? channel.embeds?.live : channel.embeds?.latest;
  // Living up to the badge is the whole point: a live_stream embed with nothing on
  // air paints a black rectangle, which reads as a broken player, not a closed
  // studio. So live only opens when the channel is actually broadcasting.
  const liveBlocked = mode === 'live' && channel.onAir === false;

  return (
    <article className="container live">
      <div className="live-crumb">
        <Link to="/live">Live TV</Link>
        <span aria-hidden="true">/</span>
        <span>{channel.name}</span>
      </div>

      <div className="live-head">
        <div>
          <span className="eyebrow">
            {channel.category} · {channel.country}
            {channel.language ? ` · ${channel.language}` : ''}
          </span>
          <h1>{channel.name}</h1>
          {channel.description && <p className="synopsis">{channel.description}</p>}
        </div>
        {channel.embeds && (
          <div className="live-status">
            <span className={`status-pill${channel.onAir === true ? ' status-pill--on' : ''}`}>
              {channel.onAir === true && <span className="status-dot" aria-hidden="true" />}
              {channel.onAir === true ? 'On air now' : channel.onAir === false ? 'Off air' : 'Live status unconfirmed'}
            </span>
            <button type="button" className="live-recheck" onClick={reload}>
              <RefreshCw aria-hidden="true" />
              Check again
            </button>
          </div>
        )}
      </div>

      {channel.embeds ? (
        <div className="live-frame">
          {started && embed && !liveBlocked ? (
            <iframe
              className="live-embed"
              src={embed}
              title={`${channel.name} on ${channel.kind === 'radio' ? 'radio' : 'live television'}`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : liveBlocked ? (
            <div className="live-gate">
              <div className="live-gate-copy">
                <span className="eyebrow">Not broadcasting</span>
                <h2>{channel.name} is off air right now</h2>
                <p>
                  There is no live stream to open, so nothing is played rather than an empty frame. Switch to its latest
                  published videos, or open the broadcaster&apos;s own channel to see what it has on.
                </p>
              </div>
              <div className="live-gate-actions">
                {channel.embeds.latest && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setMode('latest');
                      setStarted(true);
                    }}
                  >
                    <Play aria-hidden="true" />
                    Play the latest videos
                  </button>
                )}
                <button className="btn btn-ghost" onClick={reload}>
                  <RefreshCw aria-hidden="true" />
                  Check again
                </button>
              </div>
            </div>
          ) : (
            <div className="live-gate">
              <div className="live-gate-copy">
                <span className="eyebrow">
                  {channel.kind === 'radio' ? 'Radio stream' : 'Television stream'}
                  {channel.onAir ? ' · on air' : ''}
                </span>
                <h2>Nothing plays until you ask</h2>
                <p>
                  {mode === 'live'
                    ? `This opens ${channel.name}'s own published stream, live as it is broadcast.`
                    : `This opens the videos ${channel.name} has published most recently.`}
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setStarted(true)}>
                <Play aria-hidden="true" />
                {mode === 'live' ? 'Start the live stream' : 'Play the latest videos'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="notice">
          <h2>No published stream yet</h2>
          <p>
            {channel.name} is listed but has no stream address. Add the broadcaster&apos;s channel id in{' '}
            <code>server/src/data/channels.js</code> and re-run the seed.
          </p>
        </div>
      )}

      {channel.embeds && (
        <div className="live-controls">
          <div className="segmented" role="group" aria-label="What to play">
            <button
              type="button"
              className={mode === 'live' ? 'on' : ''}
              aria-pressed={mode === 'live'}
              onClick={() => {
                setMode('live');
                setStarted(false);
              }}
            >
              {channel.onAir ? 'Live now' : 'Live'}
            </button>
            {channel.embeds.latest && (
              <button
                type="button"
                className={mode === 'latest' ? 'on' : ''}
                aria-pressed={mode === 'latest'}
                onClick={() => {
                  setMode('latest');
                  setStarted(false);
                }}
              >
                Latest videos
              </button>
            )}
          </div>
          <a className="btn btn-ghost" href={channel.embeds.watch} target="_blank" rel="noopener noreferrer">
            Open on the broadcaster&apos;s channel
          </a>
        </div>
      )}

      <p className="live-note">
        Streams here are embedded from each broadcaster and stay under their control, so picture, rights and availability
        follow whatever they publish. No subscription is needed to watch live television — plans gate the on-demand catalogue
        we stream ourselves.
      </p>

      {related?.length > 0 && (
        <section className="live-related">
          <h2>More {channel.category.toLowerCase()}</h2>
          <div className="channel-grid">
            {related.map((c) => (
              <ChannelTile channel={c} key={c.slug} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
