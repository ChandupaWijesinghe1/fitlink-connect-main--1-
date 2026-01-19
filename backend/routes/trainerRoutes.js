import express from 'express';
import {
  getAllTrainers,
  getTrainerById,
  searchTrainers,
  getTrainerClients,
  getAllUsers
} from '../controllers/trainerController.js';

const router = express.Router();

// GET all trainers
router.get('/', getAllTrainers);

// GET search trainers
router.get('/search', searchTrainers);

// GET all users (for trainer to browse)
router.get('/users/all', getAllUsers);

// GET single trainer by ID
router.get('/:id', getTrainerById);

// GET trainer's clients
router.get('/:id/clients', getTrainerClients);

export default router;