import express from 'express';
import Schedule from '../models/Schedules.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  pickScheduleDays,
  validateIdParam,
  validateOwnerQuery,
  validateScheduleCreate,
  validateScheduleUpdate,
} from '../middleware/validators.js';
import { canViewSchedule, isScheduleOwner } from '../utils/scheduleAccess.js';
import { saveScheduleToUser } from '../controllers/scheduleController.js';
const router = express.Router();

// Every schedule route needs a logged-in user
router.use(protect);

const forbidden = (res, message) => res.status(403).json({ message });

// GET the logged-in user's schedules
router.get('/', validateOwnerQuery('userId'), async (req, res) => {
  try {
    const ownerId = String(req.user._id);
    const { userId } = req.query;

    if (userId && String(userId) !== ownerId) {
      return forbidden(res, 'You can only view your own schedules');
    }

    const schedules = await Schedule.find({ userId: ownerId })
      .populate('days.exercises.exerciseId')
      .sort({ createdAt: -1 });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single schedule - UPDATED with video support
// Allowed for the owner, or for someone the owner shared it with in chat
router.get('/:id', validateIdParam('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('days.exercises.exerciseId');

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    if (!(await canViewSchedule(schedule, req.user))) {
      return forbidden(res, 'You do not have access to this schedule');
    }

    // Enrich schedule with exercise data (including videoUrl and description)
    const enrichedSchedule = schedule.toObject();
    enrichedSchedule.days = enrichedSchedule.days.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => {
        // Priority: schedule-specific video > master exercise video > null
        const videoUrl = ex.videoUrl || ex.exerciseId?.videoUrl || null;
        const description = ex.description || ex.exerciseId?.description || null;

        return {
          _id: ex._id,
          exerciseId: ex.exerciseId?._id || ex.exerciseId,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          videoUrl: videoUrl,
          description: description
        };
      })
    }));

    res.json(enrichedSchedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: error.message });
  }
});

// CREATE new schedule - always owned by the logged-in user
router.post('/', validateScheduleCreate, async (req, res) => {
  try {
    const { title, description, days, trainer } = req.body;

    const schedule = new Schedule({
      title,
      description: description || '',
      days: pickScheduleDays(days),
      userId: String(req.user._id),
      trainer: trainer === 'trainer' ? 'trainer' : 'self'
    });

    const newSchedule = await schedule.save();

    // Populate exercise details before sending response
    const populatedSchedule = await Schedule.findById(newSchedule._id)
      .populate('days.exercises.exerciseId');

    res.status(201).json(populatedSchedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE schedule - owner only
router.put('/:id', validateIdParam('id'), validateScheduleUpdate, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    if (!isScheduleOwner(schedule, req.user)) {
      return forbidden(res, 'You can only edit your own schedules');
    }

    // Only these fields can change; the owner cannot be reassigned
    const { title, description, days } = req.body;
    if (title !== undefined) schedule.title = title;
    if (description !== undefined) schedule.description = description || '';
    if (days !== undefined) schedule.days = pickScheduleDays(days);

    await schedule.save();
    await schedule.populate('days.exercises.exerciseId');

    res.json(schedule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE schedule - owner only
router.delete('/:id', validateIdParam('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    if (!isScheduleOwner(schedule, req.user)) {
      return forbidden(res, 'You can only delete your own schedules');
    }

    await schedule.deleteOne();

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Copy a schedule that was shared with the logged-in user into their account
router.post('/save/:scheduleId', validateIdParam('scheduleId'), saveScheduleToUser);

export default router;
