import { Link } from 'react-router-dom';
import { Mail, Phone, Send } from 'lucide-react';
import Brand from './Brand';
import { brand, contact, telegramUrl } from '../brand';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="container foot-top">
        <div className="foot-brand">
          <Brand size="foot" />
          <span className="foot-brand-local am">{brand.nameLocal}</span>
          <div className="tibeb-bands" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="foot-slogan">{brand.slogan}</p>
          <p className="foot-slogan am">{brand.sloganLocal}</p>
          <p className="foot-tagline">
            {brand.tagline} <span className="am">{brand.taglineLocal}</span>
          </p>
          <ul className="foot-contact">
            <li>
              <Mail aria-hidden="true" />
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
            <li>
              <Phone aria-hidden="true" />
              <a href={`tel:${contact.phone}`}>{contact.phonePretty}</a>
            </li>
            <li>
              <Send aria-hidden="true" />
              <a href={telegramUrl} rel="noreferrer" target="_blank">
                Telegram {`@${contact.telegram}`}
              </a>
            </li>
          </ul>
        </div>

        <div className="foot-cols">
          <div className="foot-col">
            <span className="eyebrow">Watch</span>
            <ul>
              <li>
                <Link to="/">Front page</Link>
              </li>
              <li>
                <Link to="/live">Live TV</Link>
              </li>
              <li>
                <Link to="/search">Search</Link>
              </li>
              <li>
                <Link to="/subscribe">Plans</Link>
              </li>
              <li>
                <Link to="/account">Account</Link>
              </li>
            </ul>
          </div>

          <div className="foot-col">
            <span className="eyebrow">Company</span>
            <ul>
              <li>
                <Link to="/about">About us</Link>
              </li>
              <li>
                <Link to="/contact">Contact us</Link>
              </li>
              <li>
                <Link to="/signup">Create an account</Link>
              </li>
              <li>
                <a href={contact.repo} rel="noreferrer" target="_blank">
                  Source code
                </a>
              </li>
            </ul>
          </div>

          <div className="foot-col foot-col--wide">
            <span className="eyebrow">Built with</span>
            <p className="slate">
              React · Vite · React Router · Node · Express · Mongoose · MongoDB Atlas · Stripe · TMDB
            </p>
            <p className="hint">
              A full-stack streaming platform: JWT sessions with rotating refresh tokens, entitlement checked at token issue and
              again on every segment, signed playback URLs, and hybrid recommendations computed from watch history.
            </p>
          </div>
        </div>
      </div>

      <div className="container foot-bar">
        <span className="slate">
          © {year} {brand.name} {brand.suffix} · {brand.tagline}
        </span>
        <p className="slate foot-legal">
          Ethiopian originals are invented titles whose key art is drawn in the browser, and the stills in the front-page
          introduction are supplied photographs of the country rather than frames from anything we stream; everything else is
          real metadata imported from The Movie Database at seed time. Live channels embed each broadcaster&apos;s own public
          stream, and the video here is public-domain stand-in footage because the catalogue carries no licensed streams. This
          product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  );
}
