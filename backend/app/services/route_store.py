"""
Route data lives here on the server — never sent to the client in full.
Replace with DB calls when ready to go dynamic.
"""
from app.models.game import Route, Location, Decoy
from typing import Optional

ROUTES: list[Route] = [
    Route(
        id="route-001",
        name="Pacific Coast Classic",
        stops=[
            Location(name="San Francisco, CA", photo="https://example.com/sf.jpg", lat=37.7749, lng=-122.4194),
            Location(name="Big Sur, CA",       photo="https://example.com/bigsur.jpg", lat=36.2704, lng=-121.8081),
            Location(name="Santa Barbara, CA", photo="https://example.com/sb.jpg", lat=34.4208, lng=-119.6982),
            Location(name="Los Angeles, CA",   photo="https://example.com/la.jpg", lat=34.0522, lng=-118.2437),
        ],
        decoys=[
            Decoy(name="San Diego, CA",   photo="https://example.com/sd.jpg"),
            Decoy(name="Monterey, CA",    photo="https://example.com/monterey.jpg"),
        ],
    ),
    # Add more routes here
]

DAILY_INDEX: int = 0


def get_route_by_id(route_id: str) -> Optional[Route]:
    return next((r for r in ROUTES if r.id == route_id), None)


def get_daily_route() -> Route:
    return ROUTES[DAILY_INDEX % len(ROUTES)]


def get_all_routes() -> list[Route]:
    return ROUTES
