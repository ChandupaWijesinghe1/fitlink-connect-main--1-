import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getProgress,
  getClientProgressForTrainer,
  updateSettings,
  upsertDailyLog,
  addMeasurement,
  addPhotos,
} from "../controllers/progressController.js";

const router = express.Router();

router.use(protect);
router.get("/", getProgress);
router.get("/client/:clientId", getClientProgressForTrainer);
router.put("/settings", updateSettings);
router.post("/daily", upsertDailyLog);
router.post("/measurements", addMeasurement);
router.post("/photos", addPhotos);

export default router;
