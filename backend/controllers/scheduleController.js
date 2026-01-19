import Schedule from '../models/Schedules.js';

// Save schedule to user's account
export const saveScheduleToUser = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user.id;

    // Find the original schedule
    const originalSchedule = await Schedule.findById(scheduleId);
    
    if (!originalSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Check if user already has this schedule
    const existingSchedule = await Schedule.findOne({
      userId: userId,
      title: originalSchedule.title,
      'days.dayNumber': { $in: originalSchedule.days.map(d => d.dayNumber) }
    });

    if (existingSchedule) {
      return res.status(400).json({ 
        message: 'You already have this schedule saved',
        schedule: existingSchedule 
      });
    }

    // Create a copy of the schedule for the user
    const newSchedule = new Schedule({
      title: originalSchedule.title,
      description: originalSchedule.description,
      days: originalSchedule.days,
      userId: userId,
      trainer: originalSchedule.trainer
    });

    await newSchedule.save();

    res.status(201).json({
      success: true,
      message: 'Schedule saved successfully',
      schedule: newSchedule
    });
  } catch (error) {
    console.error('Save schedule error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};