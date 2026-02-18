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

4️⃣ Setup Instructions
Prerequisites
Node.js installed
MongoDB installed OR MongoDB Atlas connection string
Installation Steps
Clone the repository
git clone https://github.com/ChandupaWijesinghe1/fitlink-connect-main--1-
cd fitconnect
Install Backend Dependencies
cd server
npm install
Install Frontend Dependencies
cd ../client
npm install
Configure Environment Variables
Create .env file in server directory

Add:

MONGO_URI
JWT_SECRET
PORT=5000
Run the Application

npm run dev (if configured to run both client & server)

5️⃣ Author

A.P.G.C.L. Wijesinghe
