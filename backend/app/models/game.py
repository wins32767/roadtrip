from pydantic import BaseModel
from typing import List


class Location(BaseModel):
    name: str
    photo: str
    lat: float
    lng: float


class Decoy(BaseModel):
    name: str
    photo: str


class Route(BaseModel):
    id: str
    name: str
    stops: List[Location]
    decoys: List[Decoy]


class HiddenLocation(BaseModel):
    """A location as the client sees it — name and photo only, no coordinates or position."""
    name: str
    photo: str


class RoutePublic(BaseModel):
    """Route data safe to send to the client — no lat/lng, no order, no decoy flag."""
    id: str
    name: str
    photos: List[HiddenLocation]


class GuessItem(BaseModel):
    slot_index: int
    photo_name: str


class GuessRequest(BaseModel):
    route_id: str
    assignments: List[GuessItem]


class SlotFeedback(BaseModel):
    slot_index: int
    result: str  # "green" | "yellow" | "red"


class GuessResponse(BaseModel):
    feedback: List[SlotFeedback]
    correct_count: int
    total_stops: int
    solved: bool
    guesses_remaining: int
