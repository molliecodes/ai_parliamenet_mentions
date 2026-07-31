"""Orchestrates the Hansard client + database: runs the search strategy,
merges multi-term matches into single rows, and stores them idempotently.
"""

from datetime import datetime, timezone

from ai_tracker import db
from ai_tracker.hansard_client import clean_contribution_text, get_member_party, search_contributions

# Curated terms chosen for precision; bare "AI" added separately for recall
# (per the recall-vs-precision decision — bare-AI hits get filtered for
# false positives in Phase 4, not here).
CURATED_TERMS = [
    "artificial intelligence",
    "machine learning",
    "large language model",
    "generative AI",
    "neural network",
    "algorithmic",
    "chatbot",
]
BARE_TERM = "AI"

# Corrections are separate correction records, not original mentions —
# searching them would risk near-duplicate content of an already-counted
# mention. See the Phase 2 idempotency discussion.
CONTRIBUTION_TYPES = ("Spoken", "Written")


def run_fetch(db_path, start_date=None, end_date=None):
    """Fetch all mentions in [start_date, end_date], store idempotently.

    Returns (rows_seen, rows_inserted).
    """
    conn = db.get_connection(db_path)
    contributions = {}
    member_party_cache = {}

    for term in CURATED_TERMS + [BARE_TERM]:
        for contribution_type in CONTRIBUTION_TYPES:
            for result in search_contributions(term, contribution_type=contribution_type, start_date=start_date, end_date=end_date):
                ext_id = result["ContributionExtId"]
                if ext_id not in contributions:
                    contributions[ext_id] = {"result": result, "matched_terms": set()}
                contributions[ext_id]["matched_terms"].add(term)

    fetched_at = datetime.now(timezone.utc).isoformat()
    inserted = 0

    for ext_id, entry in contributions.items():
        result = entry["result"]
        member_id = result["MemberId"]

        if member_id not in member_party_cache:
            member_party_cache[member_id] = get_member_party(member_id)
        party = member_party_cache[member_id]

        mention = {
            "contribution_ext_id": ext_id,
            "member_id": member_id,
            "speaker": result["MemberName"],
            "party": party,
            "house": result["House"],
            "date": result["SittingDate"][:10],
            "debate_title": result["DebateSection"],
            "text": clean_contribution_text(result["ContributionTextFull"]),
            "hansard_url": result["HansardUrl"],
            "matched_terms": sorted(entry["matched_terms"]),
            "fetched_at": fetched_at,
        }

        if db.insert_mention(conn, mention):
            inserted += 1

    conn.close()
    return len(contributions), inserted
