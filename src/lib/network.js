/**
 * The sites on this team, in one list.
 *
 * The network strip (the 36px line above the header, NetworkStrip.astro) shows the
 * four with `strip: true`. The footer's "Also from this team" line (AlsoFromTeam.astro)
 * shows all five. `label` is the short name for the strip; `name` is the full name for
 * the footer. `short`, where present, is what the strip shows below 480px: with it, all
 * four sites fit on one row at 375px, so every site's own link is on screen; the full
 * `label` stays in the page, clipped out of sight, for screen readers.
 *
 * Every repo that carries the strip keeps the same list: controversial-trump,
 * controversial-trump-research, deep-dives and election-rigging. When a site gets a
 * new address (Deep Dives is planned for dives.thetrumptracker.com), change it here
 * and in the other three copies. The Civics Desk keeps its own light identity and
 * does not carry the strip, only a footer line.
 */
export const NETWORK = [
  { id: 'tracker',  label: 'Tracker',                name: 'The Trump Tracker',      href: 'https://thetrumptracker.com',          strip: true },
  { id: 'research', label: 'Research',               name: 'Research',               href: 'https://research.thetrumptracker.com', strip: true },
  { id: 'dives',    label: 'Deep Dives',             name: 'Deep Dives',             href: 'https://deep-dives-gamma.vercel.app',  strip: true },
  { id: 'rigged',   label: 'Rigged Before the Vote', name: 'Rigged Before the Vote', href: 'https://riggingelections.com',         strip: true, short: 'Rigged' },
  { id: 'civics',   label: 'The Civics Desk',        name: 'The Civics Desk',        href: 'https://thecivicsdesk.com',            strip: false },
];
