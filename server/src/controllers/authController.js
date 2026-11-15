const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { signAccess, signRefresh, hashToken, cookieOptions } = require('../utils/tokens');
const { loadMatrix } = require('../middleware/roleCheck');

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

const issueTokens = async (user, res, replaceHash) => {
  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);
  const kept = (user.refreshTokens || []).filter((h) => h !== replaceHash).slice(-4);
  await User.updateOne({ _id: user._id }, { refreshTokens: [...kept, hashToken(refreshToken)] });
  res.cookie('refreshToken', refreshToken, cookieOptions());
  return { accessToken, refreshToken };
};

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password +refreshTokens');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'Your account is inactive. Contact the administrator.' });

  const tokens = await issueTokens(user, res);
  res.json({ ...tokens, user: publicUser(user) });
});

// POST /api/auth/refresh  (refresh token from body or httpOnly cookie)
exports.refresh = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(payload.id).select('+refreshTokens');
  const hash = hashToken(token);
  if (!user || !user.isActive || !user.refreshTokens.includes(hash)) {
    return res.status(401).json({ message: 'Refresh token revoked' });
  }
  // rotation: the old refresh token is replaced by a new one
  res.json(await issueTokens(user, res, hash));
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies.refreshToken;
  if (token) {
    try {
      const { id } = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.updateOne({ _id: id }, { $pull: { refreshTokens: hashToken(token) } });
    } catch {
      /* token already invalid – nothing to revoke */
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me  -> user + permission matrix of their role
exports.me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user), permissions: await loadMatrix(req.user.role) });
});
