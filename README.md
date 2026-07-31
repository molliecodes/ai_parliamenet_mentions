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
- [ ] Phase 1 — Hansard API fetch
- [ ] Phase 2 — SQLite storage
- [ ] Phase 3 — static dashboard
- [ ] Phase 4 — charts, filters, false-positive cleanup
- [ ] Phase 5 — automation & deployment

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Usage

Not yet available — lands in Phase 2 (`python cli.py fetch`) and Phase 3
(`python cli.py export`).
