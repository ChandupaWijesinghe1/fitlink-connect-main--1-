import express from "express";
const router = express.Router();

// Import your Schedule model
import Schedule from "../models/Schedules.js";

// POST create new trainer schedule
// Route: POST /api/trainer/schedules
router.post('/schedules', async (req, res) => {
  try {
    const schedule = new Schedule({
      ...req.body,
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

// GET all trainer schedules
// GET all trainer schedules (already exists in your file)
router.get('/schedules', async (req, res) => {
  try {
    const { trainerId } = req.query; // Optional filter by trainer
    
    const query = trainerId ? { userId: trainerId, trainer: 'trainer' } : { trainer: 'trainer' };
    
    const schedules = await Schedule.find(query)
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

// GET single trainer schedule by ID
router.get('/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('days.exercises.exerciseId');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
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

// PUT update trainer schedule
router.put('/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('days.exercises.exerciseId');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
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

// DELETE trainer schedule
router.delete('/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
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