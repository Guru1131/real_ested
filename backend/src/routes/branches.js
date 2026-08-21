const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// GET /api/branches (Allowed for admins and staff)
router.get('/', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, code, city, address, created_at FROM branches WHERE is_deleted = 0 ORDER BY name ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error listing branches.' });
  }
});

// POST /api/branches (Super Admin only)
router.post('/', authenticate, requireRole(['super_admin']), async (req, res) => {
  const { name, code, city, address } = req.body;

  if (!name || !code || !city) {
    return res.status(400).json({ error: 'Name, unique code, and city are required.' });
  }

  try {
    // Check duplicate code
    const [dups] = await pool.query('SELECT id FROM branches WHERE code = ? AND is_deleted = 0 LIMIT 1', [code]);
    if (dups.length > 0) {
      return res.status(400).json({ error: 'Branch code already exists.' });
    }

    const [result] = await pool.query(
      'INSERT INTO branches (name, code, city, address) VALUES (?, ?, ?, ?)',
      [name, code, city, address || '']
    );

    return res.json({
      message: 'Branch created successfully',
      branch: { id: result.insertId, name, code, city, address }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error creating branch.' });
  }
});

// PUT /api/branches/:id (Super Admin only)
router.put('/:id', authenticate, requireRole(['super_admin']), async (req, res) => {
  const { id } = req.params;
  const { name, code, city, address } = req.body;

  if (!name || !code || !city) {
    return res.status(400).json({ error: 'Name, unique code, and city are required.' });
  }

  try {
    // Check duplicate code excluding current
    const [dups] = await pool.query('SELECT id FROM branches WHERE code = ? AND id != ? AND is_deleted = 0 LIMIT 1', [code, id]);
    if (dups.length > 0) {
      return res.status(400).json({ error: 'Branch code already in use by another branch.' });
    }

    await pool.query(
      'UPDATE branches SET name = ?, code = ?, city = ?, address = ? WHERE id = ?',
      [name, code, city, address || '', id]
    );

    return res.json({ message: 'Branch updated successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating branch.' });
  }
});

// DELETE /api/branches/:id (Super Admin only - Soft Delete)
router.delete('/:id', authenticate, requireRole(['super_admin']), async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('UPDATE branches SET is_deleted = 1 WHERE id = ?', [id]);
    return res.json({ message: 'Branch soft-deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error deleting branch.' });
  }
});

module.exports = router;
