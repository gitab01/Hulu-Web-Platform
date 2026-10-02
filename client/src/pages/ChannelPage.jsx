import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catalog } from '../api/client';
import ChannelTile from '../components/ChannelTile';

export default function ChannelPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // The embed only loads on request: an off-air live stream is better explained
  // than autoplayed, and a phone should not download a video it was not asked for.
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState('live');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    setStarted(false);
    setMode('live');
    catalog
      .channel(slug)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.status === 404 ? 'no such channel' : e.message));
    return () => {
      alive = false;
    };
  }, [slug]);

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
      </div>

      {channel.embeds ? (
        <div className="live-frame">
          {started && embed ? (
            <iframe
              className="live-embed"
              src={embed}
              title={`${channel.name} on ${channel.kind === 'radio' ? 'radio' : 'live television'}`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="live-gate">
              <div className="live-gate-copy">
                <span className="eyebrow">{channel.kind === 'radio' ? 'Radio stream' : 'Television stream'}</span>
                <h2>Nothing plays until you ask</h2>
                <p>
                  This opens {channel.name}&apos;s own published stream. If the channel is off air right now, switch to its
                  latest videos below.
                </p>
              </div>
              <button className="btn btn-primary btn--play" onClick={() => setStarted(true)}>
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
              Live
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
