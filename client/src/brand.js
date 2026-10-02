/* Single source of truth for the brand: the wordmark, the bilingual slogans and the
   developer contact details live here so the navbar, footer, About and Contact pages
   can never drift apart. */

export const brand = {
  name: 'Streamline',
  suffix: 'IPTV',
  /* ስትሪምላይን — the wordmark read in Ge'ez script. */
  nameLocal: 'ስትሪምላይን',
  slogan: 'Television from every country — live, and on demand.',
  /* "Television from every country, live and on demand." */
  sloganLocal: 'ቴሌቪዥን ከሁሉም አገር፣ በቀጥታም በጥያቄም።',
  tagline: 'Built in Ethiopia, for viewers everywhere.',
  /* "Made in Ethiopia · for everyone." */
  taglineLocal: 'በኢትዮጵያ የተሠራ · ለሁሉም።',
};

export const contact = {
  developer: 'Abel Assefa',
  role: 'Sole developer — design, API, client and deployment',
  email: 'abelink2119@gmail.com',
  phone: '+251948102787',
  phonePretty: '+251 94 810 2787',
  telegram: 'aaaio01',
  location: 'Addis Ababa, Ethiopia',
  github: 'https://github.com/gitab01',
  repo: 'https://github.com/gitab01/Hulu-Web-Platform',
};

export const telegramUrl = `https://t.me/${contact.telegram}`;
export const waUrl = `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`;
