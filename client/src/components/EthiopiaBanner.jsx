import { Link } from 'react-router-dom';
import { CreditCard, Globe, Tv } from 'lucide-react';

/**
 * The advertisement panel. The channel list reaches every country; this panel is the
 * part that says who built it. The artwork is a static asset, so it is the only place
 * on the home page carrying a bitmap rather than typeset key art.
 */
export default function EthiopiaBanner() {
  return (
    <section className="container culture" aria-label="Built in Ethiopia, television from every country">
      <div className="culture-art">
        <img
          src="/ethiopia-tv-radio.png"
          alt="Retro television and a mobile phone, both showing the Ethiopian flag, lettered Ethiopia TV Radio"
          width="492"
          height="482"
          loading="lazy"
        />
        <div className="tibeb-bands" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="culture-copy">
        <span className="eyebrow eyebrow--icon">
          <Globe aria-hidden="true" />
          Ethiopian made · worldwide watching
        </span>
        <h2>
          <Tv className="row-icon" aria-hidden="true" />
          Every country on the dial
        </h2>
        <p className="culture-am am">
          አዲስ ዘመናዊ ኢትዮጵያ — በቀጥታም በጥያቄም
        </p>
        <p>
          The line-up is the planet&apos;s: Ethiopian channels and stations first, then the news from London, the football from
          Madrid, the cinema from Seoul and the series this service produces at home. One signal for all of it, on whatever
          screen is nearest.
        </p>
        <p className="hint">
          The picture above is the brief we build to — the coffee ceremony, Saturday football, the azmari hour. Hospitality
          stays Ethiopian; the channel list goes everywhere.
        </p>
        <div className="action-row">
          <Link to="/live" className="btn btn-primary">
            <Tv aria-hidden="true" />
            Browse live TV worldwide
          </Link>
          <Link to="/subscribe" className="btn">
            <CreditCard aria-hidden="true" />
            See the plans
          </Link>
        </div>
      </div>
    </section>
  );
}
