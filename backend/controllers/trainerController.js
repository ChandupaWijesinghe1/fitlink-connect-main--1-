import Trainer from '../models/Trainer.js';

// Get all trainers
export const getAllTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find({ isActive: true })
      .select('-password') // Exclude password
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: trainers.length,
      trainers
    });
  } catch (error) {
    console.error('Error fetching trainers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trainers',
      error: error.message
    });
  }
};

// Get single trainer by ID
export const getTrainerById = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id)
      .select('-password')
      .populate('clients', 'name email'); // Populate client info if needed

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    res.json({
      success: true,
      trainer
    });
  } catch (error) {
    console.error('Error fetching trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trainer',
      error: error.message
    });
  }
};

// Search trainers by name or specialization
export const searchTrainers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const trainers = await Trainer.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { specialization: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');

    res.json({
      success: true,
      count: trainers.length,
      trainers
    });
  } catch (error) {
    console.error('Error searching trainers:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching trainers',
      error: error.message
    });
  }
};

// Get trainer's clients
export const getTrainerClients = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id)
      .populate('clients', 'name email phone');

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    res.json({
      success: true,
      clients: trainer.clients
    });
  } catch (error) {
    console.error('Error fetching trainer clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
};

// Get all users (for trainer to browse and send connection requests)
export const getAllUsers = async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    
    const users = await User.find({ isActive: true })
      .select('name email phone profileImage trainer')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};