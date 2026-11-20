import express from "express";
const router = express.Router();

// Import your Schedule model
import Schedule from "../models/Schedules.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import {
  pickScheduleDays,
  validateIdParam,
  validateOwnerQuery,
  validateScheduleCreate,
  validateScheduleUpdate,
} from "../middleware/validators.js";
import { isScheduleOwner } from "../utils/scheduleAccess.js";

// Every route here needs a logged-in trainer
router.use(protect, requireRole('trainer'));

const notYours = (res) =>
  res.status(403).json({
    success: false,
    message: 'You can only manage your own schedules'
  });

// POST create new trainer schedule - always owned by the logged-in trainer
// Route: POST /api/trainer/schedules
router.post('/schedules', validateScheduleCreate, async (req, res) => {
  try {
    const { title, description, days } = req.body;

    const schedule = new Schedule({
      title,
      description: description || '',
      days: pickScheduleDays(days),
      userId: String(req.user._id),
      trainer: 'trainer'
    });

    await schedule.save();

    res.status(201).json({
      success: true,
      message: 'Trainer schedule created successfully',
      schedule
    });
  } catch (error) {
    console.error('Error creating trainer schedule:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating trainer schedule',
      error: error.message
    });
  }
});

// GET the logged-in trainer's schedules
router.get('/schedules', validateOwnerQuery('trainerId'), async (req, res) => {
  try {
    const ownerId = String(req.user._id);
    const { trainerId } = req.query;

    if (trainerId && String(trainerId) !== ownerId) {
      return notYours(res);
    }

    const schedules = await Schedule.find({ userId: ownerId, trainer: 'trainer' })
      .populate('days.exercises.exerciseId')
      .sort({ createdAt: -1 }); // Most recent first

    res.json({
      success: true,
      count: schedules.length,
      schedules
    });
  } catch (error) {
    console.error('Error fetching trainer schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trainer schedules',
      error: error.message
    });
  }
});

// GET single trainer schedule by ID - owner only
router.get('/schedules/:id', validateIdParam('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('days.exercises.exerciseId');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (!isScheduleOwner(schedule, req.user)) {
      return notYours(res);
    }

    res.json({
      success: true,
      schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule',
      error: error.message
    });
  }
});

// PUT update trainer schedule - owner only
router.put('/schedules/:id', validateIdParam('id'), validateScheduleUpdate, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (!isScheduleOwner(schedule, req.user)) {
      return notYours(res);
    }

    // Only these fields can change; the owner cannot be reassigned
    const { title, description, days } = req.body;
    if (title !== undefined) schedule.title = title;
    if (description !== undefined) schedule.description = description || '';
    if (days !== undefined) schedule.days = pickScheduleDays(days);

    await schedule.save();
    await schedule.populate('days.exercises.exerciseId');

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating schedule',
      error: error.message
    });
  }
});

// DELETE trainer schedule - owner only
router.delete('/schedules/:id', validateIdParam('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (!isScheduleOwner(schedule, req.user)) {
      return notYours(res);
    }

    await schedule.deleteOne();

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting schedule',
      error: error.message
    });
  }
});

export default router;
