"""SQLite storage for AI mentions.

One row per contribution (not per matching term) — a contribution that
matches several curated terms lists them all in matched_terms, so the
dashboard never has to dedupe. Idempotency comes from UNIQUE(contribution_ext_id)
plus INSERT OR IGNORE: Hansard corrections are published as separate
'Corrections'-type records rather than in-place edits to the original
contribution, so ignoring a duplicate contribution_ext_id never loses
an update — there isn't one to lose. See the Phase 2 checkpoint discussion.
"""

import json
import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS mentions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    contribution_ext_id TEXT NOT NULL UNIQUE,
    member_id           INTEGER,
    speaker             TEXT NOT NULL,
    party               TEXT,
    house               TEXT NOT NULL,
    date                TEXT NOT NULL,
    debate_title        TEXT NOT NULL,
    text                TEXT NOT NULL,
    hansard_url         TEXT NOT NULL,
    matched_terms       TEXT NOT NULL,
    categories          TEXT,
    excluded            INTEGER NOT NULL DEFAULT 0,
    exclusion_reason    TEXT,
    fetched_at          TEXT NOT NULL
);
"""


def get_connection(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute(SCHEMA)
    existing_columns = {row[1] for row in conn.execute("PRAGMA table_info(mentions)")}
    if "excluded" not in existing_columns:
        conn.execute("ALTER TABLE mentions ADD COLUMN excluded INTEGER NOT NULL DEFAULT 0")
    if "exclusion_reason" not in existing_columns:
        conn.execute("ALTER TABLE mentions ADD COLUMN exclusion_reason TEXT")
    conn.commit()
    return conn


def insert_mention(conn, mention):
    """Insert a mention dict; returns True if a new row was added, False if it already existed."""
    cursor = conn.execute(
        """
        INSERT OR IGNORE INTO mentions
            (contribution_ext_id, member_id, speaker, party, house, date,
             debate_title, text, hansard_url, matched_terms, categories, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            mention["contribution_ext_id"],
            mention["member_id"],
            mention["speaker"],
            mention["party"],
            mention["house"],
            mention["date"],
            mention["debate_title"],
            mention["text"],
            mention["hansard_url"],
            json.dumps(mention["matched_terms"]),
            None,
            mention["fetched_at"],
        ),
    )
    conn.commit()
    return cursor.rowcount == 1


def row_count(conn):
    return conn.execute("SELECT COUNT(*) FROM mentions").fetchone()[0]
