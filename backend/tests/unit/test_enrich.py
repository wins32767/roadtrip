"""
Unit tests for data/enrich.py

All network calls are mocked — no real HTTP in these tests.

Import strategy: a conftest.py at the backend/ root (or a pyproject.toml
pythonpath setting) is the preferred way to put enrich on sys.path.  The
manual insert below is kept as a fallback but scoped to a single location
so it is easy to remove once the project has a proper package layout.
"""

import csv
import sys
from pathlib import Path
from unittest.mock import MagicMock, call, patch

import pytest

# ── Path setup ────────────────────────────────────────────────────────────────
# This file lives at backend/tests/unit/test_enrich.py.
# enrich.py lives at backend/data/enrich.py.
# parents[0] = backend/tests/unit/
# parents[1] = backend/tests/
# parents[2] = backend/
# parents[3] = <repo-root>/
# So backend/data is parents[2] / "data".
#
# To remove this manual manipulation entirely, add the following to
# backend/pytest.ini or pyproject.toml:
#   [tool.pytest.ini_options]
#   pythonpath = ["data"]   # relative to backend/
_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
if str(_DATA_DIR) not in sys.path:
    sys.path.insert(0, str(_DATA_DIR))

import enrich


# ── Fixtures & helpers ────────────────────────────────────────────────────────

VALID_HEADER = "route_name,stop_order,location"

def write_input(path: Path, content: str) -> Path:
    p = path / "input.csv"
    p.write_text(content.strip() + "\n", encoding="utf-8")
    return p

def read_output(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))

def make_enriched_output(path: Path, rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=enrich.OUTPUT_FIELDNAMES)
        w.writeheader()
        w.writerows(rows)

def mock_geocode_ok(location: str) -> tuple[float, float]:
    return (10.0, 20.0)

def mock_photo_ok(location: str, access_key: str) -> str:
    return "https://example.com/photo.jpg"

MINIMAL_INPUT = f"""\
{VALID_HEADER}
Route Alpha,1,Stop One
Route Alpha,2,Stop Two
"""

_CACHED_ROW = {
    "route_name": "Route Alpha",
    "stop_order": "1",
    "location":   "Stop One",
    "lat":        "55.0",
    "lng":        "33.0",
    "photo_url":  "https://cached.com/p.jpg",
    "is_decoy":   "false",
}


# ── geocode() unit tests ──────────────────────────────────────────────────────

def test_geocode_returns_lat_lng():
    mock_resp = MagicMock()
    mock_resp.json.return_value = [{"lat": "51.5074", "lon": "-0.1278"}]
    with patch("enrich.requests.get", return_value=mock_resp):
        lat, lng = enrich.geocode("London")
    assert lat == 51.5074
    assert lng == -0.1278


def test_geocode_raises_on_empty_results():
    mock_resp = MagicMock()
    mock_resp.json.return_value = []
    with patch("enrich.requests.get", return_value=mock_resp):
        with pytest.raises(ValueError, match="no results"):
            enrich.geocode("Nowhere Real")


def test_geocode_raises_on_http_error():
    mock_resp = MagicMock()
    mock_resp.raise_for_status.side_effect = Exception("500 Server Error")
    with patch("enrich.requests.get", return_value=mock_resp):
        with pytest.raises(Exception, match="500"):
            enrich.geocode("London")


def test_geocode_retries_on_transient_network_error():
    """Network errors should be retried up to NOMINATIM_RETRY times."""
    good_resp = MagicMock()
    good_resp.json.return_value = [{"lat": "51.5074", "lon": "-0.1278"}]

    import requests as req
    fail = req.RequestException("timeout")

    with patch("enrich.requests.get", side_effect=[fail, good_resp]), \
         patch("enrich.time.sleep"):
        lat, lng = enrich.geocode("London")

    assert lat == 51.5074
    assert lng == -0.1278


def test_geocode_raises_after_all_retries_exhausted():
    """If every attempt fails the final RequestException should propagate."""
    import requests as req
    fail = req.RequestException("timeout")

    with patch("enrich.requests.get", side_effect=[fail] * (enrich.NOMINATIM_RETRY + 1)), \
         patch("enrich.time.sleep"):
        with pytest.raises(req.RequestException):
            enrich.geocode("London")


# ── fetch_photo_url() unit tests ──────────────────────────────────────────────

def test_fetch_photo_url_returns_regular_url():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"results": [
        {"urls": {"regular": "https://example.com/photo.jpg"},
         "likes": 100, "width": 1600, "height": 900,
         "alt_description": "Eiffel Tower Paris",
         "description": None},
    ]}
    with patch("enrich.requests.get", return_value=mock_resp):
        url = enrich.fetch_photo_url("Paris, France", "fake-key")
    assert url == "https://example.com/photo.jpg"


def test_fetch_photo_url_raises_if_no_results_on_any_query():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"results": []}
    with patch("enrich.requests.get", return_value=mock_resp), \
         patch("enrich.time.sleep"):
        with pytest.raises(ValueError, match="no photos"):
            enrich.fetch_photo_url("Fictional Place", "fake-key")


def test_fetch_photo_url_picks_highest_scoring_photo():
    low  = {"urls": {"regular": "https://example.com/low.jpg"},
             "likes": 10, "width": 800, "height": 600,
             "alt_description": None, "description": None}
    high = {"urls": {"regular": "https://example.com/high.jpg"},
             "likes": 500, "width": 1600, "height": 900,
             "alt_description": "Eiffel Tower landmark Paris",
             "description": None}
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"results": [low, high]}
    with patch("enrich.requests.get", return_value=mock_resp):
        url = enrich.fetch_photo_url("Paris, France", "fake-key")
    assert url == "https://example.com/high.jpg"


def test_fetch_photo_url_falls_back_to_second_query_when_first_empty():
    """
    The fallback query path is core to the enrichment strategy.
    First call returns no results; second call returns a valid photo.
    """
    empty_resp = MagicMock()
    empty_resp.json.return_value = {"results": []}

    hit_resp = MagicMock()
    hit_resp.json.return_value = {"results": [
        {"urls": {"regular": "https://example.com/fallback.jpg"},
         "likes": 50, "width": 1200, "height": 800,
         "alt_description": "city skyline", "description": None},
    ]}

    with patch("enrich.requests.get", side_effect=[empty_resp, hit_resp]), \
         patch("enrich.time.sleep"):
        url = enrich.fetch_photo_url("Smallville, KS", "fake-key")

    assert url == "https://example.com/fallback.jpg"


def test_fetch_photo_url_retries_on_transient_network_error():
    """A single transient error on the first query should be retried."""
    import requests as req

    hit_resp = MagicMock()
    hit_resp.json.return_value = {"results": [
        {"urls": {"regular": "https://example.com/photo.jpg"},
         "likes": 10, "width": 1200, "height": 800,
         "alt_description": None, "description": None},
    ]}

    with patch("enrich.requests.get", side_effect=[req.RequestException("timeout"), hit_resp]), \
         patch("enrich.time.sleep"):
        url = enrich.fetch_photo_url("Paris, France", "fake-key")

    assert url == "https://example.com/photo.jpg"


def test_fetch_photo_url_does_not_sleep_after_last_query():
    """
    We should only sleep between queries, not after the final attempt.
    With a single-query location and an immediate hit, sleep is never called.
    """
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"results": [
        {"urls": {"regular": "https://example.com/photo.jpg"},
         "likes": 10, "width": 1200, "height": 800,
         "alt_description": None, "description": None},
    ]}

    with patch("enrich.requests.get", return_value=mock_resp), \
         patch("enrich.time.sleep") as mock_sleep:
        enrich.fetch_photo_url("Paris, France", "fake-key")

    mock_sleep.assert_not_called()


# ── _is_enriched() tests ──────────────────────────────────────────────────────

@pytest.mark.parametrize("row,expected", [
    ({"lat": "10.0", "lng": "20.0", "photo_url": "https://x.com/p.jpg", "is_decoy": "false"}, True),
    ({"lat": "",     "lng": "20.0", "photo_url": "https://x.com/p.jpg", "is_decoy": "false"}, False),
    ({"lat": "10.0", "lng": "",     "photo_url": "https://x.com/p.jpg", "is_decoy": "false"}, False),
    ({"lat": "10.0", "lng": "20.0", "photo_url": "",                    "is_decoy": "false"}, False),
    ({"lat": "10.0", "lng": "20.0", "photo_url": "https://x.com/p.jpg", "is_decoy": ""},      False),
    ({},                                                                                        False),
])
def test_is_enriched(row, expected):
    assert enrich._is_enriched(row) == expected


# ── run() integration tests ───────────────────────────────────────────────────
# Tests call enrich.run() directly — no sys.argv patching required.

@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_happy_path(mock_geo, mock_photo, mock_sleep, tmp_path):
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"

    rc = enrich.run(inp, out, force=False, access_key="fake-key")

    assert rc == 0
    rows = read_output(out)
    assert len(rows) == 2
    assert rows[0]["location"]  == "Stop One"
    assert rows[0]["lat"]       == "10.000000"
    assert rows[0]["photo_url"] == "https://example.com/photo.jpg"
    assert rows[0]["is_decoy"]  == "false"


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_geocode_called_for_correct_locations(mock_geo, mock_photo, mock_sleep, tmp_path):
    """Verify which locations are actually requested, not just the count."""
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"

    enrich.run(inp, out, force=False, access_key="fake-key")

    assert mock_geo.call_args_list == [call("Stop One"), call("Stop Two")]


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_skips_already_enriched_rows(mock_geo, mock_photo, mock_sleep, tmp_path):
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"
    make_enriched_output(out, [_CACHED_ROW])

    rc = enrich.run(inp, out, force=False, access_key="fake-key")

    assert rc == 0
    rows = read_output(out)
    # Stop One should use cached coords, Stop Two should be freshly fetched
    assert rows[0]["lat"] == "55.0"
    assert rows[1]["lat"] == "10.000000"
    assert mock_geo.call_count == 1  # only called for Stop Two
    assert mock_geo.call_args == call("Stop Two")


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_force_refetches_enriched_rows(mock_geo, mock_photo, mock_sleep, tmp_path):
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"
    make_enriched_output(out, [_CACHED_ROW])

    rc = enrich.run(inp, out, force=True, access_key="fake-key")

    assert rc == 0
    assert mock_geo.call_count == 2  # both rows re-fetched
    assert mock_geo.call_args_list == [call("Stop One"), call("Stop Two")]


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_force_with_no_existing_output(mock_geo, mock_photo, mock_sleep, tmp_path):
    """--force when no output file exists yet should not error."""
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"
    assert not out.exists()

    rc = enrich.run(inp, out, force=True, access_key="fake-key")

    assert rc == 0
    assert mock_geo.call_count == 2


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=ValueError("no results"))
def test_run_writes_partial_output_and_exits_nonzero_on_geocode_failure(
        mock_geo, mock_photo, mock_sleep, tmp_path):
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"

    rc = enrich.run(inp, out, force=False, access_key="fake-key")

    assert rc == 1
    assert out.exists()  # partial output written


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=ValueError("no photos"))
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_writes_partial_output_and_exits_nonzero_on_photo_failure(
        mock_geo, mock_photo, mock_sleep, tmp_path):
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"

    rc = enrich.run(inp, out, force=False, access_key="fake-key")

    assert rc == 1
    assert out.exists()


def test_run_exits_nonzero_if_access_key_missing(tmp_path):
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"

    rc = enrich.run(inp, out, force=False, access_key="")
    assert rc == 1


def test_run_exits_nonzero_if_input_missing(tmp_path):
    rc = enrich.run(
        tmp_path / "nope.csv",
        tmp_path / "out.csv",
        force=False,
        access_key="fake-key",
    )
    assert rc == 1


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_exits_nonzero_on_missing_input_field(
        mock_geo, mock_photo, mock_sleep, tmp_path):
    inp = write_input(tmp_path, f"{VALID_HEADER}\nRoute Alpha,,Stop One")
    out = tmp_path / "out.csv"

    rc = enrich.run(inp, out, force=False, access_key="fake-key")
    assert rc == 1


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_does_not_write_output_on_validation_failure(
        mock_geo, mock_photo, mock_sleep, tmp_path):
    """
    Validation errors should not overwrite a previous good run's output.
    Unlike geocode/photo failures (which write partial progress), a missing
    field means we cannot safely resume, so no output should be written.
    """
    inp = write_input(tmp_path, f"{VALID_HEADER}\nRoute Alpha,,Stop One")
    out = tmp_path / "out.csv"

    enrich.run(inp, out, force=False, access_key="fake-key")

    assert not out.exists()


@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_row_numbers_are_1_based_with_header_as_row_1(
        mock_geo, mock_photo, mock_sleep, tmp_path, capsys):
    """
    Error messages should reference 1-based row numbers where row 1 is
    the header, so the first data row is row 2.
    """
    inp = write_input(tmp_path, f"{VALID_HEADER}\nRoute Alpha,,Stop One")
    out = tmp_path / "out.csv"

    enrich.run(inp, out, force=False, access_key="fake-key")

    captured = capsys.readouterr()
    assert "row 2" in captured.err


# ── Cache key collision test ──────────────────────────────────────────────────

@patch("enrich.time.sleep")
@patch("enrich.fetch_photo_url", side_effect=mock_photo_ok)
@patch("enrich.geocode", side_effect=mock_geocode_ok)
def test_run_same_location_name_in_different_routes_not_confused(
        mock_geo, mock_photo, mock_sleep, tmp_path):
    """
    Two routes with identically-named stops should not share cache entries.
    The cache key includes (route_name, stop_order, location).
    """
    inp = write_input(tmp_path, f"""\
{VALID_HEADER}
Route Alpha,1,Capital City
Route Beta,1,Capital City
""")
    out = tmp_path / "out.csv"

    # Pre-cache only Route Alpha's entry
    make_enriched_output(out, [{
        "route_name": "Route Alpha", "stop_order": "1", "location": "Capital City",
        "lat": "99.0", "lng": "88.0", "photo_url": "https://cached.com/p.jpg",
        "is_decoy": "false",
    }])

    rc = enrich.run(inp, out, force=False, access_key="fake-key")

    assert rc == 0
    rows = read_output(out)
    # Route Alpha: cached. Route Beta: freshly fetched.
    assert rows[0]["lat"] == "99.0"
    assert rows[1]["lat"] == "10.000000"
    assert mock_geo.call_count == 1


# ── main() smoke test ─────────────────────────────────────────────────────────
# Only tests the CLI wiring — the logic is covered by run() tests above.

@patch("enrich.run", return_value=0)
def test_main_delegates_to_run(mock_run, tmp_path, monkeypatch):
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"
    monkeypatch.setenv("UNSPLASH_ACCESS_KEY", "fake-key")
    monkeypatch.setattr(sys, "argv", [
        "enrich.py", "--input", str(inp), "--output", str(out),
    ])

    rc = enrich.main()

    assert rc == 0
    mock_run.assert_called_once_with(inp, out, False, "fake-key")


@patch("enrich.run", return_value=0)
def test_main_passes_force_flag_to_run(mock_run, tmp_path, monkeypatch):
    inp = write_input(tmp_path, MINIMAL_INPUT)
    out = tmp_path / "out.csv"
    monkeypatch.setenv("UNSPLASH_ACCESS_KEY", "fake-key")
    monkeypatch.setattr(sys, "argv", [
        "enrich.py", "--input", str(inp), "--output", str(out), "--force",
    ])

    enrich.main()

    _, _, force, _ = mock_run.call_args[0]
    assert force is True
