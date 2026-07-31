"""Client for the official UK Hansard API (hansard-api.parliament.uk).

Confirmed live against the real API on 2026-07-31 by reading its OpenAPI
spec at /swagger/docs/v1 and inspecting actual search responses — see the
Phase 1 checkpoint discussion for the raw examples this was built from.
"""

import html
import re
import time

import requests

BASE_URL = "https://hansard-api.parliament.uk"
PUBLIC_URL = "https://hansard.parliament.uk"
USER_AGENT = "ai-mention-tracker-research-script (contact: molliekoval@gmail.com)"

# Polite pacing: the API has no documented rate limit, so we self-impose one.
REQUEST_DELAY_SECONDS = 0.5

CONTRIBUTION_TYPES = ("Spoken", "Written", "Corrections")


def _slugify(title):
    return re.sub(r"[^A-Za-z0-9]", "", title)


def _debate_url(result):
    date = result["SittingDate"][:10]
    slug = _slugify(result["DebateSection"])
    return f"{PUBLIC_URL}/{result['House']}/{date}/debates/{result['DebateSectionExtId']}/{slug}"


def clean_contribution_text(text):
    """Written contributions in particular embed markup — column-number
    <span>s, <table>/<td> for data tables, custom <QuestionText>/<QNum>
    tags for Written Questions. Strip it all to plain readable text."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def search_contributions(search_term, contribution_type="Spoken", start_date=None, end_date=None, page_size=50):
    """Fetch all contributions matching search_term, paging to exhaustion.

    start_date/end_date are 'yyyy-mm-dd' strings or None.
    Yields raw result dicts (as returned by the API) with a 'HansardUrl'
    field added.
    """
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    skip = 0
    total = None

    while total is None or skip < total:
        params = {
            "queryParameters.searchTerm": search_term,
            "queryParameters.skip": skip,
            "queryParameters.take": page_size,
            "queryParameters.outputType": "List",
            "queryParameters.orderBy": "SittingDateAsc",
        }
        if start_date:
            params["queryParameters.startDate"] = start_date
        if end_date:
            params["queryParameters.endDate"] = end_date

        url = f"{BASE_URL}/search/contributions/{contribution_type}.json"
        response = session.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        total = data["TotalResultCount"]
        results = data["Results"]

        for result in results:
            result["HansardUrl"] = _debate_url(result)
            yield result

        skip += page_size
        if results:
            time.sleep(REQUEST_DELAY_SECONDS)
        else:
            break


def get_member_party(member_id, session=None):
    """Look up a member's party by MemberId via /search/members.json."""
    session = session or requests.Session()
    session.headers.setdefault("User-Agent", USER_AGENT)

    response = session.get(
        f"{BASE_URL}/search/members.json",
        params={"queryParameters.memberId": member_id},
        timeout=30,
    )
    response.raise_for_status()
    results = response.json().get("Results", [])
    return results[0].get("Party") if results else None
