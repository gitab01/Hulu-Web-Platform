// Fixed-size placeholder row. Each row loads independently so a slow row never
// blocks the hero, and the reserved height prevents layout shift.
export default function RowSkeleton() {
  return (
    <section className="row container">
      <div className="skel skel-line" style={{ width: 180, height: 20 }} />
      <div className="skel-row" style={{ marginTop: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="skel-card" key={i}>
            <div className="skel skel-poster" />
            <div className="skel skel-line" style={{ width: '70%' }} />
          </div>
        ))}
      </div>
    </section>
  );
}
