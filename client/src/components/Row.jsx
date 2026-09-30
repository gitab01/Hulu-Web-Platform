import TitleCard from './TitleCard';

export default function Row({ row }) {
  if (!row.items?.length) return null; // empty personalized rows are hidden, not shown blank
  return (
    <section className="row container">
      <h2>{row.title}</h2>
      <div className="row-track">
        {row.items.map((item) => (
          <TitleCard key={item.id + (item.progress?.episodeId || '')} item={item} />
        ))}
      </div>
    </section>
  );
}
