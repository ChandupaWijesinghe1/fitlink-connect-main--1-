import express from "express";
import { signup, login, trainerSignup, trainerLogin } from "../controllers/authController.js";
import Trainer from "../models/Trainer.js";  // ← ADD THIS IMPORT
import { protect } from "../middleware/authMiddleware.js";
import { loginLimiter } from "../middleware/rateLimiters.js";
import {
  validateLogin,
  validateSignup,
  validateTrainerSignup,
} from "../middleware/validators.js";

const router = express.Router();

// Client/User Routes
router.post("/signup", validateSignup, signup);
router.post("/login", loginLimiter, validateLogin, login);

// Trainer Routes
router.post("/trainer-signup", validateTrainerSignup, trainerSignup);
router.post("/trainer-login", loginLimiter, validateLogin, trainerLogin);

// Get all trainers (for clients to browse)
router.get("/trainers", protect, async (req, res) => {
  try {
    console.log('📥 Request received for /api/trainers');
    
    const trainers = await Trainer.find({ isActive: true })
      .select('name email specialization experience profileImage bio')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${trainers.length} trainers`);

    res.json({
      success: true,
      trainers
    });
  } catch (error) {
    console.error('❌ Error fetching trainers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainers',
      error: error.message
    });
  }
});

export default router;