const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the Bearer access token and attaches the user to req.user
exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    return res.status(401).json({ message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
  }

  const user = await User.findById(payload.id);
  if (!user || !user.isActive) return res.status(401).json({ message: 'Account not found or disabled' });

  req.user = user;
  next();
});
