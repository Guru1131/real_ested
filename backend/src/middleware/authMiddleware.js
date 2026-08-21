const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'node_express_jwt_secret_998877';

// Middleware to authenticate JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Authorization token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // holds id, username, email, role, branch_id
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
};

// Middleware to authorize user roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden. Access restricted to authorized roles.',
        required_roles: allowedRoles,
        current_role: req.user ? req.user.role : 'none'
      });
    }
    next();
  };
};

// Helper function to enforce branch isolation in controllers
const enforceBranchIsolation = (req, res, targetBranchId) => {
  if (['super_admin', 'assistant_admin'].includes(req.user.role)) {
    return true; // Admins bypass isolation checks
  }

  if (req.user.branch_id != targetBranchId) {
    res.status(403).json({ error: 'Forbidden. Data isolation violation. You cannot access details of another branch.' });
    return false;
  }
  
  return true;
};

module.exports = {
  authenticate,
  requireRole,
  enforceBranchIsolation
};
