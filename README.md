# Rigged Before the Vote

A single-page, sourced record of documented actions to tilt the 2026 midterm elections before
they happen — who counts the votes, who certifies them, who can cast them, and who is watching.

- **44 documented actions** across seven categories, each with dates, direct quotes, and sources
- **Facts and opinions are separated by design** — editorial takes appear only in labeled
  "OUR TAKE" blocks
- Status tracking: In Effect · In Court · Threatened · On the Record · Blocked
- Interactive: filter by category and status, sort by date, deep-link to any card

## Stack

Astro 6, fully static, zero frameworks. All content lives in `src/data/actions.json`;
the page computes every count from the data at build time.

```bash
npm install
npm run dev     # local dev server
npm run build   # static build to dist/
```

See `CLAUDE.md` for the data model, editorial standards, and update workflow.
