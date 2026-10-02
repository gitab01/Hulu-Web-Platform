import { Link } from 'react-router-dom';
import { Clapperboard, Code, CreditCard, Globe, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import Brand from '../components/Brand';
import { brand, contact } from '../brand';

const PILLARS = [
  {
    n: '01',
    icon: KeyRound,
    title: 'Sessions that hold, and expire',
    body: 'Sign-in issues a short-lived access token alongside a refresh token that rotates on every use. Reuse of an old refresh token revokes the family, so a stolen token stops working instead of quietly living in someone\'s browser.',
  },
  {
    n: '02',
    icon: ShieldCheck,
    title: 'Entitlement, twice',
    body: 'A subscription is checked when the playback token is minted and again on every segment request. A signed, short-lived URL points at the media, so a stream cannot be hot-linked once the signature lapses.',
  },
  {
    n: '03',
    icon: Clapperboard,
    title: 'A slate made here',
    body: 'Ethiopian Originals are produced titles: written, named in Amharic and given key art drawn in the browser. They sit at the front of the home page rather than at the bottom of a "regional" filter.',
  },
  {
    n: '04',
    icon: Globe,
    title: 'Television that is already live',
    body: 'Channels are embedded from their broadcasters\' own public streams, with their own logos — the Ethiopian stations first, then the rest of the line-up. Nothing is re-hosted or re-transmitted; the player simply opens the channel where it is published.',
  },
];

export default function About() {
  return (
    <div className="container page">
      <header className="page-head">
        <span className="eyebrow">About us</span>
        <h1>
          {brand.name} {brand.suffix}
        </h1>
        <p className="page-head-am am">{brand.nameLocal} — {brand.sloganLocal}</p>
        <p className="page-lede">
          We are an internet television service: channels from every country, the films and series we produce ourselves, and
          radio that plays where it is made. It is built in Ethiopia, which is why the local line-up gets a shelf of its own
          instead of a regional filter. One subscription, every screen, no aerial.
        </p>
        <p className="page-lede page-lede-am am">{brand.taglineLocal}</p>
      </header>

      <section className="page-section">
        <h2>What we are building</h2>
        <p>
          Most streaming products in this market are a website wrapped around somebody else&apos;s player. {brand.name}{' '}
          {brand.suffix} is the whole stack: an API that decides who may watch, a media layer that hands out signed playback
          URLs, a client that renders the catalogue, and a recommender that learns from what was actually watched rather than
          what was clicked.
        </p>
        <p>
          The service is deliberately honest about what it holds. Titles outside the local slate carry real metadata imported
          from The Movie Database at seed time, and the footage behind them is public-domain stand-in video, because no
          licensed streams were acquired. That distinction is written into the footer of every page rather than hidden in a
          footnote.
        </p>
      </section>

      <section className="page-section">
        <h2>How it works</h2>
        <div className="pillar-grid">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <article className="pillar" key={p.n}>
                <div className="pillar-head">
                  <Icon className="pillar-icon" aria-hidden="true" />
                  <span className="pillar-n">{p.n}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section">
        <h2>The stack</h2>
        <ul className="spec-list">
          <li>
            <b>Client</b>
            <span>React · Vite · React Router — one SPA, player bundle split so the browse experience stays light.</span>
          </li>
          <li>
            <b>API</b>
            <span>Node · Express · Mongoose — Mongoose models for titles, channels, users, sessions and watch history.</span>
          </li>
          <li>
            <b>Data</b>
            <span>MongoDB Atlas, with a server-composed row cache so the home page is one round trip.</span>
          </li>
          <li>
            <b>Money</b>
            <span>Stripe Checkout and webhooks, with a mock gateway so the flow can be demonstrated without keys.</span>
          </li>
          <li>
            <b>Catalogue</b>
            <span>The Movie Database API for international metadata, imported at seed time.</span>
          </li>
          <li>
            <b>Hosting</b>
            <span>Vercel for the client, Render for the API and the nightly recommendation job.</span>
          </li>
        </ul>
      </section>

      <section className="page-section">
        <h2>Who built it</h2>
        <div className="byline">
          <Brand size="foot" />
          <div>
            <p>
              <b>{contact.developer}</b> — {contact.role}. {contact.location}.
            </p>
            <p className="hint">
              Design, API, client, seeding and deployment. Questions about the build, the catalogue or a partnership are
              answered personally.
            </p>
          </div>
        </div>
        <div className="action-row">
          <Link to="/contact" className="btn btn-primary">
            <Mail aria-hidden="true" />
            Contact us
          </Link>
          <a href={contact.repo} className="btn" rel="noreferrer" target="_blank">
            <Code aria-hidden="true" />
            Source code
          </a>
          <Link to="/subscribe" className="btn">
            <CreditCard aria-hidden="true" />
            See the plans
          </Link>
        </div>
      </section>
    </div>
  );
}
