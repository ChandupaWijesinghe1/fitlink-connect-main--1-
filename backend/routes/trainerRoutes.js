import express from 'express';
import {
  getAllTrainers,
  getTrainerById,
  searchTrainers,
  getTrainerClients,
  getAllUsers,
  getMyTrainerProfile,
  updateMyTrainerProfile,
  addTrainerPost,
  deleteTrainerPost,
  getTrainerFeedPosts
} from '../controllers/trainerController.js';
import { protect, requireRole, requireSelf } from '../middleware/authMiddleware.js';
import { validateIdParam } from '../middleware/validators.js';

const router = express.Router();

// Every trainer route needs a logged-in user
router.use(protect);

// GET all trainers
router.get('/', getAllTrainers);

// GET search trainers
router.get('/search', searchTrainers);

// GET all users (for trainer to browse) - trainers only
router.get('/users/all', requireRole('trainer'), getAllUsers);

router.get('/feed', getTrainerFeedPosts);
router.get('/me', getMyTrainerProfile);
router.patch('/me', updateMyTrainerProfile);
router.post('/me/posts', addTrainerPost);
router.delete('/me/posts/:postId', deleteTrainerPost);

// GET single trainer by ID
router.get('/:id', validateIdParam('id'), getTrainerById);

// GET trainer's clients - only the trainer themselves
router.get(
  '/:id/clients',
  validateIdParam('id'),
  requireRole('trainer'),
  requireSelf('id'),
  getTrainerClients
);

export default router;