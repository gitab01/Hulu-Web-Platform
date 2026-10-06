import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Play, RefreshCw } from 'lucide-react';
import { catalog } from '../api/client';
import ChannelTile from '../components/ChannelTile';
import LiveEmbed from '../components/LiveEmbed';
import WarmUp from '../components/WarmUp';

/**
 * What the frame holds. The server reads the channel's live-filtered video list, so
 * a channel that is broadcasting is known before the player loads; the player is
 * asked anyway, because its answer is the freshest one, and only a true from it is
 * taken as news.
 */
function statusPill(status) {
  if (!status) return null;
  const copy = {
    live: 'On air now',
    vod: 'Latest published',
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

function ChannelLogo({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      className="live-logo"
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      aria-hidden="true"
    />
  );
}

/* The line under the frame, in the broadcaster's own words, so what is on screen is
   never mistaken for something this app chose. */
function LiveCaption({ status, channel }) {
  return (
    <div className="live-caption">
      <span className="live-caption-slot">In the frame</span>
      <span className="live-caption-title">
        {(status && status.videoTitle) || channel.streamTitle || `${channel.name}'s own video`}
      </span>
    </div>
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
  // A frame that cannot be trusted is not worth showing: say why, and hand over the
  // address that does work.
  const refused = status && status.kind === 'blocked';
  // 100 is the player's "nothing at this address" — an ended broadcast whose id is
  // still the channel's newest feed entry. 101/150 is the broadcaster switching
  // embedding off, which is a different thing to say and a different thing to offer.
  const gone = Boolean(refused && status.code === 100);

  const playLatest = () => {
    setMode('latest');
    setStatus(null);
    setStarted(true);
  };

  return (
    <article className="container live">
      <div className="live-crumb">
        <Link to="/live">Live TV</Link>
        <span aria-hidden="true">/</span>
        <span>{channel.name}</span>
      </div>

      <div className="live-head">
        <div className="live-ident">
          <ChannelLogo src={channel.logoUrl} />
          <div className="live-ident-text">
            <span className="eyebrow">
              {channel.category} · {channel.country}
              {channel.language ? ` · ${channel.language}` : ''}
            </span>
            <h1>{channel.name}</h1>
            {channel.description && <p className="synopsis">{channel.description}</p>}
          </div>
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
            <>
              <LiveEmbed
                src={embed}
                title={`${channel.name} on ${channel.kind === 'radio' ? 'radio' : 'television'}`}
                knownLive={Boolean(channel.streamOnAir)}
                onStatus={setStatus}
              />
              <LiveCaption status={status} channel={channel} />
            </>
          ) : refused ? (
            <div className="live-gate">
              <div className="live-gate-copy">
                <span className="eyebrow">{gone ? 'Nothing at that address' : 'Refused by the broadcaster'}</span>
                <h2>{gone ? `This is not ${channel.name}'s live video any more` : `${channel.name} does not allow its video to play here`}</h2>
                <p>
                  {gone
                    ? 'A broadcast ends and its address goes quiet, while the channel feed can still name it as the newest video. Its list of published videos usually plays, and its own live address shows whatever is on air now.'
                    : "Some broadcasters switch off playback inside other websites. Nothing is re-hosted to work around that, so the channel's own address is the way to watch it."}
                </p>
              </div>
              <div className="live-gate-actions">
                {gone && channel.embeds.latest ? (
                  <button type="button" className="btn btn-primary" onClick={playLatest}>
                    <Play aria-hidden="true" />
                    Play the latest videos
                  </button>
                ) : (
                  <a className="btn btn-primary" href={channel.embeds.watch} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Open on the broadcaster&apos;s channel
                  </a>
                )}
                {gone && (
                  <a className="btn" href={channel.embeds.watch} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Open on the broadcaster&apos;s channel
                  </a>
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
                  {channel.streamTitle ? ` · ${channel.streamTitle}` : ''}
                </span>
                <h2>Nothing plays until you ask</h2>
                <p>
                  {mode === 'stream'
                    ? `This opens whatever ${channel.name} is broadcasting right now. When the channel is off air it opens the most recent video it published instead, and the label above the player says which of the two it found.`
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
          <a className="btn" href={channel.embeds.watch} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" />
            Watch live on the broadcaster&apos;s channel
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
