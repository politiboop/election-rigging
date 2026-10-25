/**
 * What this site says about itself at /stats.json, so the other sites in the network
 * (the tracker's "Elsewhere" panels, for one) can show current numbers without anyone
 * editing a count by hand. Nothing here is typed in: the count comes from
 * src/data/actions.json and the date from the LAST_UPDATED constant that the news
 * sweep already bumps in src/pages/index.astro.
 *
 *   { "site": "rigged", "actions": <cards in actions.json>,
 *     "lastUpdated": "YYYY-MM-DD", "generatedAt": "<ISO timestamp of the build>" }
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

/**
 * LAST_UPDATED as an ISO date. The page writes it as 'October 23, 2026'; an abbreviated month
 * ('Oct 23, 2026') or an ISO date is accepted too, so a sweep that words it a little
 * differently does not fail the deploy. Anything that is not a real date throws.
 */
export function isoFromDateText(text) {
  const t = String(text).trim();
  let year, month, day;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const long = /^([A-Za-z]{3,9})\.? (\d{1,2}), (\d{4})$/.exec(t);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])];
  } else if (long) {
    const name = long[1].toLowerCase();
    month = MONTHS.findIndex((m) => m.toLowerCase().startsWith(name));
    [year, day] = [Number(long[3]), Number(long[2])];
  } else {
    month = -1;
  }
  if (month < 0) throw new Error(`stats.json: cannot read "${text}" as a date like "October 23, 2026"`);
  const check = new Date(Date.UTC(year, month, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month || check.getUTCDate() !== day) {
    throw new Error(`stats.json: "${text}" is not a real date`);
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The LAST_UPDATED constant from the source of src/pages/index.astro, as an ISO date. */
export function lastUpdatedFrom(indexSource) {
  const m = /^const LAST_UPDATED = '([^']+)';/m.exec(indexSource);
  if (!m) {
    throw new Error("stats.json: found no `const LAST_UPDATED = '...';` line in src/pages/index.astro. "
      + 'The stats read it from there; keep that line, or point src/lib/site-stats.js at its new home.');
  }
  return isoFromDateText(m[1]);
}

export function buildStats({ actions, indexSource, now = new Date() }) {
  return {
    site: 'rigged',
    actions: actions.length,
    lastUpdated: lastUpdatedFrom(indexSource),
    generatedAt: now.toISOString(),
  };
}
