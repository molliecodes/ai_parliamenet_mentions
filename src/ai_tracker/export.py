"""Exports the SQLite database to static files the dashboard reads directly
via fetch() — no backend, no live queries, so the dashboard works from a
plain iframe embed anywhere.

mentions.json carries a truncated `text` (full contribution text averages
~3KB and runs up to ~160KB for a single speech; shipping all of it as JSON
loaded on every embed would be a slow, bandwidth-heavy page). The full text
stays in the database and in mentions.csv, and every row links to the
original Hansard record.
"""

import csv
import json
import sqlite3

TEXT_SNIPPET_LENGTH = 320


def _snippet(text):
    if len(text) <= TEXT_SNIPPET_LENGTH:
        return text
    return text[:TEXT_SNIPPET_LENGTH].rsplit(" ", 1)[0] + "…"


def _fetch_rows(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT speaker, party, house, date, debate_title, text, hansard_url, matched_terms "
        "FROM mentions ORDER BY date DESC"
    ).fetchall()
    conn.close()
    return rows


def export_json(db_path, out_path):
    rows = _fetch_rows(db_path)
    mentions = [
        {
            "speaker": row["speaker"],
            "party": row["party"],
            "house": row["house"],
            "date": row["date"],
            "debate_title": row["debate_title"],
            "text": _snippet(row["text"]),
            "hansard_url": row["hansard_url"],
        }
        for row in rows
    ]
    data = {"total_count": len(mentions), "mentions": mentions}
    with open(out_path, "w") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    return len(mentions)


def export_csv(db_path, out_path):
    rows = _fetch_rows(db_path)
    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["speaker", "party", "house", "date", "debate_title", "text", "hansard_url", "matched_terms"])
        for row in rows:
            writer.writerow(
                [row["speaker"], row["party"], row["house"], row["date"], row["debate_title"], row["text"], row["hansard_url"], row["matched_terms"]]
            )
    return len(rows)
