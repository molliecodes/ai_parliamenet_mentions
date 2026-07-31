"""False-positive handling for bare-"AI" matches.

Reviewed all 2,910 bare-"AI"-only mentions from the 2-year backfill (random
sampling, targeted checks for known UK-Parliament confusables, and an
exhaustive sweep for lowercase-only matches) and found a false-positive rate
of ~0.05-0.07% (2-3 rows out of 4,289 total mentions) — far lower than
expected, because Hansard's search does true whole-word matching on a
professionally-transcribed record, not noisy substring matching.

Given how rare and idiosyncratic each case was, this is a manually curated
list rather than a general regex rule: a rule broad enough to catch
"AI = Avian Influenza" or "(ai)" as legislative clause-lettering would also
risk excluding genuine, extremely common phrasing like "artificial
intelligence (AI)". Rows are flagged (excluded=1), never deleted, so they
stay reviewable. This list won't catch future recurrences automatically —
it relies on periodically eyeballing new bare-AI mentions the way this
review did.
"""

KNOWN_FALSE_POSITIVES = {
    "F495973F-244F-46C1-8C67-CBB34CA4B87F": (
        "'AI' means Avian Influenza (bird flu), not artificial intelligence — "
        "the whole speech is about farm biosecurity ('Biosecurity' debate)."
    ),
    "3976D38A-D766-44E1-A8E2-EACD440FE6DC": (
        "'AI' matched legislative sub-clause lettering '(ai)' in an amendment "
        "list (a, b, ... aa, ab, ... ai, aj, ...), not the acronym."
    ),
    "567C0BC0-51E2-4DE8-915D-71F3F644455A": (
        "'AI' matched a typographic artifact in a cited report's stylized "
        "title ('Two Brit ai ns'); the debate itself is about public trust "
        "in government, not AI."
    ),
}


def apply_known_exclusions(conn):
    """Marks rows in KNOWN_FALSE_POSITIVES as excluded. Returns count updated."""
    updated = 0
    for contribution_ext_id, reason in KNOWN_FALSE_POSITIVES.items():
        cursor = conn.execute(
            "UPDATE mentions SET excluded = 1, exclusion_reason = ? WHERE contribution_ext_id = ?",
            (reason, contribution_ext_id),
        )
        updated += cursor.rowcount
    conn.commit()
    return updated
