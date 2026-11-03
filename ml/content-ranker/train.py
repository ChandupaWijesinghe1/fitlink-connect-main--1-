"""Train a client-post ranker that scores how related a trainer post is."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import ndcg_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "training.csv"
MODEL_PATH = ROOT / "models" / "content_ranker.joblib"

NUMERIC = ["experience", "workouts_per_week", "days_ago", "specialty_match", "connected_match", "difficulty_level"]
CATEGORICAL = ["preferred_specialty", "post_specialty", "difficulty"]
FEATURES = NUMERIC + CATEGORICAL


def precision_at_k(frame: pd.DataFrame, k: int = 5) -> float:
    hits = []
    for _, group in frame.groupby("client_id"):
        ranked = group.sort_values("score", ascending=False).head(k)
        hits.append(ranked.label.mean())
    return float(sum(hits) / len(hits)) if hits else 0.0


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit("Run generate_dataset.py first.")

    data = pd.read_csv(DATA_PATH)
    train_df, test_df = train_test_split(
        data,
        test_size=0.2,
        random_state=42,
        stratify=data["label"],
    )

    model = Pipeline(
        steps=[
            (
                "features",
                ColumnTransformer(
                    transformers=[
                        ("num", "passthrough", NUMERIC),
                        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
                    ]
                ),
            ),
            (
                "clf",
                LogisticRegression(max_iter=400, class_weight="balanced"),
            ),
        ]
    )
    model.fit(train_df[FEATURES], train_df["label"])

    test_df = test_df.copy()
    test_df["score"] = model.predict_proba(test_df[FEATURES])[:, 1]
    auc = roc_auc_score(test_df["label"], test_df["score"])
    p5 = precision_at_k(test_df, k=5)

    grouped = test_df.groupby("client_id")
    ndcgs = []
    for _, group in grouped:
        if group.label.nunique() < 2:
            continue
        ndcgs.append(ndcg_score([group.label.tolist()], [group.score.tolist()], k=5))
    ndcg = float(sum(ndcgs) / len(ndcgs)) if ndcgs else 0.0

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES}, MODEL_PATH)

    print(f"AUC: {auc:.3f}")
    print(f"Precision@5: {p5:.3f}")
    print(f"NDCG@5: {ndcg:.3f}")
    print(f"saved {MODEL_PATH}")


if __name__ == "__main__":
    main()
