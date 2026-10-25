// /stats.json: this site's own numbers, for the other sites in the network to read.
// The page is rendered on demand, but this file is written once, at build time, next to
// the sitemap, so every deploy publishes the numbers its own data produced.
//
// index.astro is imported as text (?raw) because LAST_UPDATED lives in its frontmatter,
// where the news sweep bumps it. See src/lib/site-stats.js.
import actions from '../data/actions.json';
import indexSource from './index.astro?raw';
import { buildStats } from '../lib/site-stats.js';

export const prerender = true;

export function GET() {
  const stats = buildStats({ actions, indexSource });
  return new Response(JSON.stringify(stats, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
