#!/usr/bin/env node
/**
 * Check of the Election Day clock (src/lib/election-clock.js) that needs no browser
 * and no change to the system clock: it hands the module fixed instants and prints
 * what the page would show at each.
 *
 * Covered: the four dates the header chip is specified against (Nov 2, 3, 9 and 11),
 * the exact midnight-Eastern boundaries on either side of each change, the daylight-
 * saving change on Nov 1, and a sweep of every hour from Oct 20 to Nov 20 against an
 * independent calculation of New York's date.
 *
 * Usage:  node check-election-clock.js
 *         TZ=Pacific/Auckland node check-election-clock.js   # same output: the zone is fixed in the module
 * Exit code 1 on any mismatch.
 */
import { electionClock, newYorkDate, CHIP_DAYS_AFTER } from './src/lib/election-clock.js';

let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL  ${msg}`); };
const expect = (label, got, want) => { if (got !== want) fail(`${label}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };

const at = (iso) => new Date(iso);
const chipText = (c) => (c.chip ? c.chip.text : '(not rendered)');

// ── the four specified dates, at noon Eastern (17:00 UTC; EST applies from Nov 1) ──
const SPEC = [
  ['Nov 2  (day before)',     '2026-11-02T17:00:00Z', { phase: 'before', chip: '1 day to the midterms',      tile: '1 | Days until Nov 3, 2026', votePassed: false }],
  ['Nov 3  (Election Day)',   '2026-11-03T17:00:00Z', { phase: 'today',  chip: 'Election Day is today',      tile: 'Today | Election Day, Nov 3, 2026', votePassed: false }],
  ['Nov 9  (6 days after)',   '2026-11-09T17:00:00Z', { phase: 'after',  chip: 'Election Day was November 3', tile: '6 | Days since Nov 3, 2026', votePassed: true }],
  ['Nov 11 (8 days after)',   '2026-11-11T17:00:00Z', { phase: 'after',  chip: '(not rendered)',             tile: '8 | Days since Nov 3, 2026', votePassed: true }],
];

console.log('Header chip, hero tile and page order on the four specified dates (noon New York time)\n');
console.log('date                   instant (UTC)          NY date     phase   chip                           hero tile                           "After the Vote" leads page');
for (const [label, iso, want] of SPEC) {
  const c = electionClock(at(iso));
  const tile = `${c.tile.value} | ${c.tile.label}`;
  console.log(`${label.padEnd(22)} ${iso.padEnd(22)} ${c.today}  ${c.phase.padEnd(6)}  ${chipText(c).padEnd(29)}  ${tile.padEnd(34)}  ${c.votePassed ? 'yes' : 'no'}`);
  expect(`${label} phase`, c.phase, want.phase);
  expect(`${label} chip`, chipText(c), want.chip);
  expect(`${label} tile`, tile, want.tile);
  expect(`${label} votePassed`, c.votePassed, want.votePassed);
}

// ── boundaries: midnight in New York, not the reader's midnight ──
// EST is UTC-5 from Nov 1, so New York midnight on Nov N is 05:00 UTC.
const EDGES = [
  ['Nov 3 00:00 ET minus 1 s', '2026-11-03T04:59:59Z', '2026-11-02', 'before', '1 day to the midterms'],
  ['Nov 3 00:00 ET',           '2026-11-03T05:00:00Z', '2026-11-03', 'today',  'Election Day is today'],
  ['Nov 4 00:00 ET minus 1 s', '2026-11-04T04:59:59Z', '2026-11-03', 'today',  'Election Day is today'],
  ['Nov 4 00:00 ET',           '2026-11-04T05:00:00Z', '2026-11-04', 'after',  'Election Day was November 3'],
  ['Nov 11 00:00 ET minus 1 s','2026-11-11T04:59:59Z', '2026-11-10', 'after',  'Election Day was November 3'],
  ['Nov 11 00:00 ET',          '2026-11-11T05:00:00Z', '2026-11-11', 'after',  '(not rendered)'],
];
console.log('\nBoundaries (the chip lasts ' + CHIP_DAYS_AFTER + ' days after Election Day, Nov 4 through Nov 10)\n');
for (const [label, iso, nyDate, phase, chip] of EDGES) {
  const c = electionClock(at(iso));
  console.log(`${label.padEnd(26)} ${iso}  ${c.today}  ${c.phase.padEnd(6)}  ${chipText(c)}`);
  expect(`${label} NY date`, c.today, nyDate);
  expect(`${label} phase`, c.phase, phase);
  expect(`${label} chip`, chipText(c), chip);
}

// ── today, for reference, and the plural ──
const now = electionClock(new Date());
console.log(`\nRight now (system clock): ${now.today} -> ${chipText(now)}; hero tile "${now.tile.value}" ${now.tile.label}`);
expect('plural: 2 days', electionClock(at('2026-11-01T17:00:00Z')).chip.text, '2 days to the midterms');

// ── sweep: every hour, Oct 20 to Nov 20, against an independent New York date ──
// The oracle knows only the one rule that matters in this window: daylight time ends
// at 06:00 UTC on Nov 1, 2026 (2:00 a.m. EDT), moving New York from UTC-4 to UTC-5.
const DST_ENDS = Date.UTC(2026, 10, 1, 6, 0, 0);
let samples = 0;
for (let t = Date.UTC(2026, 9, 20); t < Date.UTC(2026, 10, 20); t += 3_600_000) {
  const oracle = new Date(t + (t < DST_ENDS ? -4 : -5) * 3_600_000).toISOString().slice(0, 10);
  samples++;
  if (newYorkDate(new Date(t)) !== oracle) { fail(`sweep ${new Date(t).toISOString()}: module says ${newYorkDate(new Date(t))}, oracle says ${oracle}`); break; }
}
console.log(`\nSweep: ${samples} hourly instants (Oct 20 to Nov 20), New York date matches the independent calculation across the Nov 1 daylight-saving change`);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
