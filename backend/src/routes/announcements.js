const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Auto-create announcements table if not exists
const initTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message TEXT NOT NULL,
        target_audience VARCHAR(50) DEFAULT 'all',
        theme VARCHAR(20) DEFAULT 'warning',
        is_active TINYINT(1) DEFAULT 1,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
  } catch (err) {
    console.error('Error initializing announcements table:', err);
  }
};
initTable();

// GET /api/announcements (Fetch active marquee announcements matching current user role)
router.get('/', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;
    const isStaff = ['branch_admin', 'branch_executive'].includes(userRole);

    const [rows] = await pool.query(
      `SELECT id, message, target_audience, theme, is_active, created_at 
       FROM announcements 
       WHERE is_active = 1 
         AND (
           target_audience = 'all' 
           OR target_audience = ? 
           OR (? = true AND target_audience = 'staff')
         )
       ORDER BY id DESC`,
      [userRole, isStaff]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving announcements.' });
  }
});

// GET /api/announcements/admin (Admin list all announcements)
router.get('/admin', authenticate, requireRole(['super_admin', 'assistant_admin']), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.username as created_by_user 
       FROM announcements a 
       LEFT JOIN users u ON a.created_by = u.id 
       ORDER BY a.id DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving admin announcements.' });
  }
});

// POST /api/announcements (Create new marquee announcement)
router.post('/', authenticate, requireRole(['super_admin', 'assistant_admin']), async (req, res) => {
  const { message, target_audience, theme, is_active } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Announcement message text is required.' });
  }

  const validTargets = ['all', 'external_broker', 'branch_executive', 'branch_admin', 'staff'];
  const audience = validTargets.includes(target_audience) ? target_audience : 'all';
  const colorTheme = ['warning', 'info', 'danger', 'success'].includes(theme) ? theme : 'warning';
  const activeStatus = is_active === false || is_active === 0 ? 0 : 1;

  try {
    const [result] = await pool.query(
      `INSERT INTO announcements (message, target_audience, theme, is_active, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [message.trim(), audience, colorTheme, activeStatus, req.user.id]
    );

    return res.json({
      message: 'Announcement broadcast created successfully.',
      announcementId: result.insertId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error creating announcement.' });
  }
});

// PUT /api/announcements/:id (Update announcement or toggle active status)
router.put('/:id', authenticate, requireRole(['super_admin', 'assistant_admin']), async (req, res) => {
  const { id } = req.params;
  const { message, target_audience, theme, is_active } = req.body;

  try {
    const [rows] = await pool.query('SELECT id FROM announcements WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    const updates = [];
    const params = [];

    if (message !== undefined) {
      updates.push('message = ?');
      params.push(message.trim());
    }
    if (target_audience !== undefined) {
      updates.push('target_audience = ?');
      params.push(target_audience);
    }
    if (theme !== undefined) {
      updates.push('theme = ?');
      params.push(theme);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return res.json({ message: 'Announcement updated successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating announcement.' });
  }
});

// DELETE /api/announcements/:id (Delete announcement)
router.delete('/:id', authenticate, requireRole(['super_admin', 'assistant_admin']), async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
    return res.json({ message: 'Announcement removed successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error deleting announcement.' });
  }
});

module.exports = router;
