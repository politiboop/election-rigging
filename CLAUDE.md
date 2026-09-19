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
  "unprecedented": "OPTIONAL — the stated basis for the UNPRECEDENTED flag (see flag criteria below)",
  "legal": { "level": "ruled | statute | constitution", "basis": "OPTIONAL — the stated legal conflict" },
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

### Flags (strict criteria — published in the Method section)

- `unprecedented` — apply ONLY where cited officials, experts, or reporting say the action has no
  equivalent; the string states that basis and it renders on the card.
- `legal.level`:
  - `ruled` — a court has ruled against the action itself
  - `statute` — conflicts with explicit statute or a standing court order
  - `constitution` — collides with constitutional text or allocation of power per litigation and
    experts cited (courts may not have ruled yet)
- The `basis` string must be traceable to the card's facts or its seed tracker entries — never
  Claude's own legal conclusion. When a court rules on a flagged action, upgrade/downgrade the
  level accordingly.
- `doubt: true` — the entry documents Trump or his administration publicly asserting that American
  elections are rigged, fraudulent, or illegitimate, or publicly delegitimizing a result. Feeds the
  hero trust counter (doubt cards + history entries). Apply tightly: the public assertion must be
  the entry's substance, not merely its premise.

## The evidence sections (`src/data/evidence.json`)

Two sections sit between The Sequence and The Pattern: **The Premise** (`#premise`, the data showing
elections were already secure and fraud is rare, drawn largely from Republican-run audits and the
administration's own results) and **The SAVE Act** (`#saveact`, what the bill requires, who lacks the
documents, the Kansas precedent, and a claim-vs-record table). Both render from `evidence.json`:

```json
{ "baseline": { "kicker", "title", "sub", "stats": [{ "value", "label", "detail", "sources": [{text,url}] }],
                "rows": [{ "who", "when", "looked", "found", "detail", "sources" }], "take" },
  "saveact":  { ..., "rows": [{ "claim", "who", "found", "detail", "sources" }], "take" } }
```

These cite primary documents (court opinions, state audits, bill text, surveys) that are not seeded
from tracker entries, so `verify-sources.js` does not cover them. Run `node verify-evidence.js`
instead: every URL must answer with a real page (2xx, or a bot-block from a host on the script's
allowlist, each of which was confirmed with a headless browser when added). The fact/take rule
applies exactly as on cards: `take` is the only place for opinion, and it renders under the
"OUR TAKE — opinion, not reporting" label. Keep the claim column in the SAVE Act table to the
sponsors' strongest version of the argument, quoted, so the comparison is fair.

## The prehistory (`src/data/history.json`)

A dedicated Prehistory section (between The Record and The Sequence) shows the 2020–2025 record:
the Big Lie, fake electors, the Raffensperger call, January 6, the "termination" post, the 2024
"only way we lose" claims, and the January 6 pardons. Schema: `{ id, date, title, summary, sources: [{text, url}], seedRefs }`.
Every source URL must exist in a tracker entry, the research site's election-rigging pages, or the
Civics Desk fake-electors article (`seedRefs` records where). These entries count toward the hero
trust counter. Add here only pre-2026 events; 2026 events belong in `actions.json`.

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
5. Run `node verify-sources.js` (see below) and, if `evidence.json` changed, `node verify-evidence.js`;
   then `npm run build`, verify, commit (ask the user before pushing, per workspace convention).

## Source-integrity check

```bash
node verify-sources.js
```

Enforces hard rule 2 mechanically: **every source URL on a card must appear verbatim in the sources
of at least one of that card's own `trackerIds`.** A URL that traces to nothing was either typed from
memory or orphaned when the tracker entry it came from was corrected. Both fail, and both need a look.
It also checks that every `trackerId` resolves to a real entry file and that no card is sourceless.

Exits non-zero, so it can gate a commit. Run it after any tracker-side correction too, not just when
adding cards here: fixing a fabricated URL in `controversial-trump` can orphan a card that quoted it.

## Style check (automatic)

A `PostToolUse` hook wired in `.claude/settings.json` runs `.claude/hooks/style-check.mjs`
after every Write or Edit. It only acts on `src/data/{actions,history,evidence}.json` and
`src/pages/*.astro`; everything else exits 0 immediately.

It reads the file **from disk**, not from the tool payload. PostToolUse fires after the write,
so the file is already there — and an Edit, which carries only its replacement string, gets
checked in full instead of passing vacuously. (That vacuous pass is a real defect in the
sibling Civics Desk hook, which reads `.tool_input.content`.)

What it enforces:

| Rule | Threshold |
|---|---|
| Em dash in a card or section title | none allowed — this repo's headline rule |
| Em dashes stacked in one fact, take or line | 3 or more fails |
| Em dash density across our prose | fails below 1 per 80 words (target 150-200) |
| AI phrases | the Civics Desk list of 43; any hit fails |
| `let's` addressing the reader | more than 2 fails |
| Emoji | none allowed |

**Context matters, and the hook knows the difference.** Text inside `"…"` is a source's own
words and is exempt from the phrase, `let's` and em-dash checks; `sources[].text` is an
outlet's headline as published and is exempt too. Without that, the hook would fail on
correct content every time somebody quotes Trump saying "let's do this, let's do that."
Only `facts`, `take`, `unprecedented`, `legal.basis`, the evidence prose and the page copy
count as ours.

Run it by hand against any file:

```bash
echo '{"tool_input":{"file_path":"'$PWD'/src/data/actions.json"}}' | node .claude/hooks/style-check.mjs
```

It exits 2 with the offending locations on stderr, so it also works as a pre-commit gate.
Deliberately not checked: the "X not Y" construction. It reads as an AI tell in rhetoric, but
on this site it is almost always a precision caveat marking what the evidence does and does not
support ("This is an absence, not an announced decision"), which is what the Method section
promises. Flagging it would train the wrong instinct.

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
