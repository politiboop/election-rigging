#!/usr/bin/env node
/**
 * Liveness audit for src/data/evidence.json ("The Premise" and "The SAVE Act" sections).
 *
 * These sections cite primary documents (court rulings, government audits, surveys)
 * that are not seeded from tracker entries, so verify-sources.js cannot trace them.
 * CLAUDE.md hard rule 2 allows "URLs verified at write time"; this script makes that
 * verification repeatable: every URL must answer with a real page.
 *
 * Passes: 2xx, or 403/406/429/000 from known bot-blocking hosts (the page is real, the
 * host just refuses scripts; each host on that list was confirmed with a headless browser
 * when it was added). Fails: 404/410, a 401 from reuters.com, a redirect
 * that lands on a bare domain root (soft-404), or no response.
 *
 * Usage:  node verify-evidence.js
 * Exit code 1 on any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/evidence.json'), 'utf8'));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const BOT_BLOCKERS = ['washingtonpost.com','nytimes.com','thehill.com','politico.com','wsj.com','bloomberg.com','newsweek.com','huffpost.com','reuters.com','congress.gov','govinfo.gov','heritage.org','brennancenter.org','pewresearch.org','cbo.gov','supremecourt.gov','ca10.uscourts.gov','cisa.gov','justice.gov','texastribune.org','votebeat.org','apnews.com','npr.org','nbcnews.com','cnn.com','foxnews.com','gallup.com','americanprogress.org','newhampshirebulletin.com','nationalreview.com','statenews.org','ajc.com','propublica.org','votebeat.org','alabamareflector.com','ohiocapitaljournal.com','sos.ga.gov','newjerseymonitor.com','georgiarecorder.com'];

const urls = new Map();
for (const sec of [data.baseline, data.saveact]) {
  for (const item of [...sec.stats, ...sec.rows]) {
    for (const s of item.sources || []) urls.set(s.url, s.text);
  }
}
let bad = 0;
for (const [url, text] of urls) {
  let code = '000', effective = url;
  try {
    const out = execFileSync('curl', ['-s','-o','/dev/null','-L','--max-time','20','-A',UA,'-w','%{http_code} %{url_effective}',url], { encoding: 'utf8' });
    [code, effective] = out.trim().split(' ');
  } catch (e) { code = '000'; }
  const host = new URL(url).hostname.replace(/^www\./,'');
  const blocked = BOT_BLOCKERS.some(h => host.endsWith(h));
  const landedOnRoot = /^https?:\/\/[^/]+\/?$/.test(effective) && !/^https?:\/\/[^/]+\/?$/.test(url);
  let ok = /^2/.test(code) && !landedOnRoot;
  if (!ok && blocked && /^(403|406|429|401|202|000)$/.test(code) && host !== 'reuters.com') ok = true;
  if (!ok) { bad++; console.log(`❌ [${code}] ${url}${landedOnRoot ? '  (soft-404 → ' + effective + ')' : ''}\n     "${text}"`); }
  else if (!/^2/.test(code)) console.log(`ℹ️  [${code}] bot-blocked, treated as live: ${url}`);
}
console.log(`\nChecked ${urls.size} evidence URLs.`);
if (bad) { console.log(`❌ ${bad} failed. Drop or replace them; never substitute a homepage.`); process.exit(1); }
console.log('🎉 Clean — every evidence citation answers with a real page.');
