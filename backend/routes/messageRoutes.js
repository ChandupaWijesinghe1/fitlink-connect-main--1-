import express from 'express';
const router = express.Router();
import * as messageController from '../controllers/messageController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import {
  validateIdParam,
  validateSendMessage,
  validateShareSchedule,
} from '../middleware/validators.js';

// All routes require authentication
router.use(protect);

// IMPORTANT: Order matters! Specific routes BEFORE dynamic routes
// Specific routes (fixed paths)
router.get('/trainer/clients', requireRole('trainer'), messageController.getTrainerClients);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/conversations', messageController.getAllConversations);

// Dynamic routes (with parameters)
router.get('/conversation/:userId', validateIdParam('userId'), messageController.getConversation);

// Action routes
router.post('/send', validateSendMessage, messageController.sendMessage);
router.put('/read/:userId', validateIdParam('userId'), messageController.markAsRead);
router.delete('/:messageId', validateIdParam('messageId'), messageController.deleteMessage);
// Add this line
router.post('/share-schedule', validateShareSchedule, messageController.shareSchedule);
export default router;
