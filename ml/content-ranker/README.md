# Content ranker

This folder is **only** for sharing related trainer posts with a client. It does not pick trainers or build workouts.

You do **not** need to import extra documents. The scripts generate a FitConnect-shaped dataset from the seeded trainers (Maya, Ravi, Nisha, Daniel, Amaya), train a model, and rank posts.

## Setup

```bash
cd ml/content-ranker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 1. Create the dataset

```bash
python generate_dataset.py
```

Writes `data/clients.csv`, `data/posts.csv`, `data/interactions.csv`, `data/training.csv`.

Likes are biased: clients mostly engage with posts in their preferred specialty, plus a boost if that trainer is “connected”.

## 2. Train

```bash
python train.py
```

Saves `models/content_ranker.joblib`.

## 3. Rank posts for a client

```bash
python rank.py --client-id c001
python rank.py --specialty yoga --top 5
```

The JSON list is the filtered Contents feed for that client.

The FitConnect backend ranks a **client** Contents feed by keeping one `rank.py --serve` process alive. The model is loaded once at startup and reloaded when `python train.py` replaces `models/content_ranker.joblib`.

If Python or the model file is missing, the feed falls back to newest-first.

## Later

Replace the synthetic `interactions.csv` with real like/save/hide events from the app, then run `train.py` again. The API will use the new file on the next Contents request.
