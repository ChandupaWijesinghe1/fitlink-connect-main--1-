import express from 'express';
const router = express.Router();
import * as messageController from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

// All routes require authentication
router.use(protect);

// IMPORTANT: Order matters! Specific routes BEFORE dynamic routes
// Specific routes (fixed paths)
router.get('/trainer/clients', messageController.getTrainerClients);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/conversations', messageController.getAllConversations);

// Dynamic routes (with parameters)
router.get('/conversation/:userId', messageController.getConversation);

// Action routes
router.post('/send', messageController.sendMessage);
router.put('/read/:userId', messageController.markAsRead);
router.delete('/:messageId', messageController.deleteMessage);
// Add this line
router.post('/share-schedule', messageController.shareSchedule);
export default router;