import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../api/client';
import ChannelTile from '../components/ChannelTile';

const KINDS = [
  { key: '', label: 'TV and radio' },
  { key: 'tv', label: 'TV' },
  { key: 'radio', label: 'Radio' },
];

export default function LiveTV() {
  const [category, setCategory] = useState('All');
  const [kind, setKind] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    catalog
      .channels({ category, kind })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [category, kind]);

  const channels = data?.channels || [];

  return (
    <div className="container live">
      <header className="live-head">
        <div>
          <span className="eyebrow">Free to air</span>
          <h1>Live TV</h1>
        </div>
        <p className="live-note">
          Every channel opens the broadcaster&apos;s own public stream — nothing here is re-hosted. When a channel is off air,
          its latest published videos play instead. Live line-ups change without notice, so no schedule is promised.
        </p>
      </header>

      <div className="live-filters" role="group" aria-label="Filter channels">
        <div className="chips">
          {(data?.categories || ['All']).map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="segmented">
          {KINDS.map((k) => (
            <button
              key={k.label}
              type="button"
              className={kind === k.key ? 'on' : ''}
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="notice notice--error">
          <h2>The channel list did not load</h2>
          <p>{error}</p>
        </div>
      )}

      {!data && !error && (
        <div className="channel-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="channel" key={i}>
              <div className="skel skel-channel" />
              <div className="skel skel-line" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      )}

      {data && !channels.length && !error && (
        <div className="notice">
          <h2>No channels in this view</h2>
          <p>Nothing is carried under this filter yet. Clear it to see the full line-up.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setCategory('All');
              setKind('');
            }}
          >
            Show all channels
          </button>
        </div>
      )}

      {channels.length > 0 && (
        <>
          <div className="live-count">
            {channels.length} {channels.length === 1 ? 'channel' : 'channels'}
            {category !== 'All' && ` in ${category}`}
            {kind && ` · ${kind === 'tv' ? 'TV only' : 'radio only'}`}
          </div>
          <div className="channel-grid">
            {channels.map((c) => (
              <ChannelTile channel={c} key={c.slug} />
            ))}
          </div>
        </>
      )}

      <p className="live-foot">
        Looking for something to watch on your own schedule? <Link to="/">The on-demand catalogue</Link> is a different
        library, and it is the part this build streams itself.
      </p>
    </div>
  );
}
