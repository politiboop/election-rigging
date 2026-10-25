/**
 * Election Day arithmetic for "Rigged Before the Vote".
 *
 * Pure functions: no DOM, and the only read of the system clock is the default
 * for `now`. Hand in any date and see what the page would do on it, which is how
 * `node check-election-clock.js` shows Nov 2, 3, 9 and 11 without touching the
 * machine's clock.
 *
 * The page uses this twice: on the server when it renders, and in the browser
 * on load, so a cached or prerendered copy of the HTML still corrects itself.
 *
 * Days are New York calendar days. The election is an Eastern-time event, so
 * everything flips at midnight in New York for every reader, not at each
 * reader's own midnight.
 */

export const ELECTION_DAY = '2026-11-03';
export const TIME_ZONE = 'America/New_York';

/** After Election Day passes, the header chip stays this many days, then goes. */
export const CHIP_DAYS_AFTER = 7;

const NEW_YORK = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** The calendar date in New York at `now`, as YYYY-MM-DD. */
export function newYorkDate(now = new Date()) {
  const p = Object.fromEntries(NEW_YORK.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
}

// A calendar date as a whole number of days. UTC midnights carry no daylight-saving
// offset, so the difference of two of these is an exact count of calendar days.
const dayNumber = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

function chipFor(phase, daysToGo, daysSince) {
  // `short` is what a phone-width header shows; `long` is the full phrase, which stays
  // in the page for screen readers at every width. Both are built from constants and
  // whole numbers, so they go into the markup without escaping.
  if (phase === 'before') {
    const unit = daysToGo === 1 ? ' day' : ' days';
    return { number: String(daysToGo), short: unit, long: `${unit} to the midterms` };
  }
  if (phase === 'today') {
    return { number: '', short: 'Election Day', long: 'Election Day is today' };
  }
  if (daysSince <= CHIP_DAYS_AFTER) {
    // Two stacked lines on a phone: the whole sentence on one line would not fit beside the wordmark.
    return { number: '', short: '<span class="cd-l">Election Day</span><span class="cd-l">was Nov 3</span>', long: 'Election Day was November 3' };
  }
  return null;   // a week on: the chip is not rendered at all
}

function tileFor(phase, daysToGo, daysSince) {
  if (phase === 'before') return { value: String(daysToGo), label: 'Days until Nov 3, 2026' };
  if (phase === 'today') return { value: 'Today', label: 'Election Day, Nov 3, 2026' };
  return { value: String(daysSince), label: 'Days since Nov 3, 2026' };
}

/**
 * Everything the page needs to know about where it is relative to Election Day.
 *
 *   phase      'before' until the New York date reaches Nov 3, 'today' on Nov 3,
 *              'after' from Nov 4
 *   votePassed true once phase is 'after': the cue to lead the page with "After the Vote"
 *   chip       the header chip, or null once it has expired
 *   tile       the hero tile that sat on "Days until Nov 3, 2026"
 */
export function electionClock(now = new Date()) {
  const today = newYorkDate(now);
  const daysToGo = dayNumber(ELECTION_DAY) - dayNumber(today);   // negative once it has passed
  const daysSince = Math.max(0, -daysToGo);
  const phase = daysToGo > 0 ? 'before' : daysToGo === 0 ? 'today' : 'after';
  const chip = chipFor(phase, daysToGo, daysSince);
  return {
    today,
    daysToGo,
    daysSince,
    phase,
    votePassed: phase === 'after',
    chip: chip && { ...chip, text: `${chip.number}${chip.long}` },
    tile: tileFor(phase, daysToGo, daysSince),
  };
}

/** The chip's inner markup, shared by the server render and the browser. */
export function chipHtml(chip) {
  if (!chip) return '';
  return (chip.number ? `<strong>${chip.number}</strong>` : '')
    + `<span class="cd-short" aria-hidden="true">${chip.short}</span>`
    + `<span class="cd-long">${chip.long}</span>`;
}
