const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const multer = require('multer');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

// Multer setup for CSV uploads (memory storage is fine for small/medium CSVs)
const upload = multer({ storage: multer.memoryStorage() });

// 1. Download CSV Template
router.get('/properties/template', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), (req, res) => {
  const template = [
    {
      property_code: 'PROP-TEST-001 (Optional - auto generated if blank)',
      project_name: 'Test Project',
      property_type: 'flat',
      location: 'Andheri West',
      address: '123 Test St',
      survey_number: '12/3',
      city: 'Mumbai',
      builder: 'Test Builders',
      rera_id: 'RERA12345',
      completion_date: '2026-12-01',
      project_status: 'under_construction',
      highlights: 'Great view, Premium amenities',
      map_embed_url: '',
      virtual_tour_url: '',
      developer_legacy: '',
      availability_status: 'available',
      branch_code: 'Leave blank for your branch'
    }
  ];
  
  try {
    const json2csvParser = new Parser();
    const csvData = json2csvParser.parse(template);
    res.header('Content-Type', 'text/csv');
    res.attachment('property_import_template.csv');
    return res.send(csvData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate template.' });
  }
});

// 2. Export Properties with Filters
router.get('/properties/export', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  try {
    const { branch_id, project_status, property_type } = req.query;
    let query = `
      SELECT p.*, b.name as branch_name, b.code as branch_code 
      FROM properties p 
      LEFT JOIN branches b ON p.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // Branch Admin isolation
    if (req.user.role === 'branch_admin') {
      query += ' AND p.branch_id = ?';
      params.push(req.user.branch_id);
    } else if (branch_id) {
      query += ' AND p.branch_id = ?';
      params.push(branch_id);
    }

    if (project_status) {
      query += ' AND p.project_status = ?';
      params.push(project_status);
    }
    
    if (property_type) {
      query += ' AND p.property_type = ?';
      params.push(property_type);
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No properties found to export matching the filters.' });
    }

    const json2csvParser = new Parser();
    const csvData = json2csvParser.parse(rows);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`properties_export_${Date.now()}.csv`);
    return res.send(csvData);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error generating export.' });
  }
});

// 3. Smart Backup (Export specific tables)
router.post('/backup', authenticate, requireRole(['super_admin', 'assistant_admin']), async (req, res) => {
  const { tables } = req.body;
  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ error: 'Please select at least one table to backup.' });
  }

  const allowedTables = ['properties', 'users', 'property_leads', 'branches', 'property_configurations'];
  const backupData = {};

  try {
    for (const table of tables) {
      if (allowedTables.includes(table)) {
        const [rows] = await pool.query(`SELECT * FROM ${table}`);
        backupData[table] = rows;
      }
    }

    res.header('Content-Type', 'application/json');
    res.attachment(`backup_${Date.now()}.json`);
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error generating backup.' });
  }
});

// Helper for slugs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// 4. Import Properties via CSV
router.post('/properties/import', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded.' });
  }

  const results = [];
  const errors = [];
  
  try {
    // Parse CSV from buffer
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    await new Promise((resolve, reject) => {
      bufferStream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or invalid.' });
    }

    const dbConnection = await pool.getConnection();
    await dbConnection.beginTransaction();

    let importedCount = 0;

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // +1 for 0-index, +1 for header
      
      // Validation Check
      if (!row.project_name || !row.property_type || !row.location || !row.city || !row.builder) {
        errors.push(`Row ${rowNum}: Missing required fields (project_name, property_type, location, city, builder).`);
        continue;
      }

      const property_type_enum = ['flat', 'bungalow', 'villa', 'shop', 'office', 'commercial'];
      if (!property_type_enum.includes(row.property_type)) {
        errors.push(`Row ${rowNum}: Invalid property_type (${row.property_type}). Must be one of: ${property_type_enum.join(', ')}`);
        continue;
      }

      // Branch Resolution
      let targetBranchId = req.user.role === 'branch_admin' ? req.user.branch_id : null;
      let branchCode = 'PROP';

      if (!targetBranchId) {
        if (row.branch_code) {
          const [bRows] = await dbConnection.query('SELECT id, code FROM branches WHERE code = ? LIMIT 1', [row.branch_code]);
          if (bRows[0]) {
            targetBranchId = bRows[0].id;
            branchCode = bRows[0].code;
          } else {
            errors.push(`Row ${rowNum}: Branch code ${row.branch_code} not found.`);
            continue;
          }
        } else {
          // Fallback to primary branch
          const [bRows] = await dbConnection.query('SELECT id, code FROM branches ORDER BY id ASC LIMIT 1');
          if (bRows[0]) {
            targetBranchId = bRows[0].id;
            branchCode = bRows[0].code;
          } else {
             targetBranchId = 1;
          }
        }
      } else {
        const [bRows] = await dbConnection.query('SELECT code FROM branches WHERE id = ? LIMIT 1', [targetBranchId]);
        if (bRows[0]) branchCode = bRows[0].code;
      }

      // Property Code & Slug
      const property_code = row.property_code && !row.property_code.includes('auto generated') 
        ? row.property_code 
        : `${branchCode}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
      
      const property_slug = slugify(`${row.city}-${row.location}-${row.project_name}-${Math.floor(Math.random() * 1000)}`);

      const approval_status = (req.user.role === 'super_admin') ? 'approved' : 'pending_approval';

      try {
        await dbConnection.query(
          `INSERT INTO properties 
           (property_code, property_slug, project_name, property_type, branch_id, location, address, survey_number, city, builder, rera_id, completion_date, project_status, highlights, map_embed_url, virtual_tour_url, developer_legacy, availability_status, approval_status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            property_code, property_slug, row.project_name, row.property_type, targetBranchId, row.location, row.address || '', row.survey_number || null,
            row.city, row.builder, row.rera_id || null, row.completion_date || null, row.project_status || 'under_construction',
            row.highlights || null, row.map_embed_url || null, row.virtual_tour_url || null, row.developer_legacy || null, row.availability_status || 'available',
            approval_status, req.user.id
          ]
        );
        importedCount++;
      } catch (insertErr) {
        errors.push(`Row ${rowNum}: Database error: ${insertErr.message}`);
      }
    }

    if (errors.length > 0 && importedCount === 0) {
      await dbConnection.rollback();
      dbConnection.release();
      return res.status(400).json({ error: 'Import failed completely. No records were imported.', details: errors });
    }

    await dbConnection.commit();
    dbConnection.release();

    return res.json({ 
      message: `Successfully imported ${importedCount} properties.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error processing CSV file.' });
  }
});

module.exports = router;
