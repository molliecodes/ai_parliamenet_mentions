import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from ai_tracker.fetch import run_fetch

DEFAULT_DB_PATH = Path(__file__).parent / "data" / "ai_mentions.db"
DEFAULT_BACKFILL_YEARS = 2


def main():
    parser = argparse.ArgumentParser(description="UK Parliament AI mention tracker")
    subparsers = parser.add_subparsers(dest="command", required=True)

    fetch_parser = subparsers.add_parser("fetch", help="Fetch mentions from Hansard and store them")
    fetch_parser.add_argument("--start", help="yyyy-mm-dd (default: 2 years ago)")
    fetch_parser.add_argument("--end", help="yyyy-mm-dd (default: today)")

    args = parser.parse_args()

    if args.command == "fetch":
        end = args.end or date.today().isoformat()
        start = args.start or (date.today() - timedelta(days=365 * DEFAULT_BACKFILL_YEARS)).isoformat()

        print(f"Fetching mentions from {start} to {end}...")
        seen, inserted = run_fetch(str(DEFAULT_DB_PATH), start_date=start, end_date=end)
        print(f"Saw {seen} distinct contributions, inserted {inserted} new rows.")


if __name__ == "__main__":
    main()
