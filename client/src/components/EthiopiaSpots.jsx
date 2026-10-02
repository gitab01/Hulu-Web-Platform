import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Globe, Pause, Play } from 'lucide-react';

/* Six short spots that introduce the country to a viewer who has never had it
   explained: its calendar, its coffee, its churches, its river, its music and its
   history. Each one carries a single Amharic word as the display type, so the
   language is on screen even when the copy is in English. */
const SPOTS = [
  {
    word: 'ገና',
    title: 'Thirteen months of sunshine',
    body: 'Ethiopia keeps its own calendar — thirteen months, a new year that lands in September, and a day of genna that begins at sunrise with a game of ball played the way it was played centuries ago.',
    cta: { to: '/live', label: 'Watch it live' },
  },
  {
    word: 'ቡና',
    title: 'Coffee begins here',
    body: 'The bean is from Kaffa. The ceremony that surrounds it takes three cups, frankincense and the whole afternoon, and it is still the first thing offered to a guest in almost every house in the country.',
    cta: { to: '/title/the-coffee-ceremony', label: 'The Coffee Ceremony' },
  },
  {
    word: 'ላሊበላ',
    title: 'Eleven churches out of one mountain',
    body: 'Carved down into the living rock rather than built up, at Lalibela, and still walked by pilgrims on foot. Timket and Meskel fill the calendar around them with processions, candles and bonfires.',
    cta: { to: '/title/road-to-lalibela', label: 'Road to Lalibela' },
  },
  {
    word: 'ዓባይ',
    title: 'Where the Nile begins',
    body: 'A spring behind a church wall at Gish Abay becomes Abbay, the Blue Nile, crosses Lake Tana, drops into a gorge and waters half of East Africa on the way north.',
    cta: { to: '/title/abbay', label: 'Abbay' },
  },
  {
    word: 'አዝማሪ',
    title: 'Eighty-plus languages, one soundtrack',
    body: 'An azmari sings whatever the room cannot say. Eskista is danced with the shoulders. Irreecha gives thanks at the water after the rains. The radio line-up on this service plays all of it.',
    cta: { to: '/live', label: 'Open the radio line-up' },
  },
  {
    word: 'ኢትዮጵያ',
    title: 'Its own alphabet, its own time',
    body: 'Ge’ez is written here, Adwa was fought here in 1896, and the country kept its own church, calendar and flags throughout. Morning is counted seven hours later than you were taught.',
    cta: { to: '/subscribe', label: 'See the plans' },
  },
];

const DWELL_MS = 7000;

export default function EthiopiaSpots() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);
  const track = useRef(null);

  // A timed advertisement is a courtesy, not a right: people who ask for less
  // motion, or who are reading, get the static version.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!playing || still) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % SPOTS.length), DWELL_MS);
    return () => clearInterval(t);
  }, [playing, still]);

  const nudge = (dir) => setIndex((i) => (i + dir + SPOTS.length) % SPOTS.length);
  const spot = SPOTS[index];

  return (
    <section
      className="spots"
      aria-label="Ethiopia, in six short spots"
      onPointerEnter={() => setPlaying(false)}
      onPointerLeave={() => setPlaying(true)}
      onFocus={() => setPlaying(false)}
      onBlur={() => setPlaying(true)}
    >
      <div className="container spots-inner">
        <header className="spots-head">
          <span className="eyebrow eyebrow--icon spots-eyebrow">
            <Globe aria-hidden="true" />
            Ethiopia, introduced
          </span>
          <div className="spots-controls">
            <button className="arrow arrow--dark" onClick={() => nudge(-1)} aria-label="Previous spot">
              <ChevronLeft aria-hidden="true" />
            </button>
            <span className="slate spots-index">
              {String(index + 1).padStart(2, '0')} / {String(SPOTS.length).padStart(2, '0')}
            </span>
            <button className="arrow arrow--dark" onClick={() => nudge(1)} aria-label="Next spot">
              <ChevronRight aria-hidden="true" />
            </button>
            <button
              className="arrow arrow--dark"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause the spots' : 'Play the spots'}
              disabled={still}
            >
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
          </div>
        </header>

        <div className="spot-track" ref={track}>
          <article className="spot" key={index}>
            <span className="spot-word am" aria-hidden="true">
              {spot.word}
            </span>
            <h2>{spot.title}</h2>
            <p>{spot.body}</p>
            <div className="spot-actions">
              <Link className="btn btn-spot" to={spot.cta.to}>
                {spot.cta.label}
              </Link>
              <span className="spots-rule" aria-hidden="true">
                <span key={index} className={playing && !still ? 'run' : 'held'} />
              </span>
            </div>
          </article>
        </div>

        <div className="spots-dots" role="group" aria-label="Choose a spot">
          {SPOTS.map((s, i) => (
            <button
              key={s.title}
              className={i === index ? 'dot on' : 'dot'}
              onClick={() => setIndex(i)}
              aria-current={i === index}
              aria-label={`Spot ${i + 1}: ${s.title}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
