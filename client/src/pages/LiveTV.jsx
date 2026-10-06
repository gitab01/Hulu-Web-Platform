import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Antenna, LayoutGrid, Radio, Tv } from 'lucide-react';
import { catalog } from '../api/client';
import ChannelTile from '../components/ChannelTile';
import WarmUp from '../components/WarmUp';

const KINDS = [
  { key: '', label: 'TV and radio', icon: LayoutGrid },
  { key: 'tv', label: 'TV', icon: Tv },
  { key: 'radio', label: 'Radio', icon: Radio },
];

const ORIGINS = [
  { key: '', label: 'Everywhere' },
  { key: 'Ethiopia', label: 'Ethiopian' },
  { key: 'International', label: 'International' },
];

export default function LiveTV() {
  // The filters live in the URL so a footer link or a shared link opens the same view.
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'All';
  const kind = params.get('kind') || '';
  const country = params.get('country') || '';

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const reload = () => setNonce((n) => n + 1);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    let alive = true;
    setError(null);
    catalog
      .channels({ category, kind, country })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [category, kind, country, nonce]);

  const channels = useMemo(() => data?.channels || [], [data]);

  return (
    <div className="container live">
      <header className="live-head">
        <div>
          <span className="eyebrow">Free to air</span>
          <h1>
            <Antenna className="row-icon" aria-hidden="true" />
            Live TV
          </h1>
        </div>
        <p className="live-note">
          Every channel plays its broadcaster&apos;s own published video — nothing here is re-hosted. Each channel page opens
          whatever that broadcaster is broadcasting at the moment, and the most recent video it published when nothing is on
          air; the label above the player says which of the two it found. Line-ups change without notice, so no schedule is
          promised.
        </p>
      </header>

      <div className="live-filters">
        <div className="chips" role="group" aria-label="Filter by type">
          {ORIGINS.map((o) => (
            <button
              key={o.key || 'everywhere'}
              type="button"
              className="chip"
              aria-pressed={country === o.key}
              onClick={() => setParam('country', o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Filter by category">
          {(data?.categories || ['All']).map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setParam('category', c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Filter by medium">
          {KINDS.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.label}
                type="button"
                className={kind === k.key ? 'on' : ''}
                aria-pressed={kind === k.key}
                onClick={() => setParam('kind', k.key)}
              >
                <Icon aria-hidden="true" />
                {k.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="notice notice--error">
          <h2>The channel list did not load</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {!data && !error && (
        <>
          <WarmUp />
          <div className="channel-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div className="channel" key={i}>
                <div className="skel skel-channel" />
                <div className="skel skel-line" style={{ width: '60%' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {data && !channels.length && !error && (
        <div className="notice">
          <h2>No channels in this view</h2>
          <p>Nothing is carried under this filter yet. Clear it to see the full line-up.</p>
          <button className="btn btn-primary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Show all channels
          </button>
        </div>
      )}

      {channels.length > 0 && (
        <>
          <div className="live-count">
            {channels.length} {channels.length === 1 ? 'channel' : 'channels'}
            {category !== 'All' && ` in ${category}`}
            {country && ` · ${country === 'Ethiopia' ? 'Ethiopian' : 'international'}`}
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
