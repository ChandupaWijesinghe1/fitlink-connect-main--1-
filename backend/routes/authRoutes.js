import express from "express";
import { signup, login, trainerSignup, trainerLogin } from "../controllers/authController.js";
import Trainer from "../models/Trainer.js";  // ← ADD THIS IMPORT

const router = express.Router();

// Client/User Routes
router.post("/signup", signup);
router.post("/login", login);

// Trainer Routes
router.post("/trainer-signup", trainerSignup);
router.post("/trainer-login", trainerLogin);

// Get all trainers (for clients to browse)
router.get("/trainers", async (req, res) => {
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