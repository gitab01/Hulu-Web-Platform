'use strict';

/**
 * Ethiopian platform originals — the local slate the service produces itself.
 *
 * These are invented titles, not real films, so they carry no licensing story,
 * but they are seeded on BOTH catalogue paths: a TMDB import brings in the
 * licensed international catalogue and never replaces the originals, exactly the
 * way a real service's local productions sit above its acquired library.
 *
 * `nameLocal` is the Amharic title and `motif` picks the key art drawn for it in
 * the client (see client/src/components/EthiopianCover.jsx). Both are display
 * fields: the artwork is typeset, so nothing here depends on an image host or an
 * API key, and a fresh clone still opens on Ethiopian content.
 *
 * `mediaName` is resolved to a real URL by the seed script, which owns the
 * public-domain stand-in footage.
 */
const ETHIOPIAN_ORIGINALS = [
  {
    slug: 'the-coffee-ceremony',
    name: 'The Coffee Ceremony',
    nameLocal: 'ቡና ሥርዓት',
    type: 'series',
    origin: 'Ethiopia',
    motif: 'coffee',
    genres: ['Comedy', 'Drama'],
    year: 2024,
    maturity: 'TV-14',
    synopsis:
      'Three generations of women run a coffee house below the Kaffa hillside where the bean was first roasted, and every rumour in the district is poured and argued over before the third cup.',
    seasons: [
      {
        season: 1,
        year: 2024,
        episodes: [
          { number: 1, title: 'Abol — the First Cup', synopsis: 'The grandmother announces she is handing the roasting pan to someone.', durationSec: 240, mediaName: 'ForBiggerMeltdowns.mp4' },
          { number: 2, title: 'Tona — the Second Cup', synopsis: 'A rival coffee house opens across the road and starts giving credit.', durationSec: 235, mediaName: 'SubaruOutbackOnStreetAndDirt.mp4' },
          { number: 3, title: 'Baraka — the Third Cup', synopsis: 'The blessing is said over a debt nobody planned to mention.', durationSec: 255, mediaName: 'WeAreGoingOnBullrun.mp4' },
        ],
      },
    ],
  },
  {
    slug: 'azmari',
    name: 'Azmari',
    nameLocal: 'አዝማሪ',
    type: 'series',
    origin: 'Ethiopia',
    motif: 'sound',
    genres: ['Drama', 'Music'],
    year: 2025,
    maturity: 'TV-14',
    synopsis:
      'A lyrist and a masinko player travel the highroad from Debre Markos to Dessie, paid in teff and tips, singing whatever the room cannot say for itself.',
    seasons: [
      {
        season: 1,
        year: 2025,
        episodes: [
          { number: 1, title: 'The Lyre', synopsis: 'One string breaks, and the whole town leans in to hear the rest.', durationSec: 220, mediaName: 'ForBiggerBlazes.mp4' },
          { number: 2, title: 'Tizita', synopsis: 'A song about homecoming becomes a request nobody expected.', durationSec: 230, mediaName: 'ForBiggerEscapes.mp4' },
          { number: 3, title: 'The Contract', synopsis: 'A record man arrives in good shoes and leaves with the master.', durationSec: 245, mediaName: 'ForBiggerFun.mp4' },
        ],
      },
    ],
  },
  {
    slug: 'timket',
    name: 'Timket',
    nameLocal: 'ጥምቀት',
    type: 'movie',
    origin: 'Ethiopia',
    motif: 'light',
    genres: ['Documentary'],
    year: 2024,
    maturity: 'TV-PG',
    synopsis:
      'Epiphany week in Gondar: the tabot leaves the church, the crowd moves to the water, and two days of processions end in a blessing taken home by everyone watching.',
    seasons: [
      {
        season: 1,
        year: 2024,
        episodes: [
          { number: 1, title: 'Feature', synopsis: 'The procession, the vigil and the morning the water is shared.', durationSec: 880, mediaName: 'ElephantsDream.mp4' },
        ],
      },
    ],
  },
  {
    slug: 'demera',
    name: 'Demera',
    nameLocal: 'ደመራ',
    type: 'movie',
    origin: 'Ethiopia',
    motif: 'bonfire',
    genres: ['Drama', 'Thriller'],
    year: 2024,
    maturity: 'R',
    synopsis:
      'On the night of the Meskel bonfire in a ridge-side market town, a wedding photographer sees a second fire lit from the wrong end — and sees someone notice her seeing it.',
    seasons: [
      {
        season: 1,
        year: 2024,
        episodes: [
          { number: 1, title: 'Feature', synopsis: 'The photographs are developed twice; the answers change.', durationSec: 840, mediaName: 'TearsOfSteel.mp4' },
        ],
      },
    ],
  },
  {
    slug: 'eskista',
    name: 'Eskista',
    nameLocal: 'እንቁልጥል',
    type: 'series',
    origin: 'Ethiopia',
    motif: 'drum',
    genres: ['Drama', 'Music'],
    year: 2025,
    maturity: 'TV-14',
    synopsis:
      'A kebero drummer and a shoulder dancer keep a festival circuit alive between the Gurage highlands and the lakes, teaching the choreography to a generation that films it instead.',
    seasons: [
      {
        season: 1,
        year: 2025,
        episodes: [
          { number: 1, title: 'The Shoulder', synopsis: 'A step older than any of them, taught in one afternoon.', durationSec: 235, mediaName: 'ForBiggerJoyrides.mp4' },
          { number: 2, title: 'Kebero', synopsis: 'The drum is repaired with a strap nobody admits keeping.', durationSec: 245, mediaName: 'VolkswagenGTIReview.mp4' },
          { number: 3, title: 'The Floor', synopsis: 'A competition night turns into a lesson in who really leads.', durationSec: 255, mediaName: 'WhatCarCanYouGetForAGrand.mp4' },
        ],
      },
    ],
  },
  {
    slug: 'irreecha',
    name: 'Irreecha',
    nameLocal: 'ለገባ',
    type: 'movie',
    origin: 'Ethiopia',
    motif: 'lake',
    genres: ['Documentary'],
    year: 2025,
    maturity: 'TV-PG',
    synopsis:
      'The thanksgiving at the water after the rains: a million people walk to the lake edge with last year’s grass in their hands, and the year ahead is asked for out loud.',
    seasons: [
      {
        season: 1,
        year: 2025,
        episodes: [
          { number: 1, title: 'Feature', synopsis: 'Dawn at the shore, the blessing of the grass, the road home.', durationSec: 820, mediaName: 'BigBuckBunny.mp4' },
        ],
      },
    ],
  },
  {
    slug: 'road-to-lalibela',
    name: 'Road to Lalibela',
    nameLocal: 'ወደ ላሊበላ',
    type: 'movie',
    origin: 'Ethiopia',
    motif: 'mountains',
    genres: ['Documentary', 'Drama'],
    year: 2023,
    maturity: 'TV-PG',
    synopsis:
      'Eleven hours of road to the rock-hewn churches, four generations in one cab, and a Land Cruiser that stops believing in itself somewhere past the Pencil trees of Dessie.',
    seasons: [
      {
        season: 1,
        year: 2023,
        episodes: [
          { number: 1, title: 'Feature', synopsis: 'The pilgrims climb at first light and the whole mountain sings.', durationSec: 900, mediaName: 'Sintel.mp4' },
        ],
      },
    ],
  },
  {
    slug: 'abbay',
    name: 'Abbay',
    nameLocal: 'ዓባይ',
    type: 'series',
    origin: 'Ethiopia',
    motif: 'river',
    genres: ['Documentary'],
    year: 2025,
    maturity: 'TV-PG',
    synopsis:
      'The Blue Nile from the spring at Gish Abay, out of Lake Tana, down the gorge and on to the reservoir — and the argument about who a river belongs to.',
    seasons: [
      {
        season: 1,
        year: 2025,
        episodes: [
          { number: 1, title: 'The Spring', synopsis: 'A pool behind a church wall that becomes a sea in Sudan.', durationSec: 250, mediaName: 'ForBiggerMeltdowns.mp4' },
          { number: 2, title: 'The Gorge', synopsis: 'Farmers, ferryman and the bridge that joined two provinces.', durationSec: 260, mediaName: 'VolkswagenGTIReview.mp4' },
          { number: 3, title: 'The Reservoir', synopsis: 'Water level, turbines and a town moved stone by stone.', durationSec: 265, mediaName: 'WhatCarCanYouGetForAGrand.mp4' },
        ],
      },
    ],
  },
];

module.exports = { ETHIOPIAN_ORIGINALS };
