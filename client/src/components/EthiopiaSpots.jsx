import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/* Short spots that introduce the country to a viewer who has never had it
   explained, one photograph each, named for what the photographs show: the stelae
   at Aksum, pilgrims walking to Irreecha, the Meskel bonfire, Lalibela by
   candlelight, the coffee ceremony, a walia ibex in the Simien, Dallol, a dance in
   the south, feast baskets, Al-Nejashi outside Aksum, and riders at a feast. Each
   carries an Amharic word as the display type, so the language is on screen even
   when the copy is in English.

   No controls, no counter, no progress bar: a spot does not ask to be driven. It
   runs and the next one arrives. Anyone who asks for less motion gets the whole
   reel as a still list, which is also how they see all of it if they want to.

   The stills live in client/public/ads and are shown at their own size — the frame
   letterboxes rather than crops, so nobody's face is cut out of a photograph to
   fit an aspect ratio. */
const SPOTS = [
  {
    word: 'ኢትዮጵያ',
    title: 'Its own alphabet, its own time',
    body: 'The stelae at Aksum stood here before Rome had an empire, and Ge’ez — the language carved beside them — is still the liturgical tongue of the churches. The country kept its own calendar, its own clock and its own flags, and fought the battle of Adwa in 1896 on its own ground.',
    img: '/ads/aksum-stelae.jpg',
    alt: 'Granite stelae rising from the excavated stelae field at Aksum under a blue sky.',
    cta: { to: '/subscribe', label: 'See the plans' },
  },
  {
    word: 'ኢሬቻ',
    title: 'Thanks given at the water',
    body: 'Irreecha is the Oromo thanksgiving at the end of the rains, when hundreds of thousands come to the lakes near Bishoftu in white cotton, grass in their hands, giving thanks for the year and for the rain that has lifted. Most of the way there is walked.',
    img: '/ads/irreecha-procession.jpg',
    alt: 'Men in white cotton shamma with striped hems walk in a line across a hillside carrying staffs.',
    cta: { to: '/title/irreecha', label: 'Watch Irreecha' },
  },
  {
    word: 'መስቀል',
    title: 'A bonfire ends the rains',
    body: 'Meskel lights a pyre called demera on the Saturday of Meskel, in memory of the finding of the True Cross. The square fills, the fire is lit from one side by the patriarch, and the yellow meskel daisy that came up with the rain is in every hand.',
    img: '/ads/meskel-bonfire.jpg',
    alt: 'A large bonfire burning in a ring on a crowded square at night, ringed by thousands of candles.',
    cta: { to: '/title/demera', label: 'Watch Demera' },
  },
  {
    word: 'ላሊበላ',
    title: 'Eleven churches out of one mountain',
    body: 'At Lalibela the churches were not built up but carved down into the living rock in the twelfth and thirteenth centuries, and pilgrims still walk them at Genna and Timket with candles and psalms, which is why the town is called the New Jerusalem.',
    img: '/ads/lalibela-candles.jpg',
    alt: 'Pilgrims holding candles crowd around a rock-hewn church at Lalibela in the dark.',
    cta: { to: '/title/road-to-lalibela', label: 'Road to Lalibela' },
  },
  {
    word: 'ቡና',
    title: 'Coffee begins here',
    body: 'The bean is from Kaffa, and the ceremony around it is older than the export trade: green beans roasted in front of the guest, ground by hand, poured from a jebena into tiny cups, three rounds — abol, tona, baraka — with frankincense and the whole afternoon.',
    img: '/ads/coffee-ceremony.jpg',
    alt: 'Coffee poured from a black jebena pot into a row of small cups, with roasted beans and smoke.',
    cta: { to: '/title/the-coffee-ceremony', label: 'The Coffee Ceremony' },
  },
  {
    word: 'ዋልያ',
    title: 'The roof of Africa',
    body: 'The walia ibex in this photograph, with the scimitar horns, lives on the Simien escarpment and nowhere else on earth, along with the gelada and the lammergeier. The rains that fall on that massif feed the spring at Gish Abay that becomes Abbay, the Blue Nile, on its way north.',
    img: '/ads/simien-walia.jpg',
    alt: 'A walia ibex with long curved horns standing on a grassy ridge above the Simien escarpment.',
    cta: { to: '/title/abbay', label: 'Watch Abbay' },
  },
  {
    word: 'አፋር',
    title: 'Below the sea, in colour',
    body: 'The Afar depression lies more than a hundred metres below sea level, and Dallol at its northern end is the hottest inhabited place on earth: sulphur springs in acid pools, salt flats the colour of egg yolk, and the caravan route that still cuts blocks of salt by hand.',
    img: '/ads/dallol-springs.jpg',
    alt: 'A couple in traditional Afar dress sitting beside the yellow and orange sulphur terraces at Dallol.',
    cta: { to: '/live', label: 'Open the line-up' },
  },
  {
    word: 'ቋንቋ',
    title: 'Eighty-plus languages, one soundtrack',
    body: 'Amharic, Tigrinya, Afaan Oromo and Somali are working languages and Ethnologue counts more than eighty in all. An azmari sings whatever the room cannot say, eskista is danced with the shoulders, and the southern valleys dance with the hair.',
    img: '/ads/southern-dance.jpg',
    alt: 'Women of the southern nations dancing in beaded dress, their hair wound in ochre strands.',
    cta: { to: '/title/azmari', label: 'Watch Azmari' },
  },
  {
    word: 'በዓል',
    title: 'A basket for the feast',
    body: 'The flat woven platters are made for the days everybody sits down together: coils of dyed grass worked into radiating panels, carrying the meskel daisies at the end of the rains and then the popcorn and the beans at the coffee. The pattern is the family’s and the basket outlives the feast.',
    img: '/ads/feast-baskets.jpg',
    alt: 'Flat round baskets woven in radiating panels of colour, seen from above.',
    cta: { to: '/subscribe', label: 'See the plans' },
  },
  {
    word: 'አክሱም',
    title: 'The first hijra came here',
    body: 'Al-Nejashi stands in the plain outside Aksum over the graves of two of the companions who crossed the sea from Mecca in 615, when the Aksumite king gave the first Muslims refuge instead of handing them back. The mosque has been rebuilt on that ground ever since.',
    img: '/ads/al-nejashi.jpg',
    alt: 'White walls and two green domes of the Al-Nejashi mosque on the plain outside Aksum.',
    cta: { to: '/live', label: 'See what is on now' },
  },
  {
    word: 'ፈረስ',
    title: 'The oldest way to a feast',
    body: 'Where the road gives out, the procession still arrives on horseback: embroidered cotton, fur, spears, and horses trapped in red and green. Riders have come to the great feasts this way for as long as there have been feasts to come to.',
    img: '/ads/festival-horsemen.jpg',
    alt: 'Riders in fur and embroidered white robes on decorated horses, moving through a crowd.',
    cta: { to: '/subscribe', label: 'See the plans' },
  },
];

/* Eleven spots in half a minute: the reel lasts about as long as an ad break and
   comes round again the same way. */
const DWELL_MS = 2700;

export default function EthiopiaSpots() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!playing || still) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % SPOTS.length), DWELL_MS);
    return () => clearInterval(t);
  }, [playing, still]);

  return (
    <section
      className="spots"
      aria-label="Ethiopia, in short spots"
      onPointerEnter={() => setPlaying(false)}
      onPointerLeave={() => setPlaying(true)}
      onFocus={() => setPlaying(false)}
      onBlur={() => setPlaying(true)}
    >
      <div className="container">
        <span className="eyebrow spots-eyebrow">
          <span className="flagline" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          Ethiopian original
        </span>

        <div className="spots-viewport">
          <div
            className="spot-track"
            data-still={still || undefined}
            style={{ transform: still ? undefined : `translateX(-${index * 100}%)` }}
          >
            {SPOTS.map((s, i) => {
              const on = !still && i === index;
              return (
                <article className="spot" key={s.title} aria-hidden={!still && i !== index} data-active={on || undefined}>
                  <figure className="spot-media">
                    <img
                      src={still || Math.abs(i - index) <= 1 ? s.img : undefined}
                      alt={s.alt}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    <span className="tibeb-bands" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </figure>
                  <div className="spot-copy">
                    <span className="spot-word am" aria-hidden="true">
                      {s.word}
                    </span>
                    <h2>{s.title}</h2>
                    <p>{s.body}</p>
                    <Link className="btn btn-spot" to={s.cta.to} tabIndex={on || still ? 0 : -1}>
                      {s.cta.label}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
