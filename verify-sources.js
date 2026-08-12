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
 * Usage:
 *   node verify-sources.js            # integrity audit
 *   node verify-sources.js --verbose  # also list every card as it passes
 *
 * Exit code 1 on any failure, so it can gate a commit.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const cards = Array.isArray(actions) ? actions : actions.actions || [];

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

console.log(`\nChecked ${cards.length} cards / ${urlCount} source URLs against ${trackerDir.replace(process.env.HOME, '~')}\n`);

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

if (!missingEntries.length && !untraceable.length && !sourceless.length) {
  console.log(`🎉 Clean — all ${tracedCount}/${urlCount} URLs trace to a seed tracker entry.`);
} else {
  console.log('Exit code 1 — non-zero so this can gate a commit.');
  process.exit(1);
}
