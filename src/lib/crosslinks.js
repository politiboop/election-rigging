/**
 * Cross-links between this page and The Trump Tracker (UI-ROADMAP.md WP5).
 *
 * Every card in src/data/actions.json lists the tracker entries it was seeded from in
 * `trackerIds`, and so does every item under "What you may have heard". Two things are
 * made from those lists and from nothing else, so no link here is ever typed by hand:
 *
 *   1. The "Tracker entry" link on each card and item (TrackerLinks.astro), pointing at
 *      the entry's own page on the tracker, labeled with the entry's title.
 *   2. /crosslinks.json, which the tracker reads when it builds so that an entry's page
 *      can say where else it is covered:
 *
 *        { "<entryId>": [{ "site": "rigged", "title": "...", "url": "https://riggingelections.com/#<id>" }] }
 *
 * This file is pure (no fs, no JSON imports) so the page, the build-time endpoint and the
 * Node scripts that check it can all import it.
 */
import { NETWORK } from './network.js';

const TRACKER = NETWORK.find((s) => s.id === 'tracker').href.replace(/\/+$/, '');

/** An entry's page on the tracker, at the address the tracker builds for it. */
export const trackerEntryUrl = (id) => `${TRACKER}/controversy/${id}/`;

/** DOM ids on this page. A card's id is its own; an item under "What you may have heard" is prefixed. */
export const cardAnchor = (card) => card.id;
export const heardAnchor = (item) => `heard-${item.id}`;

/**
 * An item under "What you may have heard" is a fear the record may not support, so its row
 * in /crosslinks.json carries its verdict. Without it the tracker would list the bare claim
 * ("Trump will cancel or postpone the midterms.") as if this site backed it.
 */
export const heardTitle = (item) => `What you may have heard: “${item.claim}” (${item.verdict})`;

/**
 * The label for a "Tracker entry" link: the entry's title from the snapshot in
 * src/generated/tracker-titles.json, or the bare id when the snapshot has no title for it.
 * `node verify-sources.js` fails when the snapshot is out of date, so the bare id only
 * shows between a data edit and the next `node sync-tracker-titles.js`.
 */
export const trackerLabel = (titles, id) => titles[id] || id;

/** Every tracker entry the page links to: the seeds of the cards and of the "heard" items. Sorted, unique. */
export function linkedTrackerIds({ actions, evidence }) {
  const ids = new Set();
  for (const a of actions) for (const id of a.trackerIds || []) ids.add(id);
  for (const h of evidence.heard.items) for (const id of h.trackerIds || []) ids.add(id);
  return [...ids].sort();
}

/** The ids in `linkedTrackerIds` that the snapshot has no title for. */
export const idsWithoutTitle = (ids, titles) => ids.filter((id) => !titles[id]);

/**
 * The contents of /crosslinks.json.
 *
 * One row per place this page covers an entry, grouped under the entry's id:
 *   - each card that lists the id in `trackerIds`, newest card first (the order the page
 *     lists them in), linked to the card by its id;
 *   - each "What you may have heard" item that lists it, linked to the item by its anchor.
 *
 * Not included: the rows under "Asked, and wouldn't rule it out". They have no anchor of
 * their own (only the section does), and every tracker entry they cite is also the seed of
 * a card, so leaving them out loses no entry. Keys are sorted so a rebuild changes the file
 * only when the data changed.
 *
 * `origin` is the site's own origin, taken from `site` in astro.config.mjs.
 */
export function buildCrosslinks({ actions, evidence, origin }) {
  const rows = new Map();
  const add = (id, row) => {
    const list = rows.get(id) || [];
    if (!list.some((r) => r.url === row.url)) list.push(row);
    rows.set(id, list);
  };

  const newestFirst = [...actions].sort((a, b) => b.date.localeCompare(a.date));
  for (const card of newestFirst) {
    for (const id of card.trackerIds || []) {
      add(id, { site: 'rigged', title: card.title, url: `${origin}/#${cardAnchor(card)}` });
    }
  }
  for (const item of evidence.heard.items) {
    for (const id of item.trackerIds || []) {
      add(id, { site: 'rigged', title: heardTitle(item), url: `${origin}/#${heardAnchor(item)}` });
    }
  }

  return Object.fromEntries([...rows.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
