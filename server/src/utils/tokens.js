const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.signAccess = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m',
  });

exports.signRefresh = (user) =>
  jwt.sign({ id: user._id, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d',
  });

exports.hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

exports.cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
});
