import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* Short spots that introduce the country to a viewer who has never had it
   explained, one photograph each, named for what the photographs show. The reel
   opens in the Afar depression — Dinkinesh in her museum case, the lava lake of
   Erta Ale, the salt caravan still walking out — and then works forward in time:
   the stelae at Aksum, the Addis Ababa skyline at dusk, pilgrims walking to
   Irreecha, the Meskel bonfire, girls keeping Ashenda, Lalibela by candlelight,
   the coffee ceremony and the cherry it starts from, a walia ibex in the Simien,
   Dallol, the Anwar Mosque in Addis, a dance in the south, feast baskets,
   Al-Nejashi outside Aksum, and riders at a feast. Each carries an Amharic word as
   the display type, so the language is on screen even when the copy is English.

   No controls, no counter, no progress bar: a spot does not ask to be driven. It
   runs and the next one arrives. Anyone who asks for less motion gets the whole
   reel as a still list, which is also how they see all of it if they want to.

   The stills live in client/public/ads and are shown at their own size — the frame
   letterboxes rather than crops, so nobody's face is cut out of a photograph to
   fit an aspect ratio. */
const SPOTS = [
  {
    word: 'ድንቅ ነሽ',
    title: 'Three million years, in one case',
    body: 'In 1974 a team working in the Afar found about forty per cent of the skeleton of a woman who walked upright three million two hundred thousand years ago — the most complete of her kind ever found, and the oldest on this list. The museums call her Lucy; here her own name is Dinkinesh, “you are wonderful”.',
    img: '/ads/lucy-national-museum.jpg',
    alt: 'The bones of an early human skeleton laid out in the order of the body inside a long glass museum case, with information cards at either end.',
    cta: { to: '/subscribe', label: 'See the plans' },
  },
  {
    word: 'ኤርታ ዓሌ',
    title: 'A lake of fire that never goes out',
    body: 'Erta Ale is a shield volcano in the Danakil with a pool of molten rock at the top of it that has been open, almost without stopping, since at least 1906 — one of only a handful like it on earth. The Afar name means the smoking mountain, and the crust on the lake breaks and re-forms in minutes while the rock underneath glows.',
    img: '/ads/erta-ale-lava-lake.jpg',
    alt: 'A crater at dusk with a lake of molten rock at its centre, red cracks running through the dark crust above it.',
    cta: { to: '/live', label: 'Open the line-up' },
  },
  {
    word: 'አሞሌ',
    title: 'The salt still walks out by camel',
    body: 'Blocks of salt are still cut by hand from the Danakil flats, squared at the far end so they can be thrown over a camel’s back, and the train of thirty or forty animals walks out to the markets of Tigray and Wollo the way it has for centuries. Amharic has a proverb for it — even luck carries amole by caravan.',
    img: '/ads/afar-salt-caravan.jpg',
    alt: 'A line of laden camels walking across a wet salt flat under a clear blue sky, a man in white walking at the head of the train.',
    cta: { to: '/search', label: 'Browse the catalogue' },
  },
  {
    word: 'ኢትዮጵያ',
    title: 'Its own alphabet, its own time',
    body: 'The stelae at Aksum stood here before Rome had an empire, and Ge’ez — the language carved beside them — is still the liturgical tongue of the churches. The country kept its own calendar, its own clock and its own flags, and fought the battle of Adwa in 1896 on its own ground.',
    img: '/ads/aksum-stelae.jpg',
    alt: 'Granite stelae rising from the excavated stelae field at Aksum under a blue sky.',
    cta: { to: '/subscribe', label: 'See the plans' },
  },
  {
    word: 'አዲስ አበባ',
    title: 'A capital at two thousand metres',
    body: 'Empress Taytu built the first house here at the foot of Entoto in 1886 and Addis Ababa has been the capital ever since — eucalyptus in the avenues, market gardens in the middle of a city of millions, and a core of new towers that lights up in the national colours after sunset. The African Union sits on top of the hill, so the continent’s business is done here too.',
    img: '/ads/addis-ababa-skyline.jpg',
    alt: 'The Addis Ababa skyline at sunset, the tallest tower in the foreground lit in bands of green, gold and red.',
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
    word: 'አሸንዳ',
    title: 'A season kept by the girls',
    body: 'Ashenda belongs to the girls and young women of Gondar and Tigray and comes round in August, after the Fast of Filseta. They dress in white cotton with tilfi embroidery, carry the ashenda grass the season is named for, and go along the streets singing in groups with a drum between them — what they are given at the doors is given away again.',
    img: '/ads/ashenda-dancers.jpg',
    alt: 'Young women in white cotton with embroidered aprons singing and dancing along a street, a drum carried between them.',
    cta: { to: '/search', label: 'Browse the catalogue' },
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
    body: 'The ceremony around the bean is older than the export trade: green beans roasted in front of the guest, ground by hand on a mortar, poured from a jebena into tiny cups, three rounds — abol, tona, baraka — with frankincense and the whole afternoon.',
    img: '/ads/coffee-ceremony.jpg',
    alt: 'Coffee poured from a black jebena pot into a row of small cups, with roasted beans and smoke.',
    cta: { to: '/title/the-coffee-ceremony', label: 'The Coffee Ceremony' },
  },
  {
    word: 'የቡና ፍሬ',
    title: 'The bean is the seed of a red berry',
    body: 'What gets roasted is a seed, and the seed is inside a berry about the size of a large olive. Coffee grows wild in the south-western highlands — Kaffa, which gave the bean its name — and every cultivated plant in the world traces back to seed carried out of them. The cherry ripens unevenly along the branch, so a tree is gone over by hand again and again and only the red fruit is taken; it is dried whole or pulped and then dried, and the pale green bean inside is what the roaster works.',
    img: '/ads/coffee-cherries.jpg',
    alt: 'A smiling coffee farmer behind a woven basket full of ripe red coffee cherries, a bearing branch beside him.',
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
    body: 'The Afar depression lies more than a hundred metres below sea level, and Dallol at its northern end is the hottest inhabited place on earth: sulphur springs in acid pools, salt flats the colour of egg yolk, and a yellow that is the ground itself, not the light.',
    img: '/ads/dallol-springs.jpg',
    alt: 'A couple in traditional Afar dress sitting beside the yellow and orange sulphur terraces at Dallol.',
    cta: { to: '/live', label: 'Open the line-up' },
  },
  {
    word: 'መስጊድ',
    title: 'Anwar Mosque, in the capital',
    body: 'Ethiopia has been Muslim since 615, when the Aksumite king gave the first followers of the Prophet refuge rather than handing them back to Mecca, and today a third of the country prays five times a day. The Anwar Mosque in Addis Ababa is one of the capital’s great ones: white arcades, green domes, and a courtyard that fills for Eid.',
    img: '/ads/anwar-mosque-addis.jpg',
    alt: 'Men resting in the shade of a tree in front of a white mosque with green domes and a minaret, the courtyard crowded behind them.',
    cta: { to: '/live', label: 'See what is on now' },
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

/* Eighteen spots at a little over a second each: the reel runs about as long as an
   ad break, never ends, and comes back to the first one the way it came. */
const DWELL_MS = 1300;

export default function EthiopiaSpots() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);
  const [noAnim, setNoAnim] = useState(false);
  const at = useRef(0);

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
    const t = setInterval(() => {
      const next = (at.current + 1) % SPOTS.length;
      const wrapping = next === 0;
      // The last spot hands back to the first without sliding seventeen places
      // backwards: the jump is painted with the transition off, then it returns.
      if (wrapping) setNoAnim(true);
      at.current = next;
      setIndex(next);
      if (wrapping) {
        requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
      }
    }, DWELL_MS);
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
            style={{
              transform: still ? undefined : `translateX(-${index * 100}%)`,
              transitionDuration: noAnim && !still ? '0ms' : undefined,
            }}
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
