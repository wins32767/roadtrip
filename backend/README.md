# Roamer Backend

FastAPI backend for the Roamer geography puzzle game. Owns all route data and answer validation — the client never sees stop order or coordinates.

## Requirements

- Python 3.12+
- A virtual environment (`.venv` at repo root)

## Setup

From the repo root:

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

## Running Locally

```bash
cd backend
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## Running Tests

All test commands should be run from the `backend/` directory with the venv active.

```bash
cd backend
```

**Unit tests** — fast, no I/O, test game logic directly:

```bash
pytest tests/unit -v
```

**Integration tests** — spin up the real ASGI app and hit live endpoints:

```bash
pytest tests/integration -v
```

**All tests:**

```bash
pytest tests -v
```

**Single test file:**

```bash
pytest tests/unit/test_game_service.py -v
```

**Single test by name:**

```bash
pytest tests/unit/test_game_service.py::test_perfect_guess_returns_all_green -v
```

## Security Checks

These run as reporting-only steps in CI but can be run locally too.

**Bandit** — static analysis for common Python security issues:

```bash
bandit -r app/
```

**Safety** — checks dependencies against known CVEs:

```bash
safety check -r requirements.txt
```

## Project Structure

```
backend/
├── app/
│   ├── main.py               # FastAPI app, middleware, router registration
│   ├── api/
│   │   └── v1/
│   │       ├── health.py     # GET /api/v1/health
│   │       └── routes.py     # Route and guess endpoints
│   ├── core/
│   │   └── config.py         # Settings via pydantic-settings + .env
│   ├── models/
│   │   └── game.py           # Pydantic models (Route, GuessRequest, etc.)
│   └── services/
│       ├── route_store.py    # Route data — hardcoded now, DB-ready later
│       └── game_service.py   # Answer validation logic
└── tests/
    ├── unit/
    │   └── test_game_service.py
    └── integration/
        └── test_routes_api.py
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/routes/daily` | Today's route (no solution data) |
| GET | `/api/v1/routes` | All routes (no solution data) |
| GET | `/api/v1/routes/{route_id}` | Single route (no solution data) |
| POST | `/api/v1/routes/{route_id}/guess?guess_number=N` | Submit a guess |

## CI Pipeline

On every push/PR to paths under `backend/`:

1. Lint (ruff)
2. Unit tests
3. Integration tests
4. Bandit — report only
5. Safety — report only

On merge to `main`: deploy to Railway.

## Deployment

Deployed on Railway. The `railway.toml` at the backend root configures the start command and healthcheck path. Set `RAILWAY_TOKEN` in GitHub repository secrets to enable automatic deploys.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `development` | Runtime environment |
| `ALLOWED_ORIGINS` | localhost + vercel URL | CORS allowed origins |
| `DAILY_ROUTE_INDEX` | `0` | Index into ROUTES for today's puzzle |
