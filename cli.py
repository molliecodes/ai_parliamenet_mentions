import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from ai_tracker import db
from ai_tracker.fetch import run_fetch
from ai_tracker.export import export_json, export_csv
from ai_tracker.filters import apply_known_exclusions

DEFAULT_DB_PATH = Path(__file__).parent / "data" / "ai_mentions.db"
DEFAULT_BACKFILL_YEARS = 2
DOCS_DATA_DIR = Path(__file__).parent / "docs" / "data"


def main():
    parser = argparse.ArgumentParser(description="UK Parliament AI mention tracker")
    subparsers = parser.add_subparsers(dest="command", required=True)

    fetch_parser = subparsers.add_parser("fetch", help="Fetch mentions from Hansard and store them")
    fetch_parser.add_argument("--start", help="yyyy-mm-dd (default: 2 years ago)")
    fetch_parser.add_argument("--end", help="yyyy-mm-dd (default: today)")

    subparsers.add_parser("export", help="Export the database to docs/data/ for the dashboard")
    subparsers.add_parser("filter", help="Apply known false-positive exclusions")

    args = parser.parse_args()

    if args.command == "fetch":
        end = args.end or date.today().isoformat()
        start = args.start or (date.today() - timedelta(days=365 * DEFAULT_BACKFILL_YEARS)).isoformat()

        print(f"Fetching mentions from {start} to {end}...")
        seen, inserted = run_fetch(str(DEFAULT_DB_PATH), start_date=start, end_date=end)
        print(f"Saw {seen} distinct contributions, inserted {inserted} new rows.")

    elif args.command == "export":
        DOCS_DATA_DIR.mkdir(parents=True, exist_ok=True)
        json_count = export_json(str(DEFAULT_DB_PATH), str(DOCS_DATA_DIR / "mentions.json"))
        csv_count = export_csv(str(DEFAULT_DB_PATH), str(DOCS_DATA_DIR / "mentions.csv"))
        print(f"Exported {json_count} mentions to docs/data/mentions.json and {csv_count} to mentions.csv")

    elif args.command == "filter":
        conn = db.get_connection(str(DEFAULT_DB_PATH))
        updated = apply_known_exclusions(conn)
        conn.close()
        print(f"Marked {updated} known false positives as excluded.")


if __name__ == "__main__":
    main()
