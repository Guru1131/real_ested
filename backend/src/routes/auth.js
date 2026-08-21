const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'node_express_jwt_secret_998877';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash, role, branch_id, status FROM users WHERE username = ? AND is_deleted = 0 LIMIT 1',
      [username]
    );

    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is deactivated. Please contact your administrator.' });
    }

    // Log login activity if user is a broker
    if (user.role === 'external_broker') {
      const metadata = JSON.stringify({
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });
      await pool.query(
        'INSERT INTO broker_activity_logs (broker_id, activity_type, metadata) VALUES (?, "login", ?)',
        [user.id, metadata]
      );
    }

    // Generate JWT
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    return res.json({
      message: 'Login successful',
      token,
      user: payload
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during login authentication.' });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.role, u.branch_id, u.phone, u.status, b.name as branch_name 
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ? AND u.is_deleted = 0 LIMIT 1`,
      [req.user.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving profile details.' });
  }
});

module.exports = router;
