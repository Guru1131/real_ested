const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/global-amenities
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM global_amenities ORDER BY amenity_name ASC');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch global amenities.' });
  }
});

// POST /api/global-amenities
router.post('/', authenticate, async (req, res) => {
  try {
    const { amenity_name, icon_url } = req.body;
    if (!amenity_name) {
      return res.status(400).json({ error: 'Amenity name is required.' });
    }
    
    // Check if exists
    const [existing] = await pool.query('SELECT id FROM global_amenities WHERE amenity_name = ?', [amenity_name]);
    if (existing.length > 0) {
      await pool.query('UPDATE global_amenities SET icon_url = ? WHERE amenity_name = ?', [icon_url, amenity_name]);
    } else {
      await pool.query('INSERT INTO global_amenities (amenity_name, icon_url) VALUES (?, ?)', [amenity_name, icon_url]);
    }
    
    return res.json({ message: 'Global amenity saved successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save global amenity.' });
  }
});

module.exports = router;
