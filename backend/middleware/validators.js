import { body, param, query, validationResult } from 'express-validator';

// Same rule the exercise form uses in the UI.
const YOUTUBE_URL = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
const PHONE = /^\+?[0-9][0-9\s\-()]{5,19}$/;

export const MAX_SCHEDULE_DAYS = 30;

// Sends a 400 with the first problem in `message`, which is what the UI shows.
export const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result
    .array({ onlyFirstError: true })
    .map((error) => ({ field: error.path, message: error.msg }));

  return res.status(400).json({
    success: false,
    message: errors[0].message,
    errors,
  });
};

// ---------- shared pieces ----------

export const validateIdParam = (name = 'id') => [
  param(name).isMongoId().withMessage('Invalid id'),
  handleValidation,
];

const text = (chain, label, { min = 1, max }) =>
  chain
    .isString().withMessage(`${label} must be text`).bail()
    .trim()
    .isLength({ min, max }).withMessage(`${label} must be ${min} to ${max} characters`);

const password = (chain) =>
  chain
    .isString().withMessage('Password must be text').bail()
    .isLength({ min: 6, max: 128 }).withMessage('Password must be 6 to 128 characters');

const email = (chain) =>
  chain
    .isString().withMessage('Email must be text').bail()
    .trim()
    .isLength({ max: 254 }).withMessage('Email is too long').bail()
    .isEmail().withMessage('Enter a valid email address');

// ---------- auth ----------

export const validateSignup = [
  text(body('name'), 'Name', { min: 2, max: 80 }),
  email(body('email')),
  password(body('password')),
  handleValidation,
];

export const validateTrainerSignup = [
  text(body('name'), 'Name', { min: 2, max: 80 }),
  email(body('email')),
  password(body('password')),
  body('phone')
    .isString().withMessage('Phone number must be text').bail()
    .trim()
    .matches(PHONE).withMessage('Enter a valid phone number'),
  text(body('specialization'), 'Specialization', { min: 2, max: 100 }),
  handleValidation,
];

// Login only checks type and size, so accounts created before these rules can still sign in.
export const validateLogin = [
  body('email')
    .isString().withMessage('Email and password are required').bail()
    .trim()
    .isLength({ min: 1, max: 254 }).withMessage('Email and password are required'),
  body('password')
    .isString().withMessage('Email and password are required').bail()
    .isLength({ min: 1, max: 128 }).withMessage('Email and password are required'),
  handleValidation,
];

// ---------- schedules ----------

const scheduleRules = ({ partial }) => {
  const maybe = (chain) => (partial ? chain.optional() : chain);

  return [
    text(maybe(body('title')), 'Title', { min: 1, max: 120 }),
    body('description')
      .optional({ values: 'null' })
      .isString().withMessage('Description must be text').bail()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must be at most 1000 characters'),
    maybe(body('days'))
      .isArray({ min: 1, max: MAX_SCHEDULE_DAYS })
      .withMessage(`A schedule needs 1 to ${MAX_SCHEDULE_DAYS} days`),
    body('days.*.dayNumber')
      .isInt({ min: 1, max: MAX_SCHEDULE_DAYS })
      .withMessage(`Day number must be 1 to ${MAX_SCHEDULE_DAYS}`),
    body('days.*.exercises')
      .isArray({ max: 50 })
      .withMessage('Each day needs a list of up to 50 exercises'),
    body('days.*.exercises.*.exerciseId').isMongoId().withMessage('Invalid exercise id'),
    text(body('days.*.exercises.*.name'), 'Exercise name', { min: 1, max: 120 }),
    body('days.*.exercises.*.sets')
      .isInt({ min: 1, max: 100 }).withMessage('Sets must be 1 to 100'),
    body('days.*.exercises.*.reps')
      .isInt({ min: 1, max: 1000 }).withMessage('Reps must be 1 to 1000'),
    handleValidation,
  ];
};

export const validateScheduleCreate = scheduleRules({ partial: false });
export const validateScheduleUpdate = scheduleRules({ partial: true });

export const validateOwnerQuery = (name) => [
  query(name).optional().isMongoId().withMessage('Invalid id'),
  handleValidation,
];

// Keeps only the fields the Schedule model stores, so extra keys in the body are ignored.
export const pickScheduleDays = (days) =>
  days.map((day) => ({
    dayNumber: Number(day.dayNumber),
    exercises: (day.exercises || []).map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      sets: Number(exercise.sets),
      reps: Number(exercise.reps),
    })),
  }));

// ---------- exercises ----------

const exerciseRules = ({ partial }) => [
  text(partial ? body('name').optional() : body('name'), 'Exercise name', { min: 1, max: 120 }),
  body('sets').optional({ values: 'null' })
    .isInt({ min: 1, max: 100 }).withMessage('Sets must be 1 to 100'),
  body('reps').optional({ values: 'null' })
    .isInt({ min: 1, max: 1000 }).withMessage('Reps must be 1 to 1000'),
  body('videoUrl').optional({ values: 'falsy' })
    .isString().withMessage('Video link must be text').bail()
    .trim()
    .isLength({ max: 500 }).withMessage('Video link is too long').bail()
    .matches(YOUTUBE_URL).withMessage('Video link must be a YouTube URL'),
  body('description').optional({ values: 'falsy' })
    .isString().withMessage('Description must be text').bail()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  handleValidation,
];

export const validateExerciseCreate = exerciseRules({ partial: false });
export const validateExerciseUpdate = exerciseRules({ partial: true });

export const validateExerciseSearch = [
  query('q')
    .isString().withMessage('Search query is required').bail()
    .isLength({ min: 1, max: 100 }).withMessage('Search query must be 1 to 100 characters'),
  handleValidation,
];

// ---------- messages ----------

export const validateSendMessage = [
  body('receiverId').isMongoId().withMessage('Invalid receiver id'),
  body('content')
    .isString().withMessage('Message content is required').bail()
    .trim()
    .isLength({ min: 1, max: 5000 }).withMessage('Message must be 1 to 5000 characters'),
  body('messageType').optional()
    .isIn(['text', 'image', 'file']).withMessage('Invalid message type'),
  handleValidation,
];

export const validateShareSchedule = [
  body('receiverId').isMongoId().withMessage('Invalid receiver id'),
  body('scheduleId').isMongoId().withMessage('Invalid schedule id'),
  handleValidation,
];
