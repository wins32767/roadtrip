import pytest
from app.models.game import GuessRequest, GuessItem
from app.services.game_service import validate_guess, get_public_route
from app.services.route_store import ROUTES


ROUTE = ROUTES[0]


def test_get_public_route_hides_coordinates():
    public = get_public_route(ROUTE)
    for photo in public.photos:
        assert "lat" not in photo
        assert "lng" not in photo


def test_get_public_route_includes_all_photos():
    public = get_public_route(ROUTE)
    expected_count = len(ROUTE.stops) + len(ROUTE.decoys)
    assert len(public.photos) == expected_count


def test_perfect_guess_returns_all_green():
    assignments = [GuessItem(slot_index=i, photo_name=s.name) for i, s in enumerate(ROUTE.stops)]
    request = GuessRequest(route_id=ROUTE.id, assignments=assignments)
    response = validate_guess(request, guess_number=1)

    assert response.solved is True
    assert response.correct_count == len(ROUTE.stops)
    assert all(f.result == "green" for f in response.feedback)


def test_decoy_placement_returns_red():
    assignments = [GuessItem(slot_index=0, photo_name=ROUTE.decoys[0].name)]
    request = GuessRequest(route_id=ROUTE.id, assignments=assignments)
    response = validate_guess(request, guess_number=1)

    assert response.feedback[0].result == "red"
    assert response.solved is False


def test_wrong_stop_position_returns_yellow():
    # Place stop[1] in slot 0
    assignments = [GuessItem(slot_index=0, photo_name=ROUTE.stops[1].name)]
    request = GuessRequest(route_id=ROUTE.id, assignments=assignments)
    response = validate_guess(request, guess_number=1)

    assert response.feedback[0].result == "yellow"


def test_guesses_remaining_decrements():
    assignments = [GuessItem(slot_index=0, photo_name=ROUTE.decoys[0].name)]
    request = GuessRequest(route_id=ROUTE.id, assignments=assignments)

    r1 = validate_guess(request, guess_number=1)
    r2 = validate_guess(request, guess_number=2)

    assert r1.guesses_remaining == 2
    assert r2.guesses_remaining == 1


def test_invalid_route_raises():
    request = GuessRequest(route_id="does-not-exist", assignments=[])
    with pytest.raises(ValueError):
        validate_guess(request, guess_number=1)
