import express from 'express';
import Exercise from '../models/Exercise.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import {
  validateExerciseCreate,
  validateExerciseSearch,
  validateExerciseUpdate,
  validateIdParam,
} from '../middleware/validators.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const router = express.Router();

// Reading the exercise library needs a logged-in user.
// Creating, editing and deleting exercises is for trainers only.
router.use(protect);
const trainerOnly = requireRole('trainer');

// GET all exercises
router.get('/', async (req, res) => {
  try {
    const exercises = await Exercise.find().sort({ name: 1 });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SEARCH exercises by name
router.get('/search', validateExerciseSearch, async (req, res) => {
  try {
    const { q } = req.query;

    const exercises = await Exercise.find({
      name: { $regex: escapeRegex(q), $options: 'i' }
    })
    .limit(20)
    .select('name sets reps videoUrl description'); // ← Added videoUrl and description

    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single exercise
router.get('/:id', validateIdParam('id'), async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE new exercise
router.post('/', trainerOnly, validateExerciseCreate, async (req, res) => {
  const exercise = new Exercise({
    name: req.body.name,
    sets: req.body.sets || 3,
    reps: req.body.reps || 10,
    videoUrl: req.body.videoUrl || null,        // ← Add this
    description: req.body.description || null   // ← Add this
  });

  try {
    const newExercise = await exercise.save();
    res.status(201).json(newExercise);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE exercise
router.put('/:id', trainerOnly, validateIdParam('id'), validateExerciseUpdate, async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        sets: req.body.sets,
        reps: req.body.reps,
        videoUrl: req.body.videoUrl,        // ← Add this
        description: req.body.description   // ← Add this
      },
      { new: true, runValidators: true }
    );

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    res.json(exercise);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE exercise
router.delete('/:id', trainerOnly, validateIdParam('id'), async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndDelete(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
