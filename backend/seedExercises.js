import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Exercise from './models/Exercise.js';

dotenv.config();

const sampleExercises = [
  { name: 'Push-ups', sets: 3, reps: 15, description: 'Bodyweight chest, shoulders, and triceps press.' },
  { name: 'Squats', sets: 4, reps: 12, description: 'Lower-body compound squat for quads and glutes.' },
  { name: 'Pull-ups', sets: 3, reps: 8, description: 'Upper-body pulling movement for lats and biceps.' },
  { name: 'Lunges', sets: 3, reps: 10, description: 'Single-leg lunge for quads, glutes, and balance.' },
  { name: 'Plank', sets: 3, reps: 1, description: 'Core hold. Treat 1 rep as one timed hold.' },
  { name: 'Burpees', sets: 3, reps: 10, description: 'Full-body cardio: squat, plank, and jump.' },
  { name: 'Mountain Climbers', sets: 3, reps: 20, description: 'Plank position alternating knee drives.' },
  { name: 'Jumping Jacks', sets: 3, reps: 25, description: 'Full-body warm-up cardio.' },
  { name: 'Sit-ups', sets: 3, reps: 15, description: 'Abdominal crunch from a lying position.' },
  { name: 'Bench Press', sets: 4, reps: 10, description: 'Barbell or dumbbell chest press.' },
  { name: 'Deadlifts', sets: 4, reps: 8, description: 'Hip-hinge lift for posterior chain.' },
  { name: 'Bicep Curls', sets: 3, reps: 12, description: 'Isolation curl for biceps.' },
  { name: 'Tricep Dips', sets: 3, reps: 12, description: 'Dip on a bench or bars for triceps.' },
  { name: 'Leg Press', sets: 4, reps: 12, description: 'Machine press for quads and glutes.' },
  { name: 'Shoulder Press', sets: 3, reps: 10, description: 'Overhead press for shoulders.' },
  { name: 'Lat Pulldown', sets: 3, reps: 12, description: 'Cable pulldown for lats.' },
  { name: 'Dumbbell Rows', sets: 3, reps: 12, description: 'Bent-over row for back and biceps.' },
  { name: 'Romanian Deadlift', sets: 3, reps: 10, description: 'Hinge movement targeting hamstrings.' },
  { name: 'Calf Raises', sets: 4, reps: 15, description: 'Standing raise for calves.' },
  { name: 'Russian Twists', sets: 3, reps: 20, description: 'Seated rotation for obliques.' },
];

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ Missing MONGODB_URI (or MONGO_URI) in backend/.env');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    console.log('📦 Database:', mongoose.connection.name);

    let added = 0;
    let skipped = 0;

    for (const exercise of sampleExercises) {
      const existing = await Exercise.findOne({ name: exercise.name });
      if (existing) {
        skipped += 1;
        continue;
      }
      await Exercise.create(exercise);
      added += 1;
    }

    const total = await Exercise.countDocuments();
    console.log(`✅ Added ${added} exercises, skipped ${skipped} that already existed.`);
    console.log(`📚 Exercise library now has ${total} items.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
