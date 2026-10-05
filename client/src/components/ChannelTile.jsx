import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * The mark is the broadcaster's own public channel avatar, hot-linked — we host
 * no copy of it. If the remote image is missing or fails, the name lockup stands
 * in so no tile ever goes blank.
 */
export default function ChannelTile({ channel }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(channel.logoUrl) && !logoFailed;

  return (
    <Link className="channel" to={`/live/${channel.slug}`}>
      <div className="channel-tile">
        {showLogo ? (
          <img
            className="channel-logo"
            src={channel.logoUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="channel-mark">{channel.name}</span>
        )}
        {channel.kind === 'radio' && <span className="channel-kind">Radio</span>}
      </div>
      <div className="channel-name">{channel.name}</div>
      <div className="channel-sub">
        {channel.category} · {channel.country === 'Ethiopia' ? channel.language : 'International'}
      </div>
    </Link>
  );
}
