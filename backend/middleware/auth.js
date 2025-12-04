import AuthService from '../services/authService.js';

/**
 * Verify JWT token middleware
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = AuthService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Check if user has engineer role
 */
export const requireEngineer = (req, res, next) => {
  if (req.user.role !== 'engineer') {
    return res.status(403).json({ error: 'Engineer access required' });
  }
  next();
};

/**
 * Check if user has any of the specified roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
