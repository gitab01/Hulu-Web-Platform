import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TitleCard from './TitleCard';

/** What each server-composed row actually contains, said in the viewer's words. */
const NOTES = {
  continue_watching: 'Picks up where you stopped',
  trending: 'Most watched this week',
  because_you_watched: 'Titles viewers of your history also finished',
  for_you: 'Chosen from the genres you picked',
  new_releases: 'Most recent additions',
  similar: 'Finished by viewers of this title',
  ethiopian_originals: 'Made here — the slate we produce ourselves',
};

export default function Row({ row }) {
  if (!row.items?.length) return null; // empty personalized rows are hidden, not shown blank
  const track = useRef(null);

  const nudge = (dir) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="row container">
      <div className="row-head">
        <div>
          <h2>
            {row.title}
            {row.titleLocal && <span className="row-local">{row.titleLocal}</span>}
          </h2>
          {NOTES[row.key] && <div className="note">{NOTES[row.key]}</div>}
        </div>
        <div className="spacer" />
        <span className="eyebrow">{String(row.items.length).padStart(2, '0')} titles</span>
        <div className="row-arrows">
          <button className="arrow" onClick={() => nudge(-1)} aria-label={`Scroll ${row.title} left`}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button className="arrow" onClick={() => nudge(1)} aria-label={`Scroll ${row.title} right`}>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="row-track" ref={track}>
        {row.items.map((item) => (
          <TitleCard key={item.id + (item.progress?.episodeId || '')} item={item} />
        ))}
      </div>
    </section>
  );
}
