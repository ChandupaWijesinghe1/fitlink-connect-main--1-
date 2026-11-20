import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Trainer from '../models/Trainer.js';

// Verifies a JWT and loads the account it belongs to.
// Returns { account, role, exp }, or null when the token is missing,
// invalid, expired, or belongs to an account that no longer exists.
// Shared by the HTTP middleware below and the Socket.io handshake.
export const resolveAccountFromToken = async (token) => {
  if (!token || typeof token !== 'string') return null;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }

  if (!decoded?.id) return null;

  let role = 'client';
  let account = await User.findById(decoded.id).select('-password');

  if (!account) {
    role = 'trainer';
    account = await Trainer.findById(decoded.id).select('-password');
  }

  if (!account) return null;

  return { account, role, exp: decoded.exp };
};

// Requires a valid Bearer token. Sets req.user and req.userRole ('client' | 'trainer').
export const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  let resolved;
  try {
    resolved = await resolveAccountFromToken(token);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }

  if (!resolved) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }

  req.user = resolved.account;
  req.userRole = resolved.role;
  return next();
};

// Use after protect. Example: router.post('/', requireRole('trainer'), handler)
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to do this',
    });
  }
  return next();
};

// Use after protect on routes shaped like /:id/... that only the account itself may call.
export const requireSelf = (paramName = 'id') => (req, res, next) => {
  if (String(req.params[paramName]) !== String(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your own data',
    });
  }
  return next();
};
