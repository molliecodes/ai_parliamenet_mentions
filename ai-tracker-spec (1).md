# Project Brief: UK Parliament AI Mention Tracker

## For Claude Code

Read this whole brief before writing any code. Then work through the phases **in order**, stopping at each checkpoint so I can review before you continue. Do not build all phases at once — I want to stay involved.

---

## What we're building

A tool that:
1. Finds every mention of AI in UK Parliament (via the Hansard API)
2. Stores those mentions locally
3. Renders a static HTML dashboard that can be **embedded in any website via an `<iframe>`**
4. Updates itself automatically via GitHub Actions and deploys to GitHub Pages

No server, no database service, no hosting bill. Everything is files, scripts, and static output.

## How I want to work with you

- **Explain why before what.** Before each significant piece of code, tell me the reasoning in a sentence or two.
- **Incremental.** Get something working at each phase before moving on. Never jump ahead.
- **Git from commit one.** Initialise a repo immediately and make a commit at the end of every phase with a clear message, so I can `git diff` to see exactly what changed.
- **Flag judgment calls.** Several choices here are opinions, not laws (storage format, search strategy, filtering rules). When you hit one, say so and give me the tradeoff rather than silently picking.
- **Pace by phase.** Move fast on plumbing (project setup, boilerplate, YAML). Slow down and talk me through the two hard parts: the Hansard fetching logic and the false-positive filtering.

---

## Phase 0 — Setup (go fast)

- Create the project folder structure.
- Initialise a Git repo.
- Set up a Python virtual environment and a `requirements.txt`.
- Add a `.gitignore` (venv, `__pycache__`, etc.).
- Write a `README.md` stub describing the project.

**Checkpoint:** show me the folder structure and confirm the environment runs, then commit.

---

## Phase 1 — Talk to the API (SLOW DOWN — this is a "learn it" part)

The source is the official UK Hansard API at **`https://hansard-api.parliament.uk`** — this is confirmed live and updated daily (Open Parliament Licence). **Use this base URL.** Do NOT use the deprecated cousins that are easy to confuse it with: `data.parliament.uk` / `explore.data.parliament.uk` (old abandoned beta, no speech data) and `api.parliament.uk/historic-hansard` (historic archive only). If the official API's search proves inadequate, the documented fallback is TheyWorkForYou's `getHansard` API (free API key, has a usage quota).

**Do not assume field names or response shape from memory** — the base URL is confirmed, but the exact fields and query parameters still need to be verified against a live response first.

- Fetch a small number of results for the search term "artificial intelligence" and **print the raw response** so we can both inspect its actual structure.
- Confirm together: what does a single "contribution" / result look like? What fields exist (speaker, party, date, debate title, the text, a link back to Hansard)? How does pagination work? How does date filtering work?
- Only after we've looked at the real data, write a clean fetch function.

**Design decision to surface to me:** "AI" as a bare term will match false positives (it appears inside words and as an abbreviation for other things). Propose a search strategy — e.g. search a set of terms ("artificial intelligence", "machine learning", "large language model", etc.) vs. searching bare "AI" and filtering. Recommend one, explain the recall-vs-precision tradeoff, but let me decide.

**Checkpoint:** we can fetch and print real mentions. Commit.

---

## Phase 2 — Store it (moderate pace)

- Store results in a local SQLite database.
- Schema should capture at least: speaker, party, date, debate title, house (Commons/Lords), the quoted text, and a URL back to the original Hansard record.
- **Forward-compatibility:** also add a nullable `categories` field (designed to hold a *list* of themes, not a single value — mentions can be multi-theme). Leave it empty/null for now; nothing populates it in v1. This exists so theme-categorization can be added later by filling a column rather than rebuilding the schema.
- **Make re-running safe (idempotent):** running the fetcher twice must not create duplicate rows. Explain to me how you're achieving this (e.g. a unique key on the contribution ID) — this is a concept I want to understand.

**Checkpoint:** run the fetcher twice, show me the row count stays stable. Commit.

---

## Phase 3 — See it (moderate pace)

- Build the simplest dashboard that works: a static HTML page that reads the data and shows a total count and a table of mentions.
- **The data must ship as a static file** (export the SQLite contents to a JSON or CSV that sits next to the HTML) so the dashboard has no live backend to query. Explain this choice.
- **Make it iframe-friendly from the start:** responsive width, sensible default height, no assumptions about the surrounding page.
- Function over polish at this stage. Real before pretty.

**Checkpoint:** I can open the page locally and see real data. Commit.

---

## Phase 4 — Make it decent (SLOW DOWN on the filtering — "learn it" part)

- Add a chart of mentions over time.
- Add filters (by party, by speaker, by house).
- **False-positive cleanup:** if we're catching bare "AI" hits, work through the filtering logic with me — show me examples of what's being wrongly caught and what rule excludes them. This is judgment-heavy; don't just apply a regex silently.
- Light styling so it's presentable when embedded. Keep it clean and readable.

**Checkpoint:** the dashboard looks presentable and the data is trustworthy. Commit.

---

## Phase 5 — Automate & deploy (go fast, but explain the YAML)

- Write a GitHub Actions workflow that runs the fetcher on a schedule (**daily or weekly** — recommend one), commits any new data, and lets GitHub Pages redeploy automatically.
- Walk me through the workflow YAML line by line — this is the part I most want to understand, since scheduled-jobs-that-commit-their-own-output is the professional pattern I'm trying to learn.
- Confirm the final GitHub Pages URL works and produces a clean `<iframe>` embed snippet I can paste elsewhere.

**Checkpoint:** it updates itself on a timer and the embed works. Final commit.

---

## Constraints & preferences

- **Language:** Python for the fetching/storage; plain HTML/CSS/JS for the dashboard (no heavy framework unless you make a case for it).
- **Free and low-maintenance:** nothing that costs money or needs a server I have to babysit.
- **Embeddable is the whole point:** the output must drop cleanly into someone else's site via `<iframe>`.
- **Respect the source:** check the Hansard API's terms/rate limits and don't hammer it. Be a polite API citizen.
- **v1 is a single fixed dashboard** everyone sees identically. Do NOT build per-embed configuration (URL params etc.) yet — we'll add that later only if it's wanted.

## Out of scope for v1

- User accounts, login, any interactivity beyond filtering.
- A custom domain.
- Configurable/parameterised embeds.
- Sentiment analysis or topic modelling of the mentions (interesting later, not now).
- **"Latest developments" summary panel** (planned for later — will summarise recent activity; deferred to avoid LLM cost/keys in v1).
- **Theme categorization / filtering** (frontier risk, AI safety, economic impact, etc.) — planned for later. The schema is designed to accommodate it (see the `categories` field in Phase 2), but nothing populates it in v1. Note it's multi-label: a mention can belong to several themes at once.

---

## Open questions for me (ask before assuming)

1. Search strategy: broad-and-filter, or a curated term list? (your recommendation + my call)
2. Update frequency: daily or weekly?
3. How far back should the initial data pull go — everything available, or e.g. the last year?
