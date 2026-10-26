#!/usr/bin/env node
/**
 * Source-integrity audit for "Rigged Before the Vote".
 *
 * The repo's anti-fabrication rule (CLAUDE.md, hard rule 2) is that every card
 * is seeded from verified controversial-trump tracker entries. That gives one
 * mechanically checkable invariant:
 *
 *   Every source URL on a card must appear verbatim in the sources of at least
 *   one of that card's own trackerIds.
 *
 * A URL that appears nowhere in its seed entries was either typed from memory
 * or orphaned when the tracker entry it came from was corrected. Both cases
 * need a human look, so both fail.
 *
 * Also checks: trackerIds resolve to real entry files, and cards carry at least
 * one source.
 *
 * And one more, for the "Tracker entry" links (UI-ROADMAP.md WP5): each link is labeled
 * with the entry's title, copied into src/generated/tracker-titles.json by
 * sync-tracker-titles.js because neither Vercel's build nor the on-demand page can reach
 * the tracker's data folder. The copy must match the tracker now, entry for entry.
 *
 * Usage:
 *   node verify-sources.js            # integrity audit
 *   node verify-sources.js --verbose  # also list every card as it passes
 *
 * Exit code 1 on any failure, so it can gate a commit.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkedTrackerIds } from './src/lib/crosslinks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const actionsPath = path.join(__dirname, 'src', 'data', 'actions.json');
const trackerDir = path.join(__dirname, '..', 'controversial-trump', 'data', 'controversies');
const verbose = process.argv.includes('--verbose');

if (!fs.existsSync(trackerDir)) {
  console.error(`! Tracker repo not found at ${trackerDir}`);
  console.error('  This check needs controversial-trump cloned alongside election-rigging.');
  process.exit(1);
}

const norm = (u) => String(u).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase();

const actions = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
const actionCards = Array.isArray(actions) ? actions : actions.actions || [];

// The evidence sections built from tracker entries ("Asked, and wouldn't rule it
// out", "What you may have heard") carry trackerIds on each row or item, and are
// held to the same rule as cards. Rows without trackerIds cite primary documents
// and are checked for liveness by verify-evidence.js instead.
const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'evidence.json'), 'utf8'));
const evidenceUnits = [];
for (const [name, sec] of Object.entries(evidence)) {
  [...(sec.rows || []), ...(sec.items || [])].forEach((item, i) => {
    if (!item.trackerIds) return;
    evidenceUnits.push({ id: `evidence.${name}[${i}]${item.id ? ' ' + item.id : ''}`, trackerIds: item.trackerIds, sources: item.sources || [] });
  });
}
const cards = [...actionCards, ...evidenceUnits];

const missingEntries = [];
const untraceable = [];
const sourceless = [];
let urlCount = 0, tracedCount = 0;

for (const card of cards) {
  const ids = card.trackerIds || [];
  const seedUrls = new Set();

  for (const id of ids) {
    const file = path.join(trackerDir, `${id}.json`);
    if (!fs.existsSync(file)) { missingEntries.push({ card: card.id, id }); continue; }
    const entry = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const s of entry.sources || []) seedUrls.add(norm(s.url));
  }

  const sources = card.sources || [];
  if (!sources.length) sourceless.push(card.id);

  for (const s of sources) {
    urlCount++;
    const url = typeof s === 'string' ? s : s.url;
    if (seedUrls.has(norm(url))) tracedCount++;
    else untraceable.push({ card: card.id, url, ids });
  }
  if (verbose) console.log(`   ${card.id}: ${sources.length} sources / ${ids.length} seed entries`);
}

// The titles snapshot behind the "Tracker entry" links.
const titlesPath = path.join(__dirname, 'src', 'generated', 'tracker-titles.json');
const snapshot = fs.existsSync(titlesPath) ? JSON.parse(fs.readFileSync(titlesPath, 'utf8')) : {};
const linked = linkedTrackerIds({ actions: actionCards, evidence });
const titleProblems = [];
for (const id of linked) {
  const file = path.join(trackerDir, `${id}.json`);
  if (!fs.existsSync(file)) continue;   // reported above as a missing entry
  const now = JSON.parse(fs.readFileSync(file, 'utf8')).title;
  if (!(id in snapshot)) titleProblems.push({ id, why: 'has no title in the snapshot' });
  else if (snapshot[id] !== now) titleProblems.push({ id, why: 'has a different title in the tracker now', had: snapshot[id], now });
}
for (const id of Object.keys(snapshot)) {
  if (!linked.includes(id)) titleProblems.push({ id, why: 'is in the snapshot but no card or item links to it any more' });
}

console.log(`\nChecked ${actionCards.length} cards and ${evidenceUnits.length} evidence rows / ${urlCount} source URLs against ${trackerDir.replace(process.env.HOME, '~')}\n`);

if (missingEntries.length) {
  console.log(`❌ ${missingEntries.length} trackerId(s) do not resolve to a tracker entry:\n`);
  for (const m of missingEntries) console.log(`   card "${m.card}" cites missing entry: ${m.id}`);
  console.log('');
}

if (sourceless.length) {
  console.log(`❌ ${sourceless.length} card(s) carry no sources at all:\n`);
  for (const c of sourceless) console.log(`   ${c}`);
  console.log('');
}

if (untraceable.length) {
  console.log(`❌ ${untraceable.length} source URL(s) do not appear in any of their card's seed entries:\n`);
  for (const u of untraceable) {
    console.log(`   ${u.url}`);
    console.log(`      card:  ${u.card}`);
    console.log(`      seeds: ${u.ids.join(', ') || '(none)'}\n`);
  }
  console.log('   Either the URL was written from memory, or the tracker entry it came from was');
  console.log('   corrected and dropped it. Re-check the claim against the tracker entry and');
  console.log('   either restore a real source or remove the card text that relied on it.\n');
}

if (titleProblems.length) {
  console.log(`❌ ${titleProblems.length} tracker title(s) in src/generated/tracker-titles.json are out of step with the data or the tracker:\n`);
  for (const p of titleProblems) {
    console.log(`   ${p.id} ${p.why}`);
    if (p.had) console.log(`      snapshot: ${p.had}\n      tracker:  ${p.now}`);
  }
  console.log('\n   Run `node sync-tracker-titles.js` and commit the result.\n');
}

if (!missingEntries.length && !untraceable.length && !sourceless.length && !titleProblems.length) {
  console.log(`🎉 Clean — all ${tracedCount}/${urlCount} URLs trace to a seed tracker entry, and all ${linked.length} tracker titles match.`);
} else {
  console.log('Exit code 1 — non-zero so this can gate a commit.');
  process.exit(1);
}
