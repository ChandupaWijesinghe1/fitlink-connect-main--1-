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
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET all trainers
router.get('/', getAllTrainers);

// GET search trainers
router.get('/search', searchTrainers);

// GET all users (for trainer to browse)
router.get('/users/all', getAllUsers);

router.get('/feed', protect, getTrainerFeedPosts);
router.get('/me', protect, getMyTrainerProfile);
router.patch('/me', protect, updateMyTrainerProfile);
router.post('/me/posts', protect, addTrainerPost);
router.delete('/me/posts/:postId', protect, deleteTrainerPost);

// GET single trainer by ID
router.get('/:id', getTrainerById);

// GET trainer's clients
router.get('/:id/clients', getTrainerClients);

export default router;