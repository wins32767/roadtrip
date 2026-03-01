import os
import time
import re
import requests
import pandas as pd

# -----------------------
# Config
# -----------------------
INPUT_CSV = "all-global-routes-cleaned.csv"
OUTPUT_CSV = "all-global-routes-with-photos.csv"
LOCATION_COL = "location"

UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
if not UNSPLASH_ACCESS_KEY:
    raise RuntimeError("Set env var UNSPLASH_ACCESS_KEY (Unsplash Access Key).")

HEADERS = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}

PER_PAGE = 15                 # consider more options so scoring can choose well
PAUSE_SECONDS = 0.35          # avoid hammering
ORIENTATION = "landscape"
CONTENT_FILTER = "high"

# -----------------------
# Landmark tuning knobs
# -----------------------

# For cities where you want ultra-identifiable imagery.
# Add/edit freely over time.
SIGNATURE_LANDMARK = {
    # Europe
    "Paris, France": "Eiffel Tower",
    "Rome, Italy": "Colosseum",
    "London, UK": "Big Ben",
    "London, United Kingdom": "Big Ben",
    "Amsterdam, Netherlands": "Canal houses",
    "Berlin, Germany": "Brandenburg Gate",
    "Prague, Czech Republic": "Charles Bridge",
    "Vienna, Austria": "Schonbrunn Palace",
    "Milan, Italy": "Duomo di Milano",
    "Barcelona, Spain": "Sagrada Familia",
    "Athens, Greece": "Acropolis",
    "Istanbul, Turkey": "Hagia Sophia",
    "Dubrovnik, Croatia": "Old Town walls",
    "Reykjavik, Iceland": "Hallgrimskirkja",

    # Americas
    "New York, USA": "Statue of Liberty",
    "Washington, DC, USA": "US Capitol",
    "San Francisco, USA": "Golden Gate Bridge",
    "Los Angeles, USA": "Hollywood sign",
    "Boston, USA": "Freedom Trail",

    # Middle East / Africa
    "Dubai, UAE": "Burj Khalifa",
    "Abu Dhabi, UAE": "Sheikh Zayed Grand Mosque",
    "Jerusalem": "Old City Jerusalem",
    "Cairo, Egypt": "Pyramids of Giza",
    "Giza, Egypt": "Pyramids of Giza",
    "Cape Town, South Africa": "Table Mountain",

    # Asia
    "Beijing, China": "Great Wall of China",
    "Shanghai, China": "The Bund skyline",
    "Hong Kong": "Victoria Harbour skyline",
    "Singapore": "Marina Bay Sands",
    "Tokyo, Japan": "Tokyo Tower",
    "Kyoto, Japan": "Fushimi Inari gates",
    "Seoul, South Korea": "Gyeongbokgung Palace",
    "Jaipur, India": "Hawa Mahal",
    "Agra, India": "Taj Mahal",
}

# For non-city/nature-heavy POIs where "skyline/landmark" queries are wrong.
NATURE_HINTS = {
    "Milford Sound, New Zealand": "Milford Sound fjord waterfall",
    "Queenstown, New Zealand": "Queenstown Lake Wakatipu mountains",
    "Great Ocean Road, Australia": "Twelve Apostles Great Ocean Road",
    "Cairns, Australia": "Great Barrier Reef coral aerial",
    "Komodo National Park, Indonesia": "Komodo dragon",
    "Mount Bromo, Indonesia": "Mount Bromo volcano sunrise",
    "Yogyakarta, Indonesia": "Borobudur sunrise",
    "Yosemite, USA": "Yosemite Valley El Capitan Half Dome",
    "Sahara Dunes (Erg Chebbi)": "Erg Chebbi sand dunes Morocco",
    "Iguazu Falls, Argentina/Brazil": "Iguazu Falls waterfall",
    "Victoria Falls": "Victoria Falls waterfall",
}

# Keywords that usually indicate identifiable, landmark-heavy photos
LANDMARK_KEYWORDS = {
    "eiffel", "colosseum", "big ben", "tower", "bridge", "cathedral", "temple", "palace",
    "castle", "monument", "mosque", "basilica", "opera house", "duomo", "acropolis",
    "old town", "skyline", "capitol", "gate", "wall", "harbour", "harbor", "stadium",
    "museum", "ruins", "pagoda", "fort", "square", "cathedral", "church",
    "pyramid", "pyramids", "sphinx", "taj mahal", "marina bay", "bund",
    "hagia sophia", "brandenburg", "charles bridge", "sagrada",
}

# Words that often correlate with "pretty but not place-identifying" shots
VIBEY_BUT_VAGUE = {
    "sunset", "sunrise", "portrait", "people", "person", "model", "food",
    "coffee", "interior", "plant", "cat", "dog", "hands", "laptop",
}

QUERY_SUFFIXES_LANDMARKY = [
    "famous landmark",
    "iconic landmark",
    "landmark",
    "skyline",
    "city center",
]

# -----------------------
# Helpers
# -----------------------

def clean_location(s: str) -> str:
    s = str(s or "").strip()
    s = re.sub(r"(\\n|/n)+$", "", s).strip()
    s = re.sub(r"[\\/]+$", "", s).strip()
    return s

def build_query_candidates(loc: str) -> list[str]:
    """
    Produce queries in priority order to bias toward identifiable images.
    """
    loc = clean_location(loc)
    candidates = []

    # Nature/POI-specific hint first
    if loc in NATURE_HINTS:
        candidates.append(NATURE_HINTS[loc])

    # Signature landmark first for major cities
    if loc in SIGNATURE_LANDMARK:
        lm = SIGNATURE_LANDMARK[loc]
        candidates.extend([
            f"{lm} {loc}",
            f"{loc} {lm}",
            f"{loc} landmark",
        ])
    else:
        # Generic landmark bias
        candidates.extend([f"{loc} {s}" for s in QUERY_SUFFIXES_LANDMARKY])

    # Fall back
    candidates.append(loc)

    # De-dupe while preserving order
    seen = set()
    out = []
    for c in candidates:
        c = c.strip()
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out

def unsplash_search(query: str, per_page: int = PER_PAGE) -> list[dict]:
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": query,
        "per_page": per_page,
        "orientation": ORIENTATION,
        "content_filter": CONTENT_FILTER,
    }
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)

    # Handle rate limiting / forbidden gracefully
    if r.status_code == 403:
        limit = r.headers.get("X-Ratelimit-Limit", "")
        remaining = r.headers.get("X-Ratelimit-Remaining", "")
        reset = r.headers.get("X-Ratelimit-Reset", "")
        raise RuntimeError(f"Unsplash 403 (likely rate limit). Limit={limit} Remaining={remaining} Reset={reset}")

    r.raise_for_status()
    return r.json().get("results", [])

def text_blob(p: dict) -> str:
    return " ".join([
        str(p.get("alt_description") or ""),
        str(p.get("description") or ""),
    ]).lower()

def landmark_bonus(p: dict, loc: str) -> int:
    """
    Bonus points if metadata looks like a landmark photo.
    """
    t = text_blob(p)
    bonus = 0

    for w in LANDMARK_KEYWORDS:
        if w in t:
            bonus += 900

    # Penalize "pretty but vague" signals (light penalty, not a veto)
    for w in VIBEY_BUT_VAGUE:
        if w in t:
            bonus -= 100

    # Extra bonus if the signature landmark name appears in metadata
    if loc in SIGNATURE_LANDMARK:
        lm = SIGNATURE_LANDMARK[loc].lower()
        # check key tokens too
        if lm in t:
            bonus += 2500
        else:
            # token match partial (e.g. "eiffel" or "colosseum")
            for token in lm.split():
                if len(token) >= 5 and token in t:
                    bonus += 700

    return bonus

def pick_best(results: list[dict], loc: str) -> dict:
    """
    Score results for identifiability, not just popularity.
    """
    if not results:
        return {}

    def score(p: dict) -> float:
        likes = int(p.get("likes", 0) or 0)
        width = int(p.get("width", 0) or 0)
        height = int(p.get("height", 1) or 1)
        aspect = width / height if height else 1.0

        landscape_bonus = 400 if aspect >= 1.2 else 0
        has_text_bonus = 250 if (p.get("alt_description") or p.get("description")) else 0

        return likes + landscape_bonus + has_text_bonus + landmark_bonus(p, loc)

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
        "likes": str(p.get("likes", "")),  # keep string-safe for CSV/pandas
        "photographer": p.get("user", {}).get("name", ""),
        "photographer_url": p.get("user", {}).get("links", {}).get("html", ""),
        "unsplash_page": p.get("links", {}).get("html", ""),
        "query_used": query_used,
    }

def apply_results_and_save(df: pd.DataFrame, results_by_location: dict, out_cols: list[str]) -> None:
    for c in out_cols:
        df[c] = df[LOCATION_COL].map(lambda x: results_by_location.get(x, {}).get(c, ""))
    df.to_csv(OUTPUT_CSV, index=False)
    print("Wrote:", OUTPUT_CSV)

# -----------------------
# Main
# -----------------------

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

    # Ensure output columns exist and are flexible dtype
    for c in out_cols:
        if c not in df.columns:
            df[c] = pd.Series([pd.NA] * len(df), dtype="object")

    unique_locs = sorted(
        {loc for loc in df[LOCATION_COL].dropna().astype(str).str.strip().tolist()
         if loc and loc.lower() != "nan"}
    )
    print(f"Unique locations: {len(unique_locs)}")

    results_by_location: dict[str, dict] = {}

    for i, loc in enumerate(unique_locs, start=1):
        # If already has a photo_id in the input, skip (lets you rerun without redoing everything)
        # Comment this out if you always want fresh picks.
        existing = df.loc[df[LOCATION_COL] == loc, "photo_id"]
        if len(existing) and str(existing.iloc[0]) not in ("", "nan", "NaN", "None", "<NA>"):
            # Still store mapping so apply_results works
            # Use first row's existing values
            row0 = df.loc[df[LOCATION_COL] == loc].iloc[0]
            results_by_location[loc] = {c: ("" if pd.isna(row0.get(c)) else str(row0.get(c))) for c in out_cols}
            continue

        candidates = build_query_candidates(loc)

        try:
            chosen = {}
            used_query = ""
            for q in candidates:
                results = unsplash_search(q, per_page=PER_PAGE)
                if results:
                    best = pick_best(results, loc)
                    chosen = best
                    used_query = q
                    break

            info = extract_fields(chosen, query_used=used_query or candidates[-1])
            results_by_location[loc] = info
            print(f"[{i}/{len(unique_locs)}] {loc} -> {info['photo_id']} (likes={info['likes']}) q='{info['query_used']}'")

        except RuntimeError as e:
            # Rate limited: save partial output and exit cleanly
            print(f"STOPPING EARLY: {e}")
            apply_results_and_save(df, results_by_location, out_cols)
            return

        except requests.RequestException as e:
            # Network / API hiccup: store blanks and keep going
            print(f"[{i}/{len(unique_locs)}] ERROR {loc}: {e}")
            results_by_location[loc] = extract_fields({}, query_used=candidates[0] if candidates else loc)

        time.sleep(PAUSE_SECONDS)

    apply_results_and_save(df, results_by_location, out_cols)

if __name__ == "__main__":
    main()
