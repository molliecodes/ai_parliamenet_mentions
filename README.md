# UK Parliament AI Mention Tracker

Tracks every mention of AI in UK Parliament (Commons and Lords) using the
official [Hansard API](https://hansard-api.parliament.uk), stores them in a
local SQLite database, and renders a static HTML dashboard designed to be
embedded in any website via an `<iframe>`. Data updates itself daily via
GitHub Actions and deploys to GitHub Pages — no server, no database service,
no hosting bill.

Hansard data is published under the [Open Parliament
Licence](https://www.parliament.uk/site-information/copyright-parliament/open-parliament-licence/).

## Status

All v1 phases complete. Live at
**https://molliecodes.github.io/ai_parliamenet_mentions/**, updating itself
daily via GitHub Actions.

- [x] Phase 0 — project setup
- [x] Phase 1 — Hansard API fetch
- [x] Phase 2 — SQLite storage
- [x] Phase 3 — static dashboard
- [x] Phase 4 — charts, filters, false-positive cleanup
- [x] Phase 5 — automation & deployment

## Embedding

```html
<iframe
  src="https://molliecodes.github.io/ai_parliamenet_mentions/"
  width="100%"
  height="800"
  style="border:none;"
></iframe>
```

800px is a reasonable default that shows the chart, filters, and a good
chunk of the table without the embed dominating a page — the page itself
scrolls internally within that height, since the table isn't paginated.
Adjust to taste for your layout.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Usage

```bash
python cli.py fetch     # pull mentions from Hansard into data/ai_mentions.db
python cli.py filter    # flag known false positives (see src/ai_tracker/filters.py)
python cli.py export    # write docs/data/mentions.json + .csv for the dashboard
```

Open `docs/index.html` via a local server (e.g. `python3 -m http.server` from
`docs/`) to view the dashboard.
