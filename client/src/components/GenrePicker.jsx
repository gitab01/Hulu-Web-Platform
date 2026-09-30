import { useState } from 'react';

const GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Horror', 'Documentary', 'Reality', 'Crime', 'Animation'];

/** Three-tap genre picker captured at signup; it materially improves the first session. */
export default function GenrePicker({ value = [], onChange, max = 3 }) {
  const selected = value;

  function toggle(g) {
    let next;
    if (selected.includes(g)) next = selected.filter((x) => x !== g);
    else if (selected.length >= max) return; // cap reached
    else next = [...selected, g];
    onChange(next);
  }

  return (
    <div>
      <p className="hint">Pick up to {max} genres to personalize your home screen.</p>
      <div className="genre-grid">
        {GENRES.map((g) => (
          <button
            type="button"
            key={g}
            className="chip"
            aria-pressed={selected.includes(g)}
            disabled={!selected.includes(g) && selected.length >= max}
            onClick={() => toggle(g)}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
