const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// POST /api/leads/public (Submit Public Property Inquiry Lead)
router.post('/public', async (req, res) => {
  const { property_id, lead_name, lead_email, lead_phone, notes } = req.body;

  if (!property_id || !lead_name || !lead_email || !lead_phone) {
    return res.status(400).json({ error: 'Property ID, Lead Name, Email, and Phone are required.' });
  }

  try {
    // 1. Verify property exists
    const [props] = await pool.query('SELECT id, branch_id FROM properties WHERE id = ? LIMIT 1', [property_id]);
    const property = props[0];
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    // 2. Select a sales executive from same branch for auto-assignment (random/round-robin)
    const [executives] = await pool.query(
      'SELECT id FROM users WHERE role = "branch_executive" AND branch_id = ? AND status = "active" AND is_deleted = 0 ORDER BY RAND() LIMIT 1',
      [property.branch_id]
    );
    const assignedExecutiveId = executives[0] ? executives[0].id : null;

    // 3. Create lead record
    const [result] = await pool.query(
      `INSERT INTO property_leads (property_id, broker_id, lead_name, lead_email, lead_phone, notes, assigned_executive_id, status)
       VALUES (?, NULL, ?, ?, ?, ?, ?, 'new')`,
      [property_id, lead_name, lead_email, lead_phone, notes || '', assignedExecutiveId]
    );

    return res.json({
      message: 'Your inquiry has been successfully submitted. An agent will contact you soon.',
      leadId: result.insertId,
      assignedExecutiveId
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error registering property lead.' });
  }
});

// POST /api/leads (Submit Property Inquiry Lead)
router.post('/', authenticate, async (req, res) => {
  const { property_id, lead_name, lead_email, lead_phone, notes } = req.body;

  if (!property_id || !lead_name || !lead_email || !lead_phone) {
    return res.status(400).json({ error: 'Property ID, Lead Name, Email, and Phone are required.' });
  }

  try {
    // 1. Verify property exists
    const [props] = await pool.query('SELECT id, branch_id FROM properties WHERE id = ? LIMIT 1', [property_id]);
    const property = props[0];
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    // 2. Select a sales executive from same branch for auto-assignment (optional round-robin/random pick)
    const [executives] = await pool.query(
      'SELECT id FROM users WHERE role = "branch_executive" AND branch_id = ? AND status = "active" AND is_deleted = 0 ORDER BY RAND() LIMIT 1',
      [property.branch_id]
    );
    const assignedExecutiveId = executives[0] ? executives[0].id : null;

    // 3. Create lead record
    const brokerId = (req.user.role === 'external_broker') ? req.user.id : null;
    const [result] = await pool.query(
      `INSERT INTO property_leads (property_id, broker_id, lead_name, lead_email, lead_phone, notes, assigned_executive_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`,
      [property_id, brokerId, lead_name, lead_email, lead_phone, notes || '', assignedExecutiveId]
    );

    // 4. Log lead submission if broker
    if (req.user.role === 'external_broker') {
      const metadata = JSON.stringify({ lead_id: result.insertId, lead_name });
      await pool.query(
        'INSERT INTO broker_activity_logs (broker_id, activity_type, property_id, metadata) VALUES (?, "lead_submission", ?, ?)',
        [req.user.id, property_id, metadata]
      );
    }

    return res.json({
      message: 'Inquiry lead referred successfully.',
      leadId: result.insertId,
      assignedExecutiveId
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error registering property lead.' });
  }
});

// GET /api/leads (List Leads - Isolated by Roles)
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT l.*, p.project_name, p.property_code, p.property_slug,
             b.username as broker_name, e.username as executive_name
      FROM property_leads l
      JOIN properties p ON l.property_id = p.id
      LEFT JOIN users b ON l.broker_id = b.id
      LEFT JOIN users e ON l.assigned_executive_id = e.id
    `;
    const whereClauses = [];
    const params = [];

    switch (req.user.role) {
      case 'super_admin':
      case 'assistant_admin':
        // Admins see all leads
        break;

      case 'branch_admin':
        // Branch Admin sees leads assigned to properties of their branch
        whereClauses.push('p.branch_id = ?');
        params.push(req.user.branch_id);
        break;

      case 'branch_executive':
        // Executive sees leads assigned to them
        whereClauses.push('l.assigned_executive_id = ?');
        params.push(req.user.id);
        break;

      case 'external_broker':
        // Broker sees only leads they referred
        whereClauses.push('l.broker_id = ?');
        params.push(req.user.id);
        break;

      default:
        return res.status(403).json({ error: 'Role not authorized.' });
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY l.id DESC';

    const [rows] = await pool.query(query, params);
    return res.json(rows);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error listing leads.' });
  }
});

// PUT /api/leads/:id/status (Update Lead progress)
router.put('/:id/status', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin', 'branch_executive']), async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const validStatuses = ['new', 'in_progress', 'converted', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid lead status.' });
  }

  try {
    const [leads] = await pool.query(
      'SELECT l.assigned_executive_id, p.branch_id FROM property_leads l JOIN properties p ON l.property_id = p.id WHERE l.id = ? LIMIT 1',
      [id]
    );
    const lead = leads[0];

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    // Role checks
    if (req.user.role === 'branch_executive' && lead.assigned_executive_id != req.user.id) {
      return res.status(403).json({ error: 'Access denied. Lead is not assigned to you.' });
    }
    if (req.user.role === 'branch_admin' && lead.branch_id != req.user.branch_id) {
      return res.status(403).json({ error: 'Access denied. Lead does not belong to your branch.' });
    }

    const updates = ['status = ?'];
    const params = [status];

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    params.push(id);

    await pool.query(`UPDATE property_leads SET ${updates.join(', ')} WHERE id = ?`, params);
    return res.json({ message: 'Lead status updated successfully.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating lead.' });
  }
});

module.exports = router;
