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

Work in progress, built phase by phase:

- [x] Phase 0 — project setup
- [x] Phase 1 — Hansard API fetch
- [x] Phase 2 — SQLite storage
- [x] Phase 3 — static dashboard
- [x] Phase 4 — charts, filters, false-positive cleanup
- [ ] Phase 5 — automation & deployment

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
