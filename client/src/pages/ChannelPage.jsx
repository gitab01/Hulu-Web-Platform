import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, RefreshCw } from 'lucide-react';
import { catalog } from '../api/client';
import ChannelTile from '../components/ChannelTile';
import LiveEmbed from '../components/LiveEmbed';
import WarmUp from '../components/WarmUp';

/**
 * What the player said about the video in the frame. The server cannot know whether
 * a channel is streaming — YouTube answers a server's question about a channel page
 * with an empty shell — so this page reports only what the player itself confirmed,
 * and says nothing until it has.
 */
function statusPill(status) {
  if (!status) return null;
  const copy = {
    live: 'On air now',
    vod: 'Latest upload',
    blocked: 'Not embeddable here',
    unknown: 'Playing from the broadcaster',
  }[status.kind];
  return (
    <span className={`status-pill${status.kind === 'live' ? ' status-pill--on' : ''}`}>
      {status.kind === 'live' && <span className="status-dot" aria-hidden="true" />}
      {copy}
    </span>
  );
}

export default function ChannelPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);
  // The embed only loads on request: a phone should not download a video it was not
  // asked for, and the broadcaster's title is worth showing before it starts.
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState('stream');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    setStarted(false);
    setMode('stream');
    setStatus(null);
    catalog
      .channel(slug)
      .then((d) => alive && setData(d))
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
        <WarmUp />
      </div>
    );
  }

  const { channel, related } = data;
  const embed = mode === 'latest' ? channel.embeds?.latest : channel.embeds?.stream;
  // A frame the broadcaster refused is not worth showing: say so and hand over the
  // link that does work.
  const refused = status && status.kind === 'blocked';

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
            {started && statusPill(status)}
            <button type="button" className="live-recheck" onClick={reload}>
              <RefreshCw aria-hidden="true" />
              Check again
            </button>
          </div>
        )}
      </div>

      {channel.embeds ? (
        <div className="live-frame">
          {started && embed && !refused ? (
            <LiveEmbed src={embed} title={`${channel.name} on ${channel.kind === 'radio' ? 'radio' : 'television'}`} onStatus={setStatus} />
          ) : refused ? (
            <div className="live-gate">
              <div className="live-gate-copy">
                <span className="eyebrow">Refused by the broadcaster</span>
                <h2>{channel.name} does not allow its video to play here</h2>
                <p>
                  Some broadcasters switch off playback inside other websites. Nothing is re-hosted to work around that, so
                  the channel&apos;s own address is the way to watch it.
                </p>
              </div>
              <div className="live-gate-actions">
                <a className="btn btn-primary" href={channel.embeds.watch} target="_blank" rel="noopener noreferrer">
                  <Play aria-hidden="true" />
                  Open on the broadcaster&apos;s channel
                </a>
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
                  {channel.streamTitle ? ` · ${channel.streamTitle}` : ''}
                </span>
                <h2>Nothing plays until you ask</h2>
                <p>
                  {mode === 'stream'
                    ? `This opens the most recent video ${channel.name} has published. Once it starts, the label above the player says whether that video is broadcasting right now or is a finished upload. A channel's own continuous stream is on the broadcaster's channel.`
                    : `This opens the videos ${channel.name} has published, most recent first.`}
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setStarted(true)}>
                <Play aria-hidden="true" />
                {mode === 'stream' ? 'Start playing' : 'Play the latest videos'}
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
              className={mode === 'stream' ? 'on' : ''}
              aria-pressed={mode === 'stream'}
              onClick={() => {
                setMode('stream');
                setStatus(null);
                setStarted(false);
              }}
            >
              Channel stream
            </button>
            {channel.embeds.latest && (
              <button
                type="button"
                className={mode === 'latest' ? 'on' : ''}
                aria-pressed={mode === 'latest'}
                onClick={() => {
                  setMode('latest');
                  setStatus(null);
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
        Video here is played from each broadcaster and stays under their control, so picture, rights and availability follow
        whatever they publish. No subscription is needed to watch live television — plans gate the on-demand catalogue we
        stream ourselves.
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
