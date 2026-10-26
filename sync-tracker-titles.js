#!/usr/bin/env node
/**
 * Writes src/generated/tracker-titles.json: the title of every tracker entry this page
 * links to, read from the entry files in controversial-trump.
 *
 * Why a snapshot. Each card, and each item under "What you may have heard", shows a
 * "Tracker entry" link labeled with the entry's title (UI-ROADMAP.md WP5). The page is
 * rendered on demand and Vercel builds this repo on its own, so neither the page nor the
 * build can reach the tracker's data folder. The titles are copied here, by this script,
 * and the build bundles the copy. `node verify-sources.js` fails when the copy is behind
 * the tracker, so a corrected title or a new card cannot ship with a stale label.
 *
 * Run it after any edit to a `trackerIds` list, and after a title is corrected in the tracker:
 *
 *   node sync-tracker-titles.js
 *
 * It needs controversial-trump cloned beside this repo, like verify-sources.js. It never
 * invents a title: an id with no entry file stops it, and nothing is written.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkedTrackerIds } from './src/lib/crosslinks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const trackerDir = path.join(__dirname, '..', 'controversial-trump', 'data', 'controversies');
const outPath = path.join(__dirname, 'src', 'generated', 'tracker-titles.json');

if (!fs.existsSync(trackerDir)) {
  console.error(`! Tracker repo not found at ${trackerDir}`);
  console.error('  This script needs controversial-trump cloned alongside election-rigging.');
  process.exit(1);
}

const readJson = (...parts) => JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', ...parts), 'utf8'));
const ids = linkedTrackerIds({ actions: readJson('actions.json'), evidence: readJson('evidence.json') });

const titles = {};
const missing = [];
for (const id of ids) {
  const file = path.join(trackerDir, `${id}.json`);
  if (!fs.existsSync(file)) { missing.push(id); continue; }
  const title = JSON.parse(fs.readFileSync(file, 'utf8')).title;
  if (typeof title !== 'string' || !title.trim()) { missing.push(`${id} (entry has no title)`); continue; }
  titles[id] = title;
}

if (missing.length) {
  console.error(`! ${missing.length} trackerId(s) have no usable tracker entry; nothing was written:`);
  for (const m of missing) console.error(`    ${m}`);
  process.exit(1);
}

const next = JSON.stringify(titles, null, 2) + '\n';
const before = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, next);
console.log(`${next === before ? 'Already up to date' : 'Wrote'}: ${ids.length} titles in ${path.relative(__dirname, outPath)}`);
