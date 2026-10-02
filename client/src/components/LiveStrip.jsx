import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { catalog } from '../api/client';
import ChannelTile from './ChannelTile';

/**
 * The Ethiopian broadcasters, on the page people actually land on. These are the
 * channels' own public streams, so this strip needs no subscription and no
 * entitlement check — it is the one part of the home page that is live rather than
 * on demand.
 */
export default function LiveStrip({ country = 'Ethiopia', kind = '', limit = 14 }) {
  const [channels, setChannels] = useState([]);
  const [held, setHeld] = useState(false);
  const track = useRef(null);

  useEffect(() => {
    let alive = true;
    catalog
      .channels({ country, kind, limit })
      .then((d) => alive && setChannels(d.channels || []))
      .catch(() => alive && setChannels([]));
    return () => {
      alive = false;
    };
  }, [country, kind, limit]);

  // One card every few seconds, wrapping at the end. Held while somebody is
  // reading or pointing at the strip, and never run at all for a viewer who has
  // asked for less motion.
  useEffect(() => {
    if (held || channels.length < 2) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => {
      const el = track.current;
      if (!el) return;
      const rest = el.scrollWidth - el.clientWidth - el.scrollLeft;
      if (rest <= 4) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: Math.min(el.firstElementChild.getBoundingClientRect().width + 12, rest), behavior: 'smooth' });
    }, 3200);
    return () => clearInterval(t);
  }, [held, channels.length]);

  if (!channels.length) return null;

  const nudge = (dir) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section
      className="row container live-strip"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="row-head">
        <div>
          <h2>
            <Radio className="row-icon" aria-hidden="true" />
            Live Across Ethiopia
          </h2>
          <div className="note">ቀጥታ ቴሌቪዥን · TV and radio from each broadcaster&apos;s own stream, no subscription</div>
        </div>
        <div className="spacer" />
        <Link className="eyebrow eyebrow--link" to="/live">
          All channels
          <ArrowRight aria-hidden="true" />
        </Link>
        <div className="row-arrows">
          <button className="arrow" onClick={() => nudge(-1)} aria-label="Scroll channels left">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button className="arrow" onClick={() => nudge(1)} aria-label="Scroll channels right">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="row-track" ref={track}>
        {channels.map((c) => (
          <div className="live-strip-item" key={c.slug}>
            <ChannelTile channel={c} />
          </div>
        ))}
      </div>
    </section>
  );
}
