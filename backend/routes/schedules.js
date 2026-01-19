import express from 'express';
import Schedule from '../models/Schedules.js';
import { protect } from '../middleware/authMiddleware.js';
import { saveScheduleToUser } from '../controllers/scheduleController.js';
const router = express.Router();

// GET all schedules for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? { userId } : {};
    
    const schedules = await Schedule.find(query)
      .populate('days.exercises.exerciseId')
      .sort({ createdAt: -1 });
    
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single schedule - UPDATED with video support
router.get('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('days.exercises.exerciseId');
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
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

// CREATE new schedule
router.post('/', async (req, res) => {
  try {
    const { title, description, days, userId, trainer } = req.body;

    // Validate required fields
    if (!title || !userId || !days || days.length === 0) {
      return res.status(400).json({ 
        message: 'Title, userId, and at least one day with exercises are required' 
      });
    }

    // Create schedule
    const schedule = new Schedule({
      title,
      description,
      days,
      userId,
      trainer: trainer || 'self'
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

// UPDATE schedule
router.put('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('days.exercises.exerciseId');
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE schedule
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add this line after your existing routes
router.post('/save/:scheduleId', protect, saveScheduleToUser);

export default router;