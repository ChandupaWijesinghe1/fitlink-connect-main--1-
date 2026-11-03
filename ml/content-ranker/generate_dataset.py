"""Create synthetic FitConnect ranking data: clients, posts, interactions."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
RNG = np.random.default_rng(42)

SPECIALTIES = ["strength", "hiit", "yoga", "nutrition", "boxing"]
GOALS = {
    "strength": "muscle_gain",
    "hiit": "fat_loss",
    "yoga": "mobility",
    "nutrition": "body_recomp",
    "boxing": "conditioning",
}

POSTS = [
    {"post_id": "maya-leg-day", "trainer_id": "maya", "trainer_name": "Maya Fernando", "specialty": "strength", "body_part": "legs", "difficulty": "intermediate", "days_ago": 1, "caption": "Leg day complete."},
    {"post_id": "maya-push", "trainer_id": "maya", "trainer_name": "Maya Fernando", "specialty": "strength", "body_part": "upper", "difficulty": "intermediate", "days_ago": 4, "caption": "Upper-body push session."},
    {"post_id": "ravi-hiit", "trainer_id": "ravi", "trainer_name": "Ravi Perera", "specialty": "hiit", "body_part": "full", "difficulty": "advanced", "days_ago": 2, "caption": "Twenty minute HIIT."},
    {"post_id": "ravi-core", "trainer_id": "ravi", "trainer_name": "Ravi Perera", "specialty": "hiit", "body_part": "core", "difficulty": "beginner", "days_ago": 6, "caption": "Core finisher."},
    {"post_id": "nisha-hips", "trainer_id": "nisha", "trainer_name": "Nisha Jayawardena", "specialty": "yoga", "body_part": "hips", "difficulty": "beginner", "days_ago": 0, "caption": "Hip mobility."},
    {"post_id": "nisha-flow", "trainer_id": "nisha", "trainer_name": "Nisha Jayawardena", "specialty": "yoga", "body_part": "full", "difficulty": "beginner", "days_ago": 3, "caption": "Morning flow."},
    {"post_id": "nisha-desk", "trainer_id": "nisha", "trainer_name": "Nisha Jayawardena", "specialty": "yoga", "body_part": "back", "difficulty": "beginner", "days_ago": 8, "caption": "Desk reset."},
    {"post_id": "daniel-bowl", "trainer_id": "daniel", "trainer_name": "Daniel Cruz", "specialty": "nutrition", "body_part": "none", "difficulty": "beginner", "days_ago": 1, "caption": "Protein bowl."},
    {"post_id": "daniel-prep", "trainer_id": "daniel", "trainer_name": "Daniel Cruz", "specialty": "nutrition", "body_part": "none", "difficulty": "beginner", "days_ago": 5, "caption": "Prep Sunday."},
    {"post_id": "amaya-pads", "trainer_id": "amaya", "trainer_name": "Amaya Silva", "specialty": "boxing", "body_part": "upper", "difficulty": "intermediate", "days_ago": 2, "caption": "Pad work."},
    {"post_id": "amaya-footwork", "trainer_id": "amaya", "trainer_name": "Amaya Silva", "specialty": "boxing", "body_part": "full", "difficulty": "intermediate", "days_ago": 7, "caption": "Footwork drill."},
]

DIFFICULTY_LEVEL = {"beginner": 0, "intermediate": 1, "advanced": 2}


def build_clients(n: int = 120) -> pd.DataFrame:
    rows = []
    for i in range(1, n + 1):
        specialty = SPECIALTIES[(i - 1) % len(SPECIALTIES)]
        if RNG.random() < 0.12:
            specialty = RNG.choice(SPECIALTIES)
        experience = int(RNG.integers(0, 3))
        connected = SPECIALTIES[experience % len(SPECIALTIES)]
        connected_trainer = {
            "strength": "maya",
            "hiit": "ravi",
            "yoga": "nisha",
            "nutrition": "daniel",
            "boxing": "amaya",
        }[specialty if RNG.random() < 0.55 else connected]
        rows.append(
            {
                "client_id": f"c{i:03d}",
                "preferred_specialty": specialty,
                "goal": GOALS[specialty],
                "experience": experience,
                "workouts_per_week": int(RNG.integers(2, 7)),
                "connected_trainer_id": connected_trainer if RNG.random() < 0.45 else "",
            }
        )
    return pd.DataFrame(rows)


def build_posts() -> pd.DataFrame:
    now = datetime.utcnow()
    rows = []
    for post in POSTS:
        created = now - timedelta(days=post["days_ago"], hours=int(RNG.integers(0, 12)))
        rows.append(
            {
                "post_id": post["post_id"],
                "trainer_id": post["trainer_id"],
                "trainer_name": post["trainer_name"],
                "specialty": post["specialty"],
                "body_part": post["body_part"],
                "difficulty": post["difficulty"],
                "caption": post["caption"],
                "created_at": created.isoformat(),
                "days_ago": post["days_ago"],
            }
        )
    return pd.DataFrame(rows)


def event_probability(client: pd.Series, post: pd.Series) -> dict[str, float]:
    match = 1.0 if client.preferred_specialty == post.specialty else 0.0
    connected = 1.0 if client.connected_trainer_id == post.trainer_id else 0.0
    recency = max(0.0, 1.0 - post.days_ago / 14)
    p_like = 0.08 + 0.42 * match + 0.18 * connected + 0.08 * recency
    p_save = 0.03 + 0.18 * match + 0.08 * connected
    p_hide = 0.04 + 0.22 * (1 - match)
    p_profile = 0.05 + 0.20 * match + 0.15 * connected
    return {
        "like": float(np.clip(p_like, 0.02, 0.85)),
        "save": float(np.clip(p_save, 0.01, 0.55)),
        "hide": float(np.clip(p_hide, 0.01, 0.45)),
        "open_profile": float(np.clip(p_profile, 0.02, 0.70)),
    }


def build_interactions(clients: pd.DataFrame, posts: pd.DataFrame) -> pd.DataFrame:
    now = datetime.utcnow()
    rows = []
    for _, client in clients.iterrows():
        for _, post in posts.iterrows():
            viewed = RNG.random() < 0.85
            if not viewed:
                continue
            created = now - timedelta(days=int(post.days_ago), hours=int(RNG.integers(1, 20)))
            rows.append(
                {
                    "client_id": client.client_id,
                    "post_id": post.post_id,
                    "event": "view",
                    "timestamp": created.isoformat(),
                }
            )
            probs = event_probability(client, post)
            for event, probability in probs.items():
                if RNG.random() < probability:
                    rows.append(
                        {
                            "client_id": client.client_id,
                            "post_id": post.post_id,
                            "event": event,
                            "timestamp": (created + timedelta(minutes=int(RNG.integers(1, 90)))).isoformat(),
                        }
                    )
    return pd.DataFrame(rows)


def build_training_table(clients: pd.DataFrame, posts: pd.DataFrame, interactions: pd.DataFrame) -> pd.DataFrame:
    positive = {"like", "save", "open_profile"}
    engaged = (
        interactions[interactions.event.isin(positive)]
        .groupby(["client_id", "post_id"])
        .size()
        .rename("positive_events")
        .reset_index()
    )
    hidden = (
        interactions[interactions.event == "hide"]
        .groupby(["client_id", "post_id"])
        .size()
        .rename("hide_events")
        .reset_index()
    )

    rows = []
    for _, client in clients.iterrows():
        for _, post in posts.iterrows():
            hit = engaged[
                (engaged.client_id == client.client_id) & (engaged.post_id == post.post_id)
            ]
            hid = hidden[
                (hidden.client_id == client.client_id) & (hidden.post_id == post.post_id)
            ]
            label = 1 if not hit.empty else 0
            if not hid.empty and hit.empty:
                label = 0
            rows.append(
                {
                    "client_id": client.client_id,
                    "post_id": post.post_id,
                    "preferred_specialty": client.preferred_specialty,
                    "experience": client.experience,
                    "workouts_per_week": client.workouts_per_week,
                    "connected_trainer_id": client.connected_trainer_id,
                    "post_specialty": post.specialty,
                    "difficulty": post.difficulty,
                    "days_ago": post.days_ago,
                    "specialty_match": int(client.preferred_specialty == post.specialty),
                    "connected_match": int(client.connected_trainer_id == post.trainer_id),
                    "difficulty_level": DIFFICULTY_LEVEL[post.difficulty],
                    "label": label,
                }
            )
    return pd.DataFrame(rows)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    clients = build_clients()
    posts = build_posts()
    interactions = build_interactions(clients, posts)
    training = build_training_table(clients, posts, interactions)

    clients.to_csv(DATA_DIR / "clients.csv", index=False)
    posts.to_csv(DATA_DIR / "posts.csv", index=False)
    interactions.to_csv(DATA_DIR / "interactions.csv", index=False)
    training.to_csv(DATA_DIR / "training.csv", index=False)

    print(f"clients: {len(clients)}")
    print(f"posts: {len(posts)}")
    print(f"interactions: {len(interactions)}")
    print(f"training rows: {len(training)}  positives: {int(training.label.sum())}")
    print(f"wrote files in {DATA_DIR}")


if __name__ == "__main__":
    main()
