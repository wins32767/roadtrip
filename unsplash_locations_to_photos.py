import os
import time
import re
import requests
import pandas as pd

# -----------------------
# Config
# -----------------------
INPUT_CSV = "all-global-routes-cleaned.csv"     # your input
OUTPUT_CSV = "all-global-routes-with-photos.csv"

LOCATION_COL = "location"

UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
if not UNSPLASH_ACCESS_KEY:
    raise RuntimeError("Set env var UNSPLASH_ACCESS_KEY (your Unsplash Access Key).")

HEADERS = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}

PER_PAGE = 10                   # how many results to consider per location
PAUSE_SECONDS = 0.35            # be polite (and avoid rate limits)
ORIENTATION = "landscape"       # better for game cards / thumbnails
CONTENT_FILTER = "high"         # safer

# Optional: nudge search toward iconic imagery
EXTRA_HINTS = {
    "Milan, Italy": "Milan Duomo cathedral",
    "Sydney, Australia": "Sydney Opera House",
    "Cairns, Australia": "Great Barrier Reef coral aerial",
    "Queenstown, New Zealand": "Queenstown Lake Wakatipu mountains",
    "Milford Sound, New Zealand": "Milford Sound fjord waterfall",
    "Komodo National Park, Indonesia": "Komodo dragon",
    "Mount Bromo, Indonesia": "Mount Bromo volcano sunrise",
    "Yogyakarta, Indonesia": "Borobudur sunrise",
    "Cannon Beach, Oregon, USA": "Haystack Rock Cannon Beach",
    "Big Sur, California, USA": "Bixby Creek Bridge Big Sur",
    "Yosemite National Park, California, USA": "Yosemite Valley El Capitan",
}

def clean_location(s: str) -> str:
    s = str(s or "").strip()
    # remove trailing / or \ or newline artifacts
    s = re.sub(r"(\\n|/n)+$", "", s).strip()
    s = re.sub(r"[\\/]+$", "", s).strip()
    return s

def build_query(loc: str) -> str:
    loc = clean_location(loc)
    return EXTRA_HINTS.get(loc, loc)

def unsplash_search(query: str, per_page: int = PER_PAGE) -> list[dict]:
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": query,
        "per_page": per_page,
        "orientation": ORIENTATION,
        "content_filter": CONTENT_FILTER,
    }
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)

    # Rate limit or forbidden: bail out gracefully
    if r.status_code == 403:
        # Helpful debug without leaking secrets
        limit = r.headers.get("X-Ratelimit-Limit", "")
        remaining = r.headers.get("X-Ratelimit-Remaining", "")
        reset = r.headers.get("X-Ratelimit-Reset", "")
        raise RuntimeError(
            f"Unsplash 403 (likely rate limit). "
            f"Limit={limit} Remaining={remaining} Reset={reset}"
        )

    r.raise_for_status()
    return r.json().get("results", [])

def pick_best(results: list[dict]) -> dict:
    """
    Choose best candidate.
    Primary: most likes.
    Tie-breakers: wider images + has description/alt text (often more relevant).
    """
    if not results:
        return {}

    def score(p: dict) -> tuple:
        likes = p.get("likes", 0) or 0
        width = p.get("width", 0) or 0
        height = p.get("height", 1) or 1
        aspect = width / height
        # prefer landscape-ish
        landscape_bonus = 1 if aspect >= 1.2 else 0
        has_text = 1 if (p.get("alt_description") or p.get("description")) else 0
        return (likes, landscape_bonus, has_text, width)

    return max(results, key=score)

def extract_fields(p: dict, query_used: str) -> dict:
    if not p:
        return {
            "photo_url": "",
            "photo_thumb": "",
            "photo_small": "",
            "photo_id": "",
            "likes": "",
            "photographer": "",
            "photographer_url": "",
            "unsplash_page": "",
            "query_used": query_used,
        }

    return {
        "photo_url": p.get("urls", {}).get("regular", ""),
        "photo_thumb": p.get("urls", {}).get("thumb", ""),
        "photo_small": p.get("urls", {}).get("small", ""),
        "photo_id": p.get("id", ""),
        "likes": str(p.get("likes", "")) if p else "",
        "photographer": p.get("user", {}).get("name", ""),
        "photographer_url": p.get("user", {}).get("links", {}).get("html", ""),
        "unsplash_page": p.get("links", {}).get("html", ""),
        "query_used": query_used,
    }

def main():
    df = pd.read_csv(INPUT_CSV)

    if LOCATION_COL not in df.columns:
        raise ValueError(f"CSV must contain a '{LOCATION_COL}' column.")

    df[LOCATION_COL] = df[LOCATION_COL].apply(clean_location)

    out_cols = [
        "photo_url",
        "photo_thumb",
        "photo_small",
        "photo_id",
        "likes",
        "photographer",
        "photographer_url",
        "unsplash_page",
        "query_used",
    ]
    for c in out_cols:
        if c not in df.columns:
            df[c] = ""

    unique_locs = sorted(
        {loc for loc in df[LOCATION_COL].dropna().astype(str).str.strip().tolist() if loc and loc.lower() != "nan"}
    )

    print(f"Unique locations: {len(unique_locs)}")
    cache: dict[str, dict] = {}

    for i, loc in enumerate(unique_locs, start=1):
        query = build_query(loc)

        try:
            results = unsplash_search(query, per_page=PER_PAGE)
            best = pick_best(results)
            info = extract_fields(best, query_used=query)
        except RuntimeError as e:
            print(f"STOPPING EARLY: {e}")
            cache[loc] = extract_fields({}, query_used=query)
        
            # write partial output immediately
            for idx, row_loc in df[LOCATION_COL].items():
                if row_loc in cache:
                    for c in out_cols:
                        df.at[idx, c] = cache[row_loc].get(c, "")
            df.to_csv(OUTPUT_CSV, index=False)
            print("Wrote partial:", OUTPUT_CSV)
            return

        cache[loc] = info
        time.sleep(PAUSE_SECONDS)

    # Apply cache to each row
    for idx, loc in df[LOCATION_COL].items():
        info = cache.get(loc, None)
        if not info:
            continue
        for c in out_cols:
            df.at[idx, c] = info.get(c, "")

    df.to_csv(OUTPUT_CSV, index=False)
    print("Wrote:", OUTPUT_CSV)

if __name__ == "__main__":
    main()
