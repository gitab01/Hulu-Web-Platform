export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div>
          <strong>Streamline</strong> — a full-stack streaming platform built for the portfolio case study.
        </div>
        <div style={{ marginTop: 8 }}>
          Auth (JWT + rotating refresh), entitlement middleware, signed playback URLs, hybrid recommendations, Stripe/mock billing. React · Node · Express · MongoDB.
        </div>
        <div style={{ marginTop: 8 }}>
          All titles, artwork and content are fictional and original. Media previews are public-domain sample clips.
        </div>
      </div>
    </footer>
  );
}
