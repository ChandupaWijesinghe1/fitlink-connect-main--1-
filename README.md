FitConnect – Point Wise Description
1️⃣ Overview

FitConnect is a web-based fitness trainer support platform.
Connects fitness trainers with clients.
Streamlines coaching through:
Integrated scheduling
Real-time communication
Acts as a management tool for trainers to:
Create personalized workout plans
Share plans directly with clients via in-app messaging

2️⃣ Features
✅ Currently Implemented

User Authentication
Secure login system
Registration for Trainers and Clients
Role-Based Dashboards
Trainer Dashboard:
Manage clients
Create workout content
Client Portal:
View progress
Connect with trainers
Smart Scheduling Tool
Create detailed workout routines
Specify exercises, sets, and reps
Real-Time Messaging
Instant text messaging between trainers and clients
Trainers can:
	Attach workout schedules in chat
	Send schedules directly
Clients can:
	Receive schedules
	Save them to their personal profiles

🚧 Future Roadmap

ML-Driven Recommendation Engine
Python-based ranking system
Uses XGBoost
Suggests trainers based on engagement
Engagement Metrics
Track likes
Ratings
Comments
Improve trainer visibility
Social Feed
Post transformation achievements
Share updates

3️⃣ Technology Stack (MERN Stack)

MongoDB
Stores user profiles
Workout schedules
Chat history
Express.js
Handles backend API routes
React.js
Builds dynamic frontend interface
Node.js
Server runtime environment

4️⃣ How to Run Locally

Prerequisites
- Node.js (LTS) and npm
- MongoDB running locally, or a MongoDB Atlas connection string

The app has two folders: `backend` (API on port 5000) and `frontend` (UI on port 8080). Run both.

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/fitconnect
JWT_SECRET=your-secret-key-here
PORT=5000
FRONTEND_URL=http://localhost:8080
NODE_ENV=development
```

For Atlas, put your Atlas URI in `MONGODB_URI`.

Start the API:

```bash
npm run dev
```

You should see MongoDB connected and the server on port 5000.

Optional — seed sample exercises:

```bash
node seedExercises.js
```

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create or edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the UI:

```bash
npm run dev
```

Open http://localhost:8080

Register as a trainer or a client, then log in.

| Service  | Command              | URL                     |
|----------|----------------------|-------------------------|
| Backend  | `npm run dev` in `backend`  | http://localhost:5000 |
| Frontend | `npm run dev` in `frontend` | http://localhost:8080 |

5️⃣ Author

A.P.G.C.L. Wijesinghe
