# Rigged Before the Vote — Project Guide

A single-page, data-driven site tracking documented actions to tilt the 2026 midterm elections
before they happen. Part of the politiboop workspace (see the workspace `CLAUDE.md` one level up
for git identity, validation protocols, and the batch workflow).

## Architecture

- **Astro 6**, fully static, one page: `src/pages/index.astro`
- **All content lives in `src/data/actions.json`** — the page derives every count (totals, status
  breakdown, category tiles, source count) from that file at build time. Never hardcode a number
  in the page that can be computed from the data.
- Styles: `src/styles/global.css`. Fonts via @fontsource: Barlow Condensed (display),
  Barlow (body), Lora italic (labeled takes), IBM Plex Mono (metadata).
- Vanilla JS in the page handles filtering, sorting, count-up animation, the Election Day
  countdown, deep-linking (`#card-id` opens the card), and scroll-spy.

### Dev / build

```bash
npm run dev    # or preview via .claude/launch.json entry "rigging-dev" (port 4323)
npm run build
```

## The data model

Each entry in `src/data/actions.json`:

```json
{
  "id": "kebab-case-anchor",
  "title": "Headline, newspaper-style, no em dashes",
  "date": "YYYY-MM-DD",
  "category": "machinery | data | force | ballot | maps | referees | narrative",
  "status": "active | court | threatened | record | blocked",
  "facts": ["2-5 sourced factual sentences"],
  "take": "OPTIONAL labeled opinion — rendered in a visually distinct 'OUR TAKE' block",
  "sources": [{ "text": "Outlet: headline", "url": "https://..." }],
  "trackerIds": ["every controversial-trump entry this card is seeded from"]
}
```

**Integrity check** (run after any data edit): every source URL must appear verbatim in one of the
card's seed tracker entries:

```bash
node -e 'const fs=require("fs");const a=JSON.parse(fs.readFileSync("src/data/actions.json","utf8"));const d="/Users/brock/dev/politiboop/controversial-trump/data/controversies/";let bad=0,t=0;for(const x of a){const raws=x.trackerIds.map(i=>fs.existsSync(d+i+".json")?fs.readFileSync(d+i+".json","utf8"):(console.log("NO FILE:",i),bad++,""));for(const s of x.sources){t++;if(!raws.some(r=>r.includes(s.url))){console.log("BAD:",x.id,s.url);bad++}}}console.log(bad?bad+" problems":"ALL "+t+" URLS VERIFIED")'
```

### Categories

| slug | label |
|---|---|
| `machinery` | Seizing the Machinery |
| `data` | The Voter Data Dragnet |
| `force` | Force at the Polls |
| `ballot` | The Ballot Box |
| `maps` | Redrawing the Maps |
| `referees` | Replacing the Referees |
| `narrative` | The Narrative War |

### Statuses (definitions are published on the page — keep them honest)

- `active` — happened or currently operating
- `court` — operative or contested, litigation pending
- `blocked` — stopped by courts, or abandoned after failing
- `threatened` — announced or planned, not yet executed
- `record` — a statement, directive, or admission in the speaker's own words

Update a card's status when reality changes (e.g., a court blocks a rule → `blocked`).

## The two hard rules

1. **Fact/take separation is the product.** Facts go in `facts` and must be sourced. Opinion goes
   ONLY in `take` (or the page's clearly labeled Analysis section) and is rendered with the
   "OUR TAKE — opinion, not reporting" label. Never blend them.
2. **Anti-fabrication.** Every card is seeded from verified `controversial-trump` tracker entries
   (`trackerIds`) or from URLs verified at write time. Never type a URL from memory. When adding a
   card, pull facts and sources from the tracker entry's JSON, which has already been through the
   workspace validation protocol.

## Update workflow (fits the batch cadence)

When processing news batches in the tracker, for every new/updated election-related entry ask:

1. **Does it belong here?** Scope: actions aimed at the machinery, rules, personnel, or legitimacy
   of the 2026 midterms. Same actor test as the tracker (Trump the actor, decision-maker, or
   direct cause; allies he directed/endorsed/enabled).
2. **Update or new card?** Developments on an existing card (a ruling, an escalation) fold into
   that card's `facts` and may change its `status`. Distinct actions get new cards.
3. Bump the `LAST_UPDATED` constant in `index.astro`.
4. Check the **What to Watch** list in `index.astro` — retire dates that passed (note what
   happened), add new dated triggers.
5. `npm run build`, verify, commit (ask the user before pushing, per workspace convention).

## Design notes

- Dark theme only. Status palette is **validated** (dataviz six-checks, surface `#101318`):
  in effect `#d03b3b`, in court `#3987e5`, threatened `#b5820c`, on the record `#9085e9`,
  blocked `#0ca30c`. In the breakdown bar, keep the display order
  active → court → threatened → record → blocked (adjacent pairs validated for CVD;
  amber must not sit next to green or red). Status color never appears without its text label.
- No emojis anywhere. Card titles follow the tracker's headline rules: organic,
  newspaper-style, no em dashes.
- Card grid: 2-up desktop, 1-up mobile. Cards are `<details>` elements — summary shows date,
  status, title, first fact; expanded shows all facts, the labeled take, and sources.

## Deployment

Static build (`dist/`), intended for Vercel like the other politiboop sites. `.nvmrc` pins
Node 22.12.0+. The `site` URL in `astro.config.mjs` is a placeholder until a domain is chosen.
