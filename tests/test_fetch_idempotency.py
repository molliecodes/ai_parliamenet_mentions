"""Proves the concept from the Phase 2 checkpoint: running the fetcher twice
over the same window must not create duplicate rows. Hits the real Hansard
API (kept to a short window to stay a polite, fast test)."""

import sys
from pathlib import Path
from datetime import date, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from ai_tracker import db
from ai_tracker.fetch import run_fetch


def test_rerunning_fetch_does_not_duplicate_rows(tmp_path):
    db_path = str(tmp_path / "ai_mentions.db")
    end = date.today().isoformat()
    start = (date.today() - timedelta(days=7)).isoformat()

    seen_first, inserted_first = run_fetch(db_path, start_date=start, end_date=end)
    assert inserted_first == seen_first

    conn = db.get_connection(db_path)
    row_count_after_first_run = db.row_count(conn)
    conn.close()

    seen_second, inserted_second = run_fetch(db_path, start_date=start, end_date=end)
    assert seen_second == seen_first
    assert inserted_second == 0

    conn = db.get_connection(db_path)
    assert db.row_count(conn) == row_count_after_first_run
    conn.close()
