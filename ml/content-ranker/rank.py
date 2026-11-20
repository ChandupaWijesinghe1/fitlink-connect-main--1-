"""Rank trainer posts for one client. This is the only job of the model.

`--serve` keeps one process alive and reloads the joblib file only when
`python train.py` replaces it.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "content_ranker.joblib"
POSTS_PATH = ROOT / "data" / "posts.csv"
CLIENTS_PATH = ROOT / "data" / "clients.csv"

DIFFICULTY_LEVEL = {"beginner": 0, "intermediate": 1, "advanced": 2}


def load_model():
    if not MODEL_PATH.exists():
        raise SystemExit("Train first: python train.py")
    bundle = joblib.load(MODEL_PATH)
    return bundle["model"], bundle["features"]


def feature_frame(client: dict, posts: pd.DataFrame) -> pd.DataFrame:
    preferred = client.get("preferred_specialty") or "strength"
    connected = str(client.get("connected_trainer_id") or "")
    rows = []
    for _, post in posts.iterrows():
        difficulty = str(post.get("difficulty") or "intermediate")
        rows.append(
            {
                "post_id": str(post.post_id),
                "trainer_id": str(post.get("trainer_id") or ""),
                "trainer_name": post.get("trainer_name", ""),
                "caption": post.get("caption", ""),
                "preferred_specialty": preferred,
                "experience": int(client.get("experience", 1) or 1),
                "workouts_per_week": int(client.get("workouts_per_week", 3) or 3),
                "connected_trainer_id": connected,
                "post_specialty": post.get("specialty") or "strength",
                "difficulty": difficulty,
                "days_ago": int(post.get("days_ago") or 0),
                "specialty_match": int(preferred == (post.get("specialty") or "strength")),
                "connected_match": int(connected != "" and connected == str(post.get("trainer_id") or "")),
                "difficulty_level": DIFFICULTY_LEVEL.get(difficulty, 1),
            }
        )
    return pd.DataFrame(rows)


def rank_frame(
    client: dict,
    posts: pd.DataFrame,
    model,
    features: list[str],
    top_k: int | None = None,
) -> pd.DataFrame:
    if posts.empty:
        return pd.DataFrame(columns=["post_id", "trainer_name", "caption", "score"])
    frame = feature_frame(client, posts)
    frame["score"] = model.predict_proba(frame[features])[:, 1]
    ranked = frame.sort_values("score", ascending=False)
    if top_k is not None:
        ranked = ranked.head(top_k)
    return ranked


def rank_for_client(client: dict, posts: pd.DataFrame | None = None, top_k: int | None = None) -> pd.DataFrame:
    model, features = load_model()
    posts = posts if posts is not None else pd.read_csv(POSTS_PATH)
    return rank_frame(client, posts, model, features, top_k)


def posts_from_payload(payload: dict) -> pd.DataFrame:
    return pd.DataFrame(payload.get("posts") or [])


def rank_payload(payload: dict, model=None, features: list[str] | None = None) -> dict:
    if model is None or features is None:
        model, features = load_model()
    client = payload.get("client") or {}
    posts = posts_from_payload(payload)
    top = payload.get("top")
    ranked = rank_frame(client, posts, model, features, top)
    result = {
        "client": {
            "preferred_specialty": client.get("preferred_specialty"),
            "connected_trainer_id": client.get("connected_trainer_id", ""),
        },
        "posts": ranked[["post_id", "score"]].to_dict(orient="records"),
    }
    if "request_id" in payload:
        result["request_id"] = payload["request_id"]
    return result


def serve() -> None:
    """Score many feeds in one process. One JSON object per line, in and out."""
    model, features = load_model()
    loaded_mtime = MODEL_PATH.stat().st_mtime
    sys.stdout.write(json.dumps({"ready": True}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        request_id = None
        try:
            mtime = MODEL_PATH.stat().st_mtime
            if mtime != loaded_mtime:
                model, features = load_model()
                loaded_mtime = mtime
            payload = json.loads(line)
            request_id = payload.get("request_id")
            result = rank_payload(payload, model, features)
        except Exception as exc:
            result = {"request_id": request_id, "error": str(exc)}
        sys.stdout.write(json.dumps(result, default=str) + "\n")
        sys.stdout.flush()


def main() -> None:
    parser = argparse.ArgumentParser(description="Filter related trainer posts for a client")
    parser.add_argument("--client-id", default="c001")
    parser.add_argument("--specialty", default="")
    parser.add_argument("--top", type=int, default=None)
    parser.add_argument("--stdin", action="store_true", help="Rank one JSON {client, posts} from stdin")
    parser.add_argument("--serve", action="store_true", help="Keep running and rank one JSON object per line")
    args = parser.parse_args()

    if args.serve:
        serve()
        return

    if args.stdin:
        payload = json.load(sys.stdin)
        if args.top is not None:
            payload["top"] = args.top
        print(json.dumps(rank_payload(payload), default=str))
        return

    clients = pd.read_csv(CLIENTS_PATH).fillna("")
    if args.specialty:
        client = {
            "preferred_specialty": args.specialty,
            "experience": 1,
            "workouts_per_week": 4,
            "connected_trainer_id": "",
        }
        client_id = "adhoc"
    else:
        row = clients[clients.client_id == args.client_id].iloc[0]
        client = row.to_dict()
        client_id = args.client_id

    ranked = rank_for_client(client, top_k=args.top or 8)
    print(json.dumps(
        {
            "client": {
                "client_id": client_id,
                "preferred_specialty": client["preferred_specialty"],
                "connected_trainer_id": client.get("connected_trainer_id", ""),
            },
            "posts": ranked[["post_id", "trainer_name", "caption", "score"]].to_dict(orient="records"),
        },
        indent=2,
        default=str,
    ))


if __name__ == "__main__":
    main()
