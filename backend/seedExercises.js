import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Exercise from './models/Exercise.js';

dotenv.config();

const sampleExercises = [
  {
    name: 'Push-ups',
    sets: 3,
    reps: 15
  },
  {
    name: 'Squats',
    sets: 4,
    reps: 12
  },
  {
    name: 'Pull-ups',
    sets: 3,
    reps: 8
  },
  {
    name: 'Lunges',
    sets: 3,
    reps: 10
  },
  {
    name: 'Plank',
    sets: 3,
    reps: 1  // 1 rep = hold for duration
  },
  {
    name: 'Burpees',
    sets: 3,
    reps: 10
  },
  {
    name: 'Mountain Climbers',
    sets: 3,
    reps: 20
  },
  {
    name: 'Jumping Jacks',
    sets: 3,
    reps: 25
  },
  {
    name: 'Sit-ups',
    sets: 3,
    reps: 15
  },
  {
    name: 'Bench Press',
    sets: 4,
    reps: 10
  },
  {
    name: 'Deadlifts',
    sets: 4,
    reps: 8
  },
  {
    name: 'Bicep Curls',
    sets: 3,
    reps: 12
  },
  {
    name: 'Tricep Dips',
    sets: 3,
    reps: 12
  },
  {
    name: 'Leg Press',
    sets: 4,
    reps: 12
  },
  {
    name: 'Shoulder Press',
    sets: 3,
    reps: 10
  }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await Exercise.deleteMany({});
    await Exercise.insertMany(sampleExercises);
    console.log(`✅ ${sampleExercises.length} exercises added successfully!`);
    process.exit();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });