// /crosslinks.json: where this page covers each tracker entry, for the tracker to read.
// The page is rendered on demand, but this file is written once, at build time, next to
// stats.json and the sitemap, so every deploy publishes the links its own data produced.
//
//   { "<entryId>": [{ "site": "rigged", "title": "<card title>", "url": "https://riggingelections.com/#<card id>" }] }
//
// The tracker reads it when IT builds, so a new card can take a few minutes after a
// deploy here to appear on the entry's page there. See src/lib/crosslinks.js.
import actions from '../data/actions.json';
import evidence from '../data/evidence.json';
import titles from '../generated/tracker-titles.json';
import { buildCrosslinks, linkedTrackerIds, idsWithoutTitle } from '../lib/crosslinks.js';

export const prerender = true;

export function GET({ site }) {
  if (!site) throw new Error('crosslinks.json: `site` is not set in astro.config.mjs, so the card links have no origin');

  // The page labels its "Tracker entry" links from the titles snapshot. Say so at build time
  // when the snapshot is behind the data; the page still builds, with the bare id as the label.
  const untitled = idsWithoutTitle(linkedTrackerIds({ actions, evidence }), titles);
  if (untitled.length) {
    console.warn(`[crosslinks] ${untitled.length} tracker entr${untitled.length === 1 ? 'y has' : 'ies have'} no title in src/generated/tracker-titles.json, so their links are labeled with the id. Run \`node sync-tracker-titles.js\`.`);
  }

  const links = buildCrosslinks({ actions, evidence, origin: site.origin });
  return new Response(JSON.stringify(links, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
