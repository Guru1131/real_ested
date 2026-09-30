const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for media library uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/media_library');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// GET /api/media (List all media assets)
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM media_library ORDER BY created_at DESC');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch media library.' });
  }
});

// POST /api/media (Upload new media asset)
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    
    const file_url = 'uploads/media_library/' + req.file.filename;
    const file_name = req.body.file_name || req.file.originalname;
    const file_type = req.body.file_type || req.file.mimetype;

    const [result] = await pool.query(
      'INSERT INTO media_library (file_name, file_url, file_type) VALUES (?, ?, ?)',
      [file_name, file_url, file_type]
    );

    return res.status(201).json({
      message: 'Media uploaded successfully.',
      media: {
        id: result.insertId,
        file_name,
        file_url,
        file_type
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to upload media.' });
  }
});

// DELETE /api/media/:id (Delete media asset)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT file_url FROM media_library WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const filePath = path.join(__dirname, '../../', rows[0].file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await pool.query('DELETE FROM media_library WHERE id = ?', [req.params.id]);
    }
    return res.json({ message: 'Media deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete media.' });
  }
});

module.exports = router;
