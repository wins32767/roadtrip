"""
Unit tests for route_store._load_routes.

All tests use tmp_path to write CSVs in isolation — no dependency on
the real data/routes.csv or the module-level ROUTES load.
"""

import pytest
from pathlib import Path

from app.services.route_store import _load_routes


# ── Helpers ──────────────────────────────────────────────────────────────────

VALID_HEADER = "route_name,stop_order,location,lat,lng,photo_url,is_decoy"

def write_csv(path: Path, content: str) -> Path:
    path.write_text(content.strip() + "\n", encoding="utf-8")
    return path


def minimal_csv(tmp_path: Path, *, extra_rows: str = "") -> Path:
    """One valid route with two stops and one decoy."""
    return write_csv(tmp_path / "routes.csv", f"""\
{VALID_HEADER}
Route Alpha,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
Route Alpha,2,Stop Two,11.0,21.0,https://example.com/2.jpg,false
Route Alpha,0,Decoy One,12.0,22.0,https://example.com/d1.jpg,true
{extra_rows}""")


# ── Happy-path tests ──────────────────────────────────────────────────────────

def test_loads_stops_in_stop_order(tmp_path):
    """Stops should be ordered by stop_order regardless of CSV row order."""
    csv = write_csv(tmp_path / "routes.csv", f"""\
{VALID_HEADER}
Route Alpha,2,Stop Two,11.0,21.0,https://example.com/2.jpg,false
Route Alpha,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
""")
    routes = _load_routes(csv)
    assert routes[0].stops[0].name == "Stop One"
    assert routes[0].stops[1].name == "Stop Two"


def test_decoys_are_separated_from_stops(tmp_path):
    csv = minimal_csv(tmp_path)
    routes = _load_routes(csv)
    assert len(routes[0].stops)  == 2
    assert len(routes[0].decoys) == 1
    assert routes[0].decoys[0].name == "Decoy One"


def test_route_ids_are_auto_incremented(tmp_path):
    csv = write_csv(tmp_path / "routes.csv", f"""\
{VALID_HEADER}
Route Alpha,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
Route Beta,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
Route Gamma,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
""")
    routes = _load_routes(csv)
    assert [r.id for r in routes] == ["route-001", "route-002", "route-003"]


def test_route_id_order_follows_first_appearance(tmp_path):
    """ID assignment tracks first-seen order, not alphabetical."""
    csv = write_csv(tmp_path / "routes.csv", f"""\
{VALID_HEADER}
Zebra Route,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
Alpha Route,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
""")
    routes = _load_routes(csv)
    assert routes[0].name == "Zebra Route"
    assert routes[0].id   == "route-001"
    assert routes[1].name == "Alpha Route"
    assert routes[1].id   == "route-002"


def test_multiple_routes_grouped_correctly(tmp_path):
    csv = write_csv(tmp_path / "routes.csv", f"""\
{VALID_HEADER}
Route Alpha,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
Route Beta,1,Stop One,30.0,40.0,https://example.com/b1.jpg,false
Route Alpha,2,Stop Two,11.0,21.0,https://example.com/2.jpg,false
""")
    routes = _load_routes(csv)
    assert len(routes) == 2
    assert routes[0].name == "Route Alpha"
    assert len(routes[0].stops) == 2
    assert routes[1].name == "Route Beta"
    assert len(routes[1].stops) == 1


def test_is_decoy_case_insensitive(tmp_path):
    csv = write_csv(tmp_path / "routes.csv", f"""\
{VALID_HEADER}
Route Alpha,1,Stop One,10.0,20.0,https://example.com/1.jpg,False
Route Alpha,0,Decoy One,12.0,22.0,https://example.com/d.jpg,TRUE
""")
    routes = _load_routes(csv)
    assert len(routes[0].stops)  == 1
    assert len(routes[0].decoys) == 1


def test_whitespace_is_stripped_from_fields(tmp_path):
    csv = write_csv(tmp_path / "routes.csv", f"""\
{VALID_HEADER}
  Route Alpha  ,1,  Stop One  , 10.0 , 20.0 , https://example.com/1.jpg , false
""")
    routes = _load_routes(csv)
    assert routes[0].name          == "Route Alpha"
    assert routes[0].stops[0].name == "Stop One"
    assert routes[0].stops[0].lat  == 10.0


def test_location_coords_parsed_correctly(tmp_path):
    csv = minimal_csv(tmp_path)
    routes = _load_routes(csv)
    stop = routes[0].stops[0]
    assert stop.lat == 10.0
    assert stop.lng == 20.0


# ── File-level error tests ────────────────────────────────────────────────────

def test_raises_if_file_not_found(tmp_path):
    with pytest.raises(FileNotFoundError, match="Routes CSV not found"):
        _load_routes(tmp_path / "nonexistent.csv")


def test_raises_if_csv_is_empty(tmp_path):
    csv = write_csv(tmp_path / "routes.csv", VALID_HEADER)
    with pytest.raises(ValueError, match="no routes"):
        _load_routes(csv)


def test_raises_on_missing_column(tmp_path):
    csv = write_csv(tmp_path / "routes.csv", """\
route_name,stop_order,location,lat,lng,photo_url
Route Alpha,1,Stop One,10.0,20.0,https://example.com/1.jpg
""")
    with pytest.raises(ValueError, match="missing required columns"):
        _load_routes(csv)


# ── Per-field validation tests ────────────────────────────────────────────────

@pytest.mark.parametrize("field,bad_value", [
    ("lat",        "not-a-float"),
    ("lat",        ""),
    ("lng",        "12.3.4"),
    ("stop_order", "one"),
    ("stop_order", "1.5"),
    ("is_decoy",   "yes"),
    ("is_decoy",   "0"),
    ("is_decoy",   ""),
])
def test_raises_on_unparsable_field(tmp_path, field, bad_value):
    row = {
        "route_name": "Route Alpha",
        "stop_order": "1",
        "location":   "Stop One",
        "lat":        "10.0",
        "lng":        "20.0",
        "photo_url":  "https://example.com/1.jpg",
        "is_decoy":   "false",
    }
    row[field] = bad_value
    csv = write_csv(tmp_path / "routes.csv",
        VALID_HEADER + "\n" + ",".join(row[c] for c in VALID_HEADER.split(",")))
    with pytest.raises(ValueError, match=f"Row 2"):
        _load_routes(csv)


@pytest.mark.parametrize("field", ["route_name", "location", "photo_url"])
def test_raises_on_empty_string_field(tmp_path, field):
    row = {
        "route_name": "Route Alpha",
        "stop_order": "1",
        "location":   "Stop One",
        "lat":        "10.0",
        "lng":        "20.0",
        "photo_url":  "https://example.com/1.jpg",
        "is_decoy":   "false",
    }
    row[field] = ""
    csv = write_csv(tmp_path / "routes.csv",
        VALID_HEADER + "\n" + ",".join(row[c] for c in VALID_HEADER.split(",")))
    with pytest.raises(ValueError, match=f"Row 2.*{field}"):
        _load_routes(csv)


def test_error_message_includes_row_number(tmp_path):
    """Row numbers should be 1-based with header as row 1."""
    csv = write_csv(tmp_path / "routes.csv", f"""\
{VALID_HEADER}
Route Alpha,1,Stop One,10.0,20.0,https://example.com/1.jpg,false
Route Alpha,2,Stop Two,BAD,20.0,https://example.com/2.jpg,false
""")
    with pytest.raises(ValueError, match="Row 3"):
        _load_routes(csv)
