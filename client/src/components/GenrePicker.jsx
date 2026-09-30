const GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Horror', 'Documentary', 'Reality', 'Crime', 'Animation'];

/** Three-tap genre picker captured at signup; it materially improves the first session. */
export default function GenrePicker({ value = [], onChange, max = 3 }) {
  const selected = value;
  const full = selected.length >= max;

  function toggle(g) {
    let next;
    if (selected.includes(g)) next = selected.filter((x) => x !== g);
    else if (full) return; // cap reached
    else next = [...selected, g];
    onChange(next);
  }

  return (
    <div className="field">
      <label id="genre-label">Genres</label>
      <div className="genre-grid" role="group" aria-labelledby="genre-label">
        {GENRES.map((g) => (
          <button
            type="button"
            key={g}
            className="chip"
            aria-pressed={selected.includes(g)}
            disabled={full && !selected.includes(g)}
            onClick={() => toggle(g)}
          >
            {g}
          </button>
        ))}
      </div>
      <span className="hint">
        {selected.length} of {max} chosen — these drive your first recommendations.
      </span>
    </div>
  );
}
