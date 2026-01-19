import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Trainer from "../models/Trainer.js";

// ========== CLIENT/USER AUTHENTICATION ==========

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  // MOVE DEBUG BEFORE try-catch
  console.log('========== LOGIN REQUEST ==========');
  console.log('📥 req.body:', req.body);
  console.log('📥 req.headers:', req.headers);
  console.log('===================================');
  
  try {
    // Check if body exists
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ message: "Login successful", token, user });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message });
  }
};
// ========== TRAINER AUTHENTICATION ==========

export const trainerSignup = async (req, res) => {
  try {
    const { name, email, password, phone, specialization } = req.body;

    // Check if trainer already exists
    const existingTrainer = await Trainer.findOne({ email });
    if (existingTrainer)
      return res.status(400).json({ message: "Trainer already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new trainer
    const newTrainer = new Trainer({ 
      name, 
      email, 
      password: hashedPassword,
      phone,
      specialization 
    });
    await newTrainer.save();

    res.status(201).json({ 
      message: "Trainer registered successfully",
      trainer: {
        _id: newTrainer._id,
        name: newTrainer.name,
        email: newTrainer.email,
        phone: newTrainer.phone,
        specialization: newTrainer.specialization
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const trainerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const trainer = await Trainer.findOne({ email });
    if (!trainer) return res.status(400).json({ message: "Trainer not found" });

    // Check if trainer account is active
    if (!trainer.isActive) 
      return res.status(403).json({ message: "Account has been deactivated" });

    const isMatch = await bcrypt.compare(password, trainer.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: trainer._id, userType: "trainer" }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1d" }
    );

    res.json({ 
      message: "Login successful", 
      token, 
      trainer: {
        _id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        specialization: trainer.specialization,
        bio: trainer.bio,
        experience: trainer.experience
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};