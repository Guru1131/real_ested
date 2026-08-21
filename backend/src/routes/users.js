const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// GET /api/users (List employees & staff)
router.get('/', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  try {
    if (['super_admin', 'assistant_admin'].includes(req.user.role)) {
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.email, u.role, u.branch_id, u.phone, u.status, b.name as branch_name 
         FROM users u
         LEFT JOIN branches b ON u.branch_id = b.id
         WHERE u.is_deleted = 0 AND u.role != 'super_admin'
         ORDER BY u.id DESC`
      );
      return res.json(rows);
    } else {
      // Branch Admin sees staff in their branch or brokers assigned to it
      const branchId = req.user.branch_id;
      const [rows] = await pool.query(
        `SELECT DISTINCT u.id, u.username, u.email, u.role, u.branch_id, u.phone, u.status, b.name as branch_name 
         FROM users u
         LEFT JOIN branches b ON u.branch_id = b.id
         LEFT JOIN broker_branch_assignments ba ON u.id = ba.broker_id
         WHERE u.is_deleted = 0 
           AND u.role != 'super_admin' 
           AND (u.branch_id = ? OR ba.branch_id = ?)
         ORDER BY u.id DESC`,
        [branchId, branchId]
      );
      return res.json(rows);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error listing directory.' });
  }
});

// POST /api/users (Create employee or staff)
router.post('/', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  const { username, email, password, role, branch_id, phone } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Username, email, password, and role are required.' });
  }

  // Branch Admin checks
  if (req.user.role === 'branch_admin') {
    if (!['branch_executive', 'external_broker'].includes(role)) {
      return res.status(403).json({ error: 'Branch Admins can only create executives or external brokers.' });
    }
  }

  try {
    // Check duplicates
    const [dups] = await pool.query('SELECT id FROM users WHERE (username = ? OR email = ?) AND is_deleted = 0 LIMIT 1', [username, email]);
    if (dups.length > 0) {
      return res.status(400).json({ error: 'Username or Email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const actualBranchId = ['super_admin', 'assistant_admin', 'external_broker'].includes(role) 
      ? null 
      : (req.user.role === 'branch_admin' ? req.user.branch_id : branch_id);

    // Insert user
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, branch_id, phone, status) 
       VALUES (?, ?, ?, ?, ?, ?, "active")`,
      [username, email, passwordHash, role, actualBranchId, phone || '']
    );

    const newUserId = result.insertId;

    // If broker and branch_id is specified (Branch Admin creates broker assigned to Pune)
    if (role === 'external_broker') {
      const assignBranchId = req.user.role === 'branch_admin' ? req.user.branch_id : branch_id;
      if (assignBranchId) {
        await pool.query(
          'INSERT INTO broker_branch_assignments (broker_id, branch_id) VALUES (?, ?)',
          [newUserId, assignBranchId]
        );
      }
    }

    return res.json({
      message: 'User created successfully',
      user: { id: newUserId, username, email, role, branch_id: actualBranchId }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error registering user.' });
  }
});

// GET /api/users/brokers (Broker Management sub-module)
router.get('/brokers', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  try {
    let brokers;
    if (['super_admin', 'assistant_admin'].includes(req.user.role)) {
      const [rows] = await pool.query(
        `SELECT id, username, email, phone, status, created_at 
         FROM users 
         WHERE role = "external_broker" AND is_deleted = 0 
         ORDER BY id DESC`
      );
      brokers = rows;
    } else {
      // Branch Admin Pune
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.email, u.phone, u.status, u.created_at 
         FROM users u 
         JOIN broker_branch_assignments ba ON u.id = ba.broker_id
         WHERE u.role = "external_broker" AND u.is_deleted = 0 AND ba.branch_id = ?
         ORDER BY u.id DESC`,
        [req.user.branch_id]
      );
      brokers = rows;
    }

    // Attach assignments to each broker
    for (let broker of brokers) {
      const [assigns] = await pool.query(
        `SELECT b.id, b.name, b.code 
         FROM branches b
         JOIN broker_branch_assignments ba ON b.id = ba.branch_id
         WHERE ba.broker_id = ? AND b.is_deleted = 0`,
        [broker.id]
      );
      broker.branches = assigns;
    }

    return res.json(brokers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving broker details.' });
  }
});

// POST /api/users/brokers (Create External Broker & map branches)
router.post('/brokers', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  const { username, email, password, phone, branchIds } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  let finalBranchIds = branchIds || [];
  if (req.user.role === 'branch_admin') {
    finalBranchIds = [req.user.branch_id]; // Force branch selection
  }

  if (finalBranchIds.length === 0) {
    return res.status(400).json({ error: 'Broker must be mapped to at least one branch.' });
  }

  try {
    const [dups] = await pool.query('SELECT id FROM users WHERE (username = ? OR email = ?) AND is_deleted = 0 LIMIT 1', [username, email]);
    if (dups.length > 0) {
      return res.status(400).json({ error: 'Username or Email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    // Insert user
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, branch_id, phone, status) 
       VALUES (?, ?, ?, 'external_broker', NULL, ?, 'active')`,
      [username, email, passwordHash, phone || '']
    );

    const brokerId = result.insertId;

    // Create mappings
    for (let bId of finalBranchIds) {
      await pool.query(
        'INSERT INTO broker_branch_assignments (broker_id, branch_id) VALUES (?, ?)',
        [brokerId, bId]
      );
    }

    return res.json({ message: 'External Broker created successfully.', brokerId });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error creating broker profile.' });
  }
});

// PUT /api/users/:id (Edit Profile details & Status)
router.put('/:id', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  const { id } = req.params;
  const { phone, status, password, branchIds } = req.body;

  try {
    const [rows] = await pool.query('SELECT id, role, branch_id FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    const targetUser = rows[0];

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protect Super Admin
    if (targetUser.role === 'super_admin') {
      if (req.user.role !== 'super_admin' || req.user.id != id) {
        return res.status(403).json({ error: 'Super Admin profiles can only be edited by themselves.' });
      }
    }

    // Branch Admin checks
    if (req.user.role === 'branch_admin') {
      if (targetUser.role === 'external_broker') {
        const [assigns] = await pool.query(
          'SELECT id FROM broker_branch_assignments WHERE broker_id = ? AND branch_id = ? LIMIT 1',
          [id, req.user.branch_id]
        );
        if (assigns.length === 0) {
          return res.status(403).json({ error: 'You are not authorized to manage this broker.' });
        }
      } else {
        if (targetUser.branch_id != req.user.branch_id) {
          return res.status(403).json({ error: 'You are not authorized to manage staff of other branches.' });
        }
      }
    }

    const updates = [];
    const params = [];

    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (status !== undefined) {
      if (req.user.id == id && status === 'inactive') {
        return res.status(400).json({ error: 'You cannot deactivate your own account.' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (password) {
      updates.push('password_hash = ?');
      params.push(bcrypt.hashSync(password, 10));
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update branch mappings (Super / Assistant Admin only)
    if (branchIds && ['super_admin', 'assistant_admin'].includes(req.user.role) && targetUser.role === 'external_broker') {
      await pool.query('DELETE FROM broker_branch_assignments WHERE broker_id = ?', [id]);
      for (let bId of branchIds) {
        await pool.query('INSERT INTO broker_branch_assignments (broker_id, branch_id) VALUES (?, ?)', [id, bId]);
      }
    }

    return res.json({ message: 'User configurations updated successfully.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating user profile.' });
  }
});

// DELETE /api/users/:id (Soft Delete)
router.delete('/:id', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT id, role, branch_id FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    const targetUser = rows[0];

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.role === 'super_admin') {
      return res.status(403).json({ error: 'Super Admin account cannot be deleted.' });
    }

    if (req.user.id == id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    if (req.user.role === 'branch_admin') {
      if (targetUser.role === 'external_broker') {
        const [assigns] = await pool.query(
          'SELECT id FROM broker_branch_assignments WHERE broker_id = ? AND branch_id = ? LIMIT 1',
          [id, req.user.branch_id]
        );
        if (assigns.length === 0) {
          return res.status(403).json({ error: 'You are not authorized to delete this broker.' });
        }
      } else {
        if (targetUser.branch_id != req.user.branch_id) {
          return res.status(403).json({ error: 'You are not authorized to delete staff of other branches.' });
        }
      }
    }

    // Soft Delete
    await pool.query('UPDATE users SET is_deleted = 1, status = "inactive" WHERE id = ?', [id]);
    return res.json({ message: 'User soft-deleted successfully.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error deleting user.' });
  }
});

// GET /api/users/broker/:id/logs (Audit Activity Logs)
router.get('/broker/:id/logs', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  const brokerId = req.params.id;

  try {
    const [rows] = await pool.query('SELECT id, username, role FROM users WHERE id = ? AND role = "external_broker" AND is_deleted = 0 LIMIT 1', [brokerId]);
    const broker = rows[0];

    if (!broker) {
      return res.status(442).json({ error: 'Specified user is not an active external broker.' });
    }

    // Branch Admin check
    if (req.user.role === 'branch_admin') {
      const [assigns] = await pool.query(
        'SELECT id FROM broker_branch_assignments WHERE broker_id = ? AND branch_id = ? LIMIT 1',
        [brokerId, req.user.branch_id]
      );
      if (assigns.length === 0) {
        return res.status(403).json({ error: "You are not authorized to view this broker's logs." });
      }
    }

    // Fetch Logs
    const [logs] = await pool.query(
      `SELECT l.id, l.activity_type, l.metadata, l.created_at, p.id as property_id, p.project_name, p.property_code
       FROM broker_activity_logs l
       LEFT JOIN properties p ON l.property_id = p.id
       WHERE l.broker_id = ?
       ORDER BY l.created_at DESC`,
      [brokerId]
    );

    return res.json({
      broker: { id: broker.id, username: broker.username },
      logs
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving logs.' });
  }
});

module.exports = router;
