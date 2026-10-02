import { Link } from 'react-router-dom';
import { Code, House, Mail, MessageCircle, Phone, Send, Tv } from 'lucide-react';
import { brand, contact, telegramUrl, waUrl } from '../brand';

const CHANNELS = [
  {
    label: 'Email',
    icon: Mail,
    value: contact.email,
    href: `mailto:${contact.email}`,
    note: 'Best for bug reports, feature requests and anything that needs a screenshot.',
  },
  {
    label: 'Phone',
    icon: Phone,
    value: contact.phonePretty,
    href: `tel:${contact.phone}`,
    note: 'Weekdays, 9:00–18:00 East Africa Time (UTC+3).',
  },
  {
    label: 'Telegram',
    icon: Send,
    value: `@${contact.telegram}`,
    href: telegramUrl,
    external: true,
    note: 'Fastest reply — send the message in Amharic or English, either is fine.',
  },
  {
    label: 'WhatsApp',
    icon: MessageCircle,
    value: contact.phonePretty,
    href: waUrl,
    external: true,
    note: 'Same number; useful for voice notes and payment questions.',
  },
  {
    label: 'GitHub',
    icon: Code,
    value: 'gitab01',
    href: contact.repo,
    external: true,
    note: 'Issues and pull requests on the platform itself are welcome.',
  },
];

export default function Contact() {
  return (
    <div className="container page">
      <header className="page-head">
        <span className="eyebrow">Contact us</span>
        <h1>Talk to the developer</h1>
        <p className="page-head-am am">ያግኙን — {brand.sloganLocal}</p>
        <p className="page-lede">
          {brand.name} {brand.suffix} is built and maintained by one person, so every message reaches the person who wrote the
          code. There is no ticket queue and no support form: pick whichever channel is easiest for you.
        </p>
      </header>

      <div className="contact-grid">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <a
              className="contact-card"
              key={c.label}
              href={c.href}
              {...(c.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <span className="contact-card-head">
                <Icon className="contact-icon" aria-hidden="true" />
                <span className="eyebrow">{c.label}</span>
              </span>
              <b>{c.value}</b>
              <span className="hint">{c.note}</span>
            </a>
          );
        })}
      </div>

      <section className="page-section">
        <h2>Before you write</h2>
        <ul className="spec-list">
          <li>
            <b>Sign-in or payment trouble</b>
            <span>Send the account email and the time it happened. Never send a password or a card number — they are never needed, and they cannot be looked up here.</span>
          </li>
          <li>
            <b>A channel that will not play</b>
            <span>Name the broadcaster and the device. Live feeds are published by the broadcasters themselves, so an outage on their side is usually fixed by a relaunch rather than a code change.</span>
          </li>
          <li>
            <b>Licensing and content</b>
            <span>The Ethiopian slate is original; other titles carry The Movie Database metadata with stand-in footage. Rights conversations start from that baseline.</span>
          </li>
        </ul>
      </section>

      <section className="page-section">
        <div className="byline">
          <div>
            <p>
              <b>{contact.developer}</b>
            </p>
            <p className="hint">
              {contact.role} · {contact.location}
            </p>
          </div>
        </div>
        <div className="action-row">
          <Link to="/about" className="btn">
            About the platform
          </Link>
          <Link to="/live" className="btn">
            <Tv aria-hidden="true" />
            Browse live TV
          </Link>
          <Link to="/" className="btn btn-primary">
            <House aria-hidden="true" />
            Front page
          </Link>
        </div>
      </section>
    </div>
  );
}
