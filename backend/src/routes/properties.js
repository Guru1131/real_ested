const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole, enforceBranchIsolation } = require('../middleware/authMiddleware');
const { propertyUploads } = require('../middleware/uploadMiddleware');
const { slugify, generatePropertyCode } = require('../utils/helpers');

// GET /api/properties/public (Public Property Listing Filter/Search)
router.get('/public', async (req, res) => {
  const { 
    projectName, location, city, type, minPrice, maxPrice, 
    bhk, availability, status 
  } = req.query;

  try {
    let query = `
      SELECT p.id, p.property_code, p.property_slug, p.project_name, p.property_type, 
             p.branch_id, p.location, p.city, p.builder, p.rera_id, p.completion_date, 
             p.project_status, p.availability_status, p.approval_status, p.created_at, 
             b.name as branch_name, MIN(pc.price) as min_price, MIN(pc.carpet_area) as min_area
      FROM properties p
      JOIN branches b ON p.branch_id = b.id
      LEFT JOIN property_configurations pc ON p.id = pc.property_id
    `;

    const whereClauses = ["p.is_deleted = 0", "p.approval_status = 'approved'"];
    const params = [];

    // Apply Filters
    if (projectName) {
      whereClauses.push('p.project_name LIKE ?');
      params.push(`%${projectName}%`);
    }
    if (location) {
      whereClauses.push('p.location LIKE ?');
      params.push(`%${location}%`);
    }
    if (city) {
      whereClauses.push('p.city LIKE ?');
      params.push(`%${city}%`);
    }
    if (type) {
      whereClauses.push('p.property_type = ?');
      params.push(type);
    }
    if (minPrice) {
      whereClauses.push('p.id IN (SELECT DISTINCT property_id FROM property_configurations WHERE price >= ?)');
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      whereClauses.push('p.id IN (SELECT DISTINCT property_id FROM property_configurations WHERE price <= ?)');
      params.push(parseFloat(maxPrice));
    }
    if (bhk) {
      whereClauses.push('pc.bhk_type LIKE ?');
      params.push(`%${bhk}%`);
    }
    if (availability) {
      whereClauses.push('p.availability_status = ?');
      params.push(availability);
    }
    if (status) {
      whereClauses.push('p.project_status = ?');
      params.push(status);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' GROUP BY p.id, b.name ORDER BY p.id DESC';

    const [rows] = await pool.query(query, params);

    // Fetch primary photo for each property
    for (let prop of rows) {
      const [media] = await pool.query(
        'SELECT file_url FROM property_media WHERE property_id = ? AND media_type = "image" LIMIT 1',
        [prop.id]
      );
      prop.primary_image = media[0] ? media[0].file_url : null;
    }

    return res.json(rows);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error listing public properties.' });
  }
});

// GET /api/properties/public/detail/:slug (Retrieve public property content by Slug URL)
router.get('/public/detail/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. Fetch main property record (must be approved and not deleted)
    const [props] = await pool.query(
      `SELECT p.*, b.name as branch_name, b.code as branch_code 
       FROM properties p
       JOIN branches b ON p.branch_id = b.id
       WHERE p.property_slug = ? AND p.approval_status = 'approved' AND p.is_deleted = 0 LIMIT 1`,
      [slug]
    );

    const property = props[0];
    if (!property) {
      return res.status(404).json({ error: 'Property not found or not approved.' });
    }

    // 2. Fetch BHK configurations
    const [configs] = await pool.query(
      'SELECT bhk_type, carpet_area, price, estimated_emi FROM property_configurations WHERE property_id = ?',
      [property.id]
    );

    // 3. Fetch Amenities
    const [amenities] = await pool.query(
      'SELECT amenity_name FROM property_amenities WHERE property_id = ?',
      [property.id]
    );
    const amenitiesList = amenities.map(a => a.amenity_name);

    // 4. Fetch Technical Specifications
    const [specifications] = await pool.query(
      'SELECT title, details FROM property_specifications WHERE property_id = ?',
      [property.id]
    );

    // 5. Fetch Media Attachments
    const [media] = await pool.query(
      'SELECT id, media_type, file_url, file_name FROM property_media WHERE property_id = ?',
      [property.id]
    );

    const mediaGrouped = { images: [], floor_plans: [], documents: [], brochures: [] };
    media.forEach(item => {
      const typeKey = item.media_type + 's';
      if (mediaGrouped[typeKey]) {
        mediaGrouped[typeKey].push({ id: item.id, url: item.file_url, name: item.file_name });
      }
    });

    return res.json({
      property,
      configurations: configs,
      amenities: amenitiesList,
      specifications,
      media: mediaGrouped
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving public details.' });
  }
});

// GET /api/properties (Filter and Search Catalog)
router.get('/', authenticate, async (req, res) => {
  const { 
    projectName, location, city, type, minPrice, maxPrice, 
    bhk, availability, approvalStatus, status 
  } = req.query;

  try {
    let query = `
      SELECT p.id, p.property_code, p.property_slug, p.project_name, p.property_type, 
             p.branch_id, p.location, p.city, p.builder, p.rera_id, p.completion_date, 
             p.project_status, p.availability_status, p.approval_status, p.created_at, 
             b.name as branch_name, MIN(pc.price) as min_price, MIN(pc.carpet_area) as min_area
      FROM properties p
      JOIN branches b ON p.branch_id = b.id
      LEFT JOIN property_configurations pc ON p.id = pc.property_id
    `;

    const whereClauses = ['p.is_deleted = 0'];
    const params = [];

    // Role-based data isolation
    switch (req.user.role) {
      case 'super_admin':
      case 'assistant_admin':
        if (approvalStatus) {
          whereClauses.push('p.approval_status = ?');
          params.push(approvalStatus);
        }
        break;

      case 'branch_admin':
        whereClauses.push('p.branch_id = ?');
        params.push(req.user.branch_id);
        if (approvalStatus) {
          whereClauses.push('p.approval_status = ?');
          params.push(approvalStatus);
        }
        break;

      case 'branch_executive':
        whereClauses.push('p.branch_id = ?');
        params.push(req.user.branch_id);
        whereClauses.push("p.approval_status = 'approved'");
        break;

      case 'external_broker':
        query += ' JOIN broker_branch_assignments ba ON p.branch_id = ba.branch_id';
        whereClauses.push('ba.broker_id = ?');
        params.push(req.user.id);
        whereClauses.push("p.approval_status = 'approved'");
        break;

      default:
        return res.status(403).json({ error: 'Role not authorized.' });
    }

    // Apply Filters
    if (projectName) {
      whereClauses.push('p.project_name LIKE ?');
      params.push(`%${projectName}%`);
    }
    if (location) {
      whereClauses.push('p.location LIKE ?');
      params.push(`%${location}%`);
    }
    if (city) {
      whereClauses.push('p.city LIKE ?');
      params.push(`%${city}%`);
    }
    if (type) {
      whereClauses.push('p.property_type = ?');
      params.push(type);
    }
    if (minPrice) {
      whereClauses.push('p.id IN (SELECT DISTINCT property_id FROM property_configurations WHERE price >= ?)');
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      whereClauses.push('p.id IN (SELECT DISTINCT property_id FROM property_configurations WHERE price <= ?)');
      params.push(parseFloat(maxPrice));
    }
    if (bhk) {
      whereClauses.push('pc.bhk_type LIKE ?');
      params.push(`%${bhk}%`);
    }
    if (availability) {
      whereClauses.push('p.availability_status = ?');
      params.push(availability);
    }
    if (status) {
      whereClauses.push('p.project_status = ?');
      params.push(status);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' GROUP BY p.id, b.name ORDER BY p.id DESC';

    const [rows] = await pool.query(query, params);

    // Fetch primary photo for each property
    for (let prop of rows) {
      const [media] = await pool.query(
        'SELECT file_url FROM property_media WHERE property_id = ? AND media_type = "image" LIMIT 1',
        [prop.id]
      );
      prop.primary_image = media[0] ? media[0].file_url : null;
    }

    return res.json(rows);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error listing properties.' });
  }
});

// GET /api/properties/detail/:slug (Retrieve dynamic property content by Slug URL)
router.get('/detail/:slug', authenticate, async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. Fetch main property record
    const [props] = await pool.query(
      `SELECT p.*, b.name as branch_name, b.code as branch_code 
       FROM properties p
       JOIN branches b ON p.branch_id = b.id
       WHERE p.property_slug = ? AND p.is_deleted = 0 LIMIT 1`,
      [slug]
    );

    const property = props[0];
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    // 2. Access control check
    if (['branch_admin', 'branch_executive'].includes(req.user.role)) {
      if (!enforceBranchIsolation(req, res, property.branch_id)) return;
    }
    if (req.user.role === 'branch_executive' && property.approval_status !== 'approved') {
      return res.status(403).json({ error: 'Access denied. Property is not approved.' });
    }
    if (req.user.role === 'external_broker') {
      if (property.approval_status !== 'approved') {
        return res.status(403).json({ error: 'Access denied. Property is not approved.' });
      }
      // Check assignments
      const [assigns] = await pool.query(
        'SELECT id FROM broker_branch_assignments WHERE broker_id = ? AND branch_id = ? LIMIT 1',
        [req.user.id, property.branch_id]
      );
      if (assigns.length === 0) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this branch.' });
      }

      // Log views
      const metadata = JSON.stringify({ ip: req.ip, user_agent: req.headers['user-agent'] });
      await pool.query(
        'INSERT INTO broker_activity_logs (broker_id, activity_type, property_id, metadata) VALUES (?, "property_view", ?, ?)',
        [req.user.id, property.id, metadata]
      );
    }

    // 3. Fetch BHK configurations
    const [configs] = await pool.query(
      'SELECT bhk_type, carpet_area, price, estimated_emi FROM property_configurations WHERE property_id = ?',
      [property.id]
    );

    // 4. Fetch Amenities
    const [amenities] = await pool.query(
      'SELECT amenity_name FROM property_amenities WHERE property_id = ?',
      [property.id]
    );
    const amenitiesList = amenities.map(a => a.amenity_name);

    // 5. Fetch Technical Specifications
    const [specifications] = await pool.query(
      'SELECT title, details FROM property_specifications WHERE property_id = ?',
      [property.id]
    );

    // 6. Fetch Media Attachments
    const [media] = await pool.query(
      'SELECT id, media_type, file_url, file_name FROM property_media WHERE property_id = ?',
      [property.id]
    );

    const mediaGrouped = { images: [], floor_plans: [], documents: [], brochures: [] };
    media.forEach(item => {
      const typeKey = item.media_type + 's';
      if (mediaGrouped[typeKey]) {
        mediaGrouped[typeKey].push({ id: item.id, url: item.file_url, name: item.file_name });
      }
    });

    return res.json({
      property,
      configurations: configs,
      amenities: amenitiesList,
      specifications,
      media: mediaGrouped
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving details.' });
  }
});

// POST /api/properties (Add Property - Branch Admin only)
router.post('/', authenticate, requireRole(['branch_admin']), propertyUploads, async (req, res) => {
  const {
    project_name, property_type, location, city, address, survey_number,
    builder, rera_id, completion_date, project_status, highlights,
    map_embed_url, developer_legacy, availability_status
  } = req.body;

  // JSON strings to parse
  const configurationsRaw = req.body.configurations || '[]';
  const amenitiesRaw = req.body.amenities || '[]';
  const specificationsRaw = req.body.specifications || '[]';

  if (!project_name || !location || !city || !address || !builder) {
    return res.status(400).json({ error: 'Required fields: project_name, location, city, address, builder.' });
  }

  const branchId = req.user.branch_id;
  const dbConnection = await pool.getConnection();

  try {
    await dbConnection.beginTransaction();

    // Fetch branch code for Unique Code generation
    const [branchRows] = await dbConnection.query('SELECT code FROM branches WHERE id = ? LIMIT 1', [branchId]);
    const branchCode = branchRows[0] ? branchRows[0].code : 'PROP';
    const property_code = generatePropertyCode(branchCode);
    const property_slug = slugify(`${city}-${location}-${project_name}`);

    // Insert main properties record
    const [propResult] = await dbConnection.query(
      `INSERT INTO properties 
       (property_code, property_slug, project_name, property_type, branch_id, location, address, survey_number, city, builder, rera_id, completion_date, project_status, highlights, map_embed_url, developer_legacy, availability_status, approval_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        property_code, property_slug, project_name, property_type, branchId, location, address, survey_number || null,
        city, builder, rera_id || null, completion_date || null, project_status || 'under_construction',
        highlights || null, map_embed_url || null, developer_legacy || null, availability_status || 'available',
        req.user.id
      ]
    );

    const propertyId = propResult.insertId;

    // Insert Configurations
    const configurations = JSON.parse(configurationsRaw);
    if (Array.isArray(configurations)) {
      for (let config of configurations) {
        await dbConnection.query(
          'INSERT INTO property_configurations (property_id, bhk_type, carpet_area, price, estimated_emi) VALUES (?, ?, ?, ?, ?)',
          [propertyId, config.bhk_type, config.carpet_area, config.price, config.estimated_emi || null]
        );
      }
    }

    // Insert Amenities
    const amenities = JSON.parse(amenitiesRaw);
    if (Array.isArray(amenities)) {
      for (let amenity of amenities) {
        await dbConnection.query(
          'INSERT INTO property_amenities (property_id, amenity_name) VALUES (?, ?)',
          [propertyId, amenity]
        );
      }
    }

    // Insert Specifications
    const specifications = JSON.parse(specificationsRaw);
    if (Array.isArray(specifications)) {
      for (let spec of specifications) {
        await dbConnection.query(
          'INSERT INTO property_specifications (property_id, title, details) VALUES (?, ?, ?)',
          [propertyId, spec.title, spec.details]
        );
      }
    }

    // Handle Uploaded Files
    const mediaTypes = ['image', 'floor_plan', 'document', 'brochure'];
    for (let mType of mediaTypes) {
      const fieldname = mType + 's';
      if (req.files && req.files[fieldname]) {
        for (let file of req.files[fieldname]) {
          const relativeUrl = 'uploads/' + file.filename;
          await dbConnection.query(
            'INSERT INTO property_media (property_id, media_type, file_url, file_name) VALUES (?, ?, ?, ?)',
            [propertyId, mType, relativeUrl, file.originalname]
          );
        }
      }
    }

    await dbConnection.commit();
    return res.json({ message: 'Property draft created successfully.', propertyId, property_code, property_slug });

  } catch (err) {
    await dbConnection.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Server error saving property draft.' });
  } finally {
    dbConnection.release();
  }
});

// POST /api/properties/:id/submit (Submit draft for approval)
router.post('/:id/submit', authenticate, requireRole(['branch_admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT branch_id, approval_status FROM properties WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    const property = rows[0];

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    if (!enforceBranchIsolation(req, res, property.branch_id)) return;

    if (property.approval_status !== 'draft') {
      return res.status(400).json({ error: 'Only drafts can be submitted for approval.' });
    }

    await pool.query("UPDATE properties SET approval_status = 'pending_approval' WHERE id = ?", [id]);
    return res.json({ message: 'Property draft submitted successfully for Super Admin audit.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error submitting property.' });
  }
});

// POST /api/properties/:id/approve (Super Admin Approve/Reject reviews)
router.post('/:id/approve', authenticate, requireRole(['super_admin']), async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  if (action !== 'approve' && $action !== 'reject' && action !== 'reject') { // check strings
    return res.status(400).json({ error: "Action must be either 'approve' or 'reject'." });
  }

  try {
    const [rows] = await pool.query('SELECT approval_status FROM properties WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    const property = rows[0];

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    if (property.approval_status !== 'pending_approval') {
      return res.status(400).json({ error: 'Only properties pending approval can be reviewed.' });
    }

    const nextStatus = (action === 'approve') ? 'approved' : 'rejected';
    await pool.query(
      'UPDATE properties SET approval_status = ?, approved_by = ? WHERE id = ?',
      [nextStatus, req.user.id, id]
    );

    return res.json({ message: `Property has been successfully ${action === 'approve' ? 'approved' : 'rejected'}.` });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error processing approval.' });
  }
});

// POST /api/properties/:id/share (Log property share actions)
router.post('/:id/share', authenticate, async (req, res) => {
  const { id } = req.params;
  const { channel, recipient } = req.body; // 'whatsapp' or 'email'

  if (channel !== 'whatsapp' && channel !== 'email') {
    return res.status(400).json({ error: "Share channel must be 'whatsapp' or 'email'." });
  }

  try {
    const [rows] = await pool.query('SELECT id, project_name FROM properties WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    const property = rows[0];

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    if (req.user.role === 'external_broker') {
      const activityType = (channel === 'whatsapp') ? 'property_share_whatsapp' : 'property_share_email';
      const metadata = JSON.stringify({ recipient, ip: req.ip });
      await pool.query(
        'INSERT INTO broker_activity_logs (broker_id, activity_type, property_id, metadata) VALUES (?, ?, ?, ?)',
        [req.user.id, activityType, id, metadata]
      );
    }

    return res.json({ message: 'Sharing event logged successfully.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error logging share action.' });
  }
});

module.exports = router;
