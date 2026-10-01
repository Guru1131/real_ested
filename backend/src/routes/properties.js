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
    bhk, availability, status, propertyCode, code, possessionTimeline, possession
  } = req.query;

  const targetCode = propertyCode || code;
  const targetPossession = possessionTimeline || possession;

  try {
    let query = `
      SELECT p.id, p.property_code, p.property_slug, p.project_name, p.property_type, 
             p.branch_id, p.location, p.city, p.builder, p.rera_id, p.completion_date, 
             p.project_status, p.availability_status, p.approval_status, p.created_at, 
             p.total_units, p.available_units,
             b.name as branch_name, MIN(pc.price) as min_price, MIN(pc.carpet_area) as min_area
      FROM properties p
      JOIN branches b ON p.branch_id = b.id
      LEFT JOIN property_configurations pc ON p.id = pc.property_id
    `;

    const whereClauses = ["p.is_deleted = 0", "p.approval_status = 'approved'"];
    const params = [];

    // Apply Filters
    if (targetCode) {
      whereClauses.push('(p.property_code LIKE ? OR p.id = ?)');
      params.push(`%${targetCode.trim()}%`, isNaN(targetCode) ? 0 : parseInt(targetCode));
    }
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
    if (targetPossession) {
      if (targetPossession === 'ready_to_move' || targetPossession === '0') {
        whereClauses.push("(p.project_status = 'ready_possession' OR p.completion_date <= CURDATE())");
      } else if (targetPossession === '1_month') {
        whereClauses.push("p.completion_date <= DATE_ADD(CURDATE(), INTERVAL 1 MONTH)");
      } else if (targetPossession === '3_months') {
        whereClauses.push("p.completion_date <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)");
      } else if (targetPossession === '6_months') {
        whereClauses.push("p.completion_date <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH)");
      } else if (targetPossession === '12_months') {
        whereClauses.push("p.completion_date <= DATE_ADD(CURDATE(), INTERVAL 12 MONTH)");
      }
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' GROUP BY p.id, b.name ORDER BY p.id DESC';

    const [rows] = await pool.query(query, params);

    // Fetch primary photo for each property (Thumbnail -> Image fallback)
    for (let prop of rows) {
      const [media] = await pool.query(
        'SELECT file_url FROM property_media WHERE property_id = ? AND media_type = "thumbnail" LIMIT 1',
        [prop.id]
      );
      if (media.length > 0) {
        prop.primary_image = media[0].file_url;
      } else {
        const [imgMedia] = await pool.query(
          'SELECT file_url FROM property_media WHERE property_id = ? AND media_type = "image" LIMIT 1',
          [prop.id]
        );
        prop.primary_image = imgMedia[0] ? imgMedia[0].file_url : null;
      }
    }

    return res.json(rows);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error listing public properties.' });
  }
});

// GET /api/properties/public/detail/:slug (Retrieve public property content by Slug URL or ID)
router.get('/public/detail/:slug', async (req, res) => {
  const { slug } = req.params;
  const isNumericId = !isNaN(slug) && !isNaN(parseInt(slug));

  try {
    // 1. Fetch main property record (must be approved and not deleted)
    const [props] = await pool.query(
      `SELECT p.*, b.name as branch_name, b.code as branch_code 
       FROM properties p
       JOIN branches b ON p.branch_id = b.id
       WHERE (p.property_slug = ? ${isNumericId ? 'OR p.id = ?' : ''}) AND p.approval_status = 'approved' AND p.is_deleted = 0 LIMIT 1`,
      isNumericId ? [slug, parseInt(slug)] : [slug]
    );

    const property = props[0];
    if (!property) {
      return res.status(404).json({ error: 'Property not found or not approved.' });
    }

    // 2. Fetch BHK configurations
    const [configs] = await pool.query(
      'SELECT bhk_type, carpet_area, price, estimated_emi, floor_plan_url FROM property_configurations WHERE property_id = ?',
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
    const [phases] = await pool.query(
      'SELECT phase_name, rera_id FROM property_phases WHERE property_id = ?',
      [property.id]
    );

    const [videos] = await pool.query(
      'SELECT title, video_url, thumbnail_url FROM property_videos WHERE property_id = ?',
      [property.id]
    );

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
      phases,
      videos,
      media: mediaGrouped
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving public details.' });
  }
});

// GET /api/properties/public/recommendations/:slug
router.get('/public/recommendations/:slug', async (req, res) => {
  const { slug } = req.params;
  const isNumericId = !isNaN(slug) && !isNaN(parseInt(slug));

  try {
    // First, find the target property's city and ID
    const [targetProps] = await pool.query(
      `SELECT id, city FROM properties WHERE (property_slug = ? ${isNumericId ? 'OR id = ?' : ''}) AND is_deleted = 0 LIMIT 1`,
      isNumericId ? [slug, parseInt(slug)] : [slug]
    );

    if (!targetProps.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const targetProperty = targetProps[0];

    // Find up to 4 other approved properties in the same city
    const [recommendations] = await pool.query(
      `SELECT p.id, p.property_slug, p.project_name, p.property_type, p.location, p.city, p.builder, 
              MIN(pc.price) as min_price,
              (SELECT file_url FROM property_media WHERE property_id = p.id AND media_type = 'thumbnail' LIMIT 1) as thumbnail_url
       FROM properties p
       LEFT JOIN property_configurations pc ON p.id = pc.property_id
       WHERE p.city = ? AND p.id != ? AND p.approval_status = 'approved' AND p.is_deleted = 0
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT 4`,
      [targetProperty.city, targetProperty.id]
    );

    res.json(recommendations);
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    res.status(500).json({ error: 'Server error fetching recommendations' });
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
             p.total_units, p.available_units,
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

    // Fetch primary photo for each property (Thumbnail -> Image fallback)
    for (let prop of rows) {
      const [media] = await pool.query(
        'SELECT file_url FROM property_media WHERE property_id = ? AND media_type = "thumbnail" LIMIT 1',
        [prop.id]
      );
      if (media.length > 0) {
        prop.primary_image = media[0].file_url;
      } else {
        const [imgMedia] = await pool.query(
          'SELECT file_url FROM property_media WHERE property_id = ? AND media_type = "image" LIMIT 1',
          [prop.id]
        );
        prop.primary_image = imgMedia[0] ? imgMedia[0].file_url : null;
      }
    }

    return res.json(rows);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error listing properties.' });
  }
});

// GET /api/properties/detail/:slug (Retrieve dynamic property content by Slug URL or numeric ID)
// GET /api/properties/amenities/distinct (Fetch all distinct custom amenities)
router.get('/amenities/distinct', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT amenity_name FROM property_amenities');
    const amenities = rows.map(r => r.amenity_name);
    return res.json(amenities);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving distinct amenities.' });
  }
});

// GET /api/properties/check-rera (Check RERA ID Uniqueness)
router.get('/check-rera', async (req, res) => {
  const { rera_id, exclude_id } = req.query;
  if (!rera_id || !rera_id.trim()) {
    return res.json({ exists: false });
  }

  const trimmed = rera_id.trim();
  const excludeIdNum = exclude_id ? parseInt(exclude_id, 10) : 0;

  try {
    let query = 'SELECT id, project_name FROM properties WHERE rera_id = ? AND is_deleted = 0';
    const params = [trimmed];
    if (excludeIdNum > 0) {
      query += ' AND id != ?';
      params.push(excludeIdNum);
    }
    query += ' LIMIT 1';

    const [rows] = await pool.query(query, params);
    if (rows.length > 0) {
      return res.json({ exists: true, property_id: rows[0].id, project_name: rows[0].project_name });
    }
    return res.json({ exists: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error checking RERA ID.' });
  }
});

router.get('/detail/:slug', authenticate, async (req, res) => {
  const { slug } = req.params;
  const isNumericId = !isNaN(slug) && !isNaN(parseInt(slug));

  try {
    // 1. Fetch main property record
    const [props] = await pool.query(
      `SELECT p.*, b.name as branch_name, b.code as branch_code 
       FROM properties p
       JOIN branches b ON p.branch_id = b.id
       WHERE (p.property_slug = ? ${isNumericId ? 'OR p.id = ?' : ''}) AND p.is_deleted = 0 LIMIT 1`,
      isNumericId ? [slug, parseInt(slug)] : [slug]
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
      'SELECT bhk_type, carpet_area, price, estimated_emi, floor_plan_url FROM property_configurations WHERE property_id = ?',
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
    const [phases] = await pool.query(
      'SELECT phase_name, rera_id FROM property_phases WHERE property_id = ?',
      [property.id]
    );

    const [videos] = await pool.query(
      'SELECT title, video_url, thumbnail_url FROM property_videos WHERE property_id = ?',
      [property.id]
    );

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
      phases,
      videos,
      media: mediaGrouped
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving details.' });
  }
});


// POST /api/properties (Add Property - Admin roles)
router.post('/', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), propertyUploads, async (req, res) => {
  const {
    project_name, property_type, location, city, address, survey_number,
    builder, rera_id, completion_date, project_status, highlights,
    map_embed_url, virtual_tour_url, developer_legacy, availability_status, action,
    total_units, available_units
  } = req.body;

  // JSON strings to parse
  const configurationsRaw = req.body.configurations || '[]';
  const amenitiesRaw = req.body.amenities || '[]';
  const specificationsRaw = req.body.specifications || '[]';
  const phasesRaw = req.body.phases || '[]';
  const videosRaw = req.body.videos || '[]';

  if (!project_name || !location || !city || !address || !builder) {
    return res.status(400).json({ error: 'Required fields: project_name, location, city, address, builder.' });
  }

  /*  */
  
  if (['super_admin', 'assistant_admin'].includes(req.user.role) && req.body.branch_id) {
    branchId = parseInt(req.body.branch_id);
  }
  if (!branchId) branchId = 1;
  const dbConnection = await pool.getConnection();

  try {
    await dbConnection.beginTransaction();

    // Fetch branch code for Unique Code generation
    const [branchRows] = await dbConnection.query('SELECT code FROM branches WHERE id = ? LIMIT 1', [branchId]);
    const branchCode = branchRows[0] ? branchRows[0].code : 'PROP';
    const property_code = generatePropertyCode(branchCode);
    const property_slug = slugify(`${city}-${location}-${project_name}`);

    const initialApprovalStatus = action === 'submit' ? 'pending_approval' : 'draft';

    // Insert main properties record
    const [propResult] = await dbConnection.query(
      `INSERT INTO properties 
       (property_code, property_slug, project_name, property_type, branch_id, location, address, survey_number, city, builder, rera_id, completion_date, project_status, highlights, map_embed_url, virtual_tour_url, developer_legacy, availability_status, approval_status, created_by, total_units, available_units)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        property_code, property_slug, project_name, property_type, branchId, location, address, survey_number || null,
        city, builder, rera_id || null, completion_date || null, project_status || 'under_construction',
        highlights || null, map_embed_url || null, virtual_tour_url || null, developer_legacy || null, availability_status || 'available',
        initialApprovalStatus, req.user.id,
        total_units !== undefined ? parseInt(total_units) : 0,
        available_units !== undefined ? parseInt(available_units) : 0
      ]
    );

    const propertyId = propResult.insertId;

    // Insert configurations
    const configurations = JSON.parse(configurationsRaw);
    if (Array.isArray(configurations)) {
      for (let config of configurations) {
        await dbConnection.query(
          'INSERT INTO property_configurations (property_id, bhk_type, carpet_area, price, estimated_emi, floor_plan_url) VALUES (?, ?, ?, ?, ?, ?)',
          [propertyId, config.bhk_type, config.carpet_area, config.price, config.estimated_emi || null, config.floor_plan_url || config.floor_plan || null]
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

    // Insert Phases
    const phases = JSON.parse(phasesRaw);
    if (Array.isArray(phases)) {
      for (let phase of phases) {
        if (phase.phase_name && phase.rera_id) {
          await dbConnection.query(
            'INSERT INTO property_phases (property_id, phase_name, rera_id) VALUES (?, ?, ?)',
            [propertyId, phase.phase_name, phase.rera_id]
          );
        }
      }
    }

    // Insert Videos
    const videos = JSON.parse(videosRaw);
    if (Array.isArray(videos)) {
      for (let vid of videos) {
        if (vid.video_url) {
          await dbConnection.query(
            'INSERT INTO property_videos (property_id, video_url, thumbnail_url, title) VALUES (?, ?, ?, ?)',
            [propertyId, vid.video_url, vid.thumbnail_url || null, vid.title || null]
          );
        }
      }
    }

    // Handle Uploaded Files (Legacy multer support)
    const mediaTypes = ['image', 'floor_plan', 'document', 'brochure', 'thumbnail', 'top_banner'];
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

    // Handle Media Library Items from Payload
    const libraryFields = {
      media_library_images: 'image',
      media_library_thumbnails: 'thumbnail',
      media_library_top_banners: 'top_banner',
      media_library_floor_plans: 'floor_plan',
      media_library_brochures: 'brochure'
    };
    for (const [field, mType] of Object.entries(libraryFields)) {
      if (req.body[field]) {
        try {
          const items = JSON.parse(req.body[field]);
          if (Array.isArray(items)) {
            for (let item of items) {
              await dbConnection.query(
                'INSERT INTO property_media (property_id, media_type, file_url, file_name) VALUES (?, ?, ?, ?)',
                [propertyId, mType, item.file_url, item.file_name]
              );
            }
          }
        } catch (e) {
          console.error(`Error parsing ${field}`, e);
        }
      }
    }

    await dbConnection.commit();
    return res.json({ 
      message: initialApprovalStatus === 'pending_approval' ? 'Property submitted for Super Admin review & approval.' : 'Property draft created successfully.', 
      propertyId, 
      property_code, 
      property_slug 
    });

  } catch (err) {
    await dbConnection.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Server error saving property draft. Details: ' + err.message });
  } finally {
    dbConnection.release();
  }
});

// POST /api/properties/:id/submit (Submit draft, approved, or rejected property for approval review)
router.post('/:id/submit', authenticate, requireRole(['branch_admin', 'super_admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT branch_id, approval_status FROM properties WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    const property = rows[0];

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    if (req.user.role === 'branch_admin') {
      if (!enforceBranchIsolation(req, res, property.branch_id)) return;
    }

    if (property.approval_status === 'pending_approval') {
      return res.status(400).json({ error: 'Property is already pending approval in the review queue.' });
    }

    await pool.query("UPDATE properties SET approval_status = 'pending_approval' WHERE id = ?", [id]);
    return res.json({ message: 'Property submitted successfully for Super Admin audit & approval.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error submitting property.' });
  }
});

// POST /api/properties/update_inventory.php & POST /api/properties/inventory
const handleUpdateInventoryRoute = async (req, res) => {
  const { id, total_units, available_units } = req.body;
  const propId = id || req.params.id;

  if (!propId) {
    return res.status(400).json({ error: 'Property ID is required.' });
  }

  try {
    try {
      await pool.query('SELECT total_units FROM properties LIMIT 1');
    } catch (e) {
      try { await pool.query('ALTER TABLE properties ADD COLUMN total_units INT DEFAULT 0'); } catch(e2){}
    }

    try {
      await pool.query('SELECT available_units FROM properties LIMIT 1');
    } catch (e) {
      try { await pool.query('ALTER TABLE properties ADD COLUMN available_units INT DEFAULT 0'); } catch(e2){}
    }

    const [rows] = await pool.query('SELECT id, branch_id FROM properties WHERE id = ? AND is_deleted = 0 LIMIT 1', [propId]);
    const property = rows[0];

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    if (['branch_admin', 'branch_executive'].includes(req.user.role)) {
      if (!enforceBranchIsolation(req, res, property.branch_id)) return;
    }

    const tu = parseInt(total_units) || 0;
    const au = parseInt(available_units) || 0;

    await pool.query('UPDATE properties SET total_units = ?, available_units = ? WHERE id = ?', [tu, au, propId]);

    return res.json({ message: 'Inventory updated successfully', id: propId, total_units: tu, available_units: au });
  } catch (err) {
    console.error('Error updating inventory:', err);
    return res.status(500).json({ error: 'Failed to update inventory.', details: err.message });
  }
};

router.post('/update_inventory.php', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), handleUpdateInventoryRoute);
router.post('/inventory', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), handleUpdateInventoryRoute);
router.put('/:id/inventory', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), handleUpdateInventoryRoute);

// GET /api/properties/detail-by-id/:id (Fetch property details by numeric ID for Edit Mode)
router.get('/detail-by-id/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const [props] = await pool.query(
      `SELECT p.*, b.name as branch_name, b.code as branch_code 
       FROM properties p
       JOIN branches b ON p.branch_id = b.id
       WHERE p.id = ? AND p.is_deleted = 0 LIMIT 1`,
      [id]
    );

    const property = props[0];
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    if (['branch_admin', 'branch_executive'].includes(req.user.role)) {
      if (!enforceBranchIsolation(req, res, property.branch_id)) return;
    }

    const [configs] = await pool.query('SELECT bhk_type, carpet_area, price, estimated_emi, floor_plan_url FROM property_configurations WHERE property_id = ?', [id]);
    const [amenities] = await pool.query('SELECT amenity_name FROM property_amenities WHERE property_id = ?', [id]);
    const amenitiesList = amenities.map(a => a.amenity_name);
    const [specifications] = await pool.query('SELECT title, details FROM property_specifications WHERE property_id = ?', [id]);
    const [phases] = await pool.query('SELECT phase_name, rera_id FROM property_phases WHERE property_id = ?', [id]);
    const [videos] = await pool.query('SELECT title, video_url, thumbnail_url FROM property_videos WHERE property_id = ?', [id]);
    const [media] = await pool.query('SELECT id, media_type, file_url, file_name FROM property_media WHERE property_id = ?', [id]);

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
      phases,
      videos,
      media: mediaGrouped
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error retrieving property by ID.' });
  }
});

// PUT /api/properties/:id (Update Property details & re-submit for review if requested)
router.put('/:id', authenticate, requireRole(['branch_admin', 'super_admin', 'assistant_admin']), propertyUploads, async (req, res) => {
  const { id } = req.params;
  const {
    project_name, property_type, location, city, address, survey_number,
    builder, rera_id, completion_date, project_status, highlights,
    map_embed_url, virtual_tour_url, developer_legacy, availability_status, action,
    total_units, available_units
  } = req.body;

  const dbConnection = await pool.getConnection();

  try {
    await dbConnection.beginTransaction();

    const [existingProps] = await dbConnection.query('SELECT * FROM properties WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    const existingProperty = existingProps[0];

    if (!existingProperty) {
      dbConnection.release();
      return res.status(404).json({ error: 'Property not found.' });
    }

    /*  */
     {
      if (!enforceBranchIsolation(req, res, existingProperty.branch_id)) {
        dbConnection.release();
        return;
      }
    }

    // Determine target approval status:
    let targetApprovalStatus = existingProperty.approval_status;
    if (action === 'submit') {
      targetApprovalStatus = 'pending_approval';
    } else if (req.user.role === 'branch_admin' && existingProperty.approval_status === 'approved') {
      targetApprovalStatus = 'pending_approval';
    }

    // Update main properties table
    await dbConnection.query(
      `UPDATE properties SET 
       project_name = ?, property_type = ?, location = ?, address = ?, survey_number = ?, 
       city = ?, builder = ?, rera_id = ?, completion_date = ?, project_status = ?, 
       highlights = ?, map_embed_url = ?, virtual_tour_url = ?, developer_legacy = ?, availability_status = ?, 
       approval_status = ?, total_units = ?, available_units = ? 
       WHERE id = ?`,
      [
        project_name || existingProperty.project_name,
        property_type || existingProperty.property_type,
        location || existingProperty.location,
        address || existingProperty.address,
        survey_number !== undefined ? survey_number : existingProperty.survey_number,
        city || existingProperty.city,
        builder || existingProperty.builder,
        rera_id !== undefined ? rera_id : existingProperty.rera_id,
        completion_date || existingProperty.completion_date,
        project_status || existingProperty.project_status,
        highlights !== undefined ? highlights : existingProperty.highlights,
        map_embed_url !== undefined ? map_embed_url : existingProperty.map_embed_url,
        virtual_tour_url !== undefined ? virtual_tour_url : existingProperty.virtual_tour_url,
        developer_legacy !== undefined ? developer_legacy : existingProperty.developer_legacy,
        availability_status || existingProperty.availability_status,
        targetApprovalStatus,
        total_units !== undefined ? total_units : existingProperty.total_units,
        available_units !== undefined ? available_units : existingProperty.available_units,
        id
      ]
    );

    // Replace configurations if provided
    if (req.body.configurations) {
      const configurations = JSON.parse(req.body.configurations);
      if (Array.isArray(configurations)) {
        await dbConnection.query('DELETE FROM property_configurations WHERE property_id = ?', [id]);
        for (let config of configurations) {
          await dbConnection.query(
            'INSERT INTO property_configurations (property_id, bhk_type, carpet_area, price, estimated_emi, floor_plan_url) VALUES (?, ?, ?, ?, ?, ?)',
            [id, config.bhk_type, config.carpet_area, config.price, config.estimated_emi || null, config.floor_plan_url || config.floor_plan || null]
          );
        }
      }
    }

    // Replace amenities if provided
    if (req.body.amenities) {
      const amenities = JSON.parse(req.body.amenities);
      if (Array.isArray(amenities)) {
        await dbConnection.query('DELETE FROM property_amenities WHERE property_id = ?', [id]);
        for (let amenity of amenities) {
          await dbConnection.query(
            'INSERT INTO property_amenities (property_id, amenity_name) VALUES (?, ?)',
            [id, amenity]
          );
        }
      }
    }

    // Replace specifications if provided
    if (req.body.specifications) {
      const specifications = JSON.parse(req.body.specifications);
      if (Array.isArray(specifications)) {
        await dbConnection.query('DELETE FROM property_specifications WHERE property_id = ?', [id]);
        for (let spec of specifications) {
          await dbConnection.query(
            'INSERT INTO property_specifications (property_id, title, details) VALUES (?, ?, ?)',
            [id, spec.title, spec.details]
          );
        }
      }
    }

    // Replace phases if provided
    if (req.body.phases) {
      const phases = JSON.parse(req.body.phases);
      if (Array.isArray(phases)) {
        await dbConnection.query('DELETE FROM property_phases WHERE property_id = ?', [id]);
        for (let phase of phases) {
          if (phase.phase_name && phase.rera_id) {
            await dbConnection.query(
              'INSERT INTO property_phases (property_id, phase_name, rera_id) VALUES (?, ?, ?)',
              [id, phase.phase_name, phase.rera_id]
            );
          }
        }
      }
    }

    // Replace videos if provided
    if (req.body.videos) {
      const videos = JSON.parse(req.body.videos);
      if (Array.isArray(videos)) {
        await dbConnection.query('DELETE FROM property_videos WHERE property_id = ?', [id]);
        for (let vid of videos) {
          if (vid.video_url) {
            await dbConnection.query(
              'INSERT INTO property_videos (property_id, video_url, thumbnail_url, title) VALUES (?, ?, ?, ?)',
              [id, vid.video_url, vid.thumbnail_url || null, vid.title || null]
            );
          }
        }
      }
    }

    // Handle Uploaded Files (Legacy multer support)
    const mediaTypes = ['image', 'floor_plan', 'document', 'brochure', 'thumbnail', 'top_banner'];
    for (let mType of mediaTypes) {
      const fieldname = mType + 's';
      if (req.files && req.files[fieldname]) {
        for (let file of req.files[fieldname]) {
          const relativeUrl = 'uploads/' + file.filename;
          await dbConnection.query(
            'INSERT INTO property_media (property_id, media_type, file_url, file_name) VALUES (?, ?, ?, ?)',
            [id, mType, relativeUrl, file.originalname]
          );
        }
      }
    }

    // Handle Media Library Items from Payload
    const libraryFields = {
      media_library_images: 'image',
      media_library_thumbnails: 'thumbnail',
      media_library_top_banners: 'top_banner',
      media_library_floor_plans: 'floor_plan',
      media_library_brochures: 'brochure'
    };
    for (const [field, mType] of Object.entries(libraryFields)) {
      if (req.body[field]) {
        try {
          const items = JSON.parse(req.body[field]);
          if (Array.isArray(items)) {
            for (let item of items) {
              await dbConnection.query(
                'INSERT INTO property_media (property_id, media_type, file_url, file_name) VALUES (?, ?, ?, ?)',
                [id, mType, item.file_url, item.file_name]
              );
            }
          }
        } catch (e) {
          console.error(`Error parsing ${field}`, e);
        }
      }
    }

    await dbConnection.commit();
    return res.json({ 
      message: targetApprovalStatus === 'pending_approval'
        ? 'Property updated and submitted for Super Admin review & approval.' 
        : 'Property updated successfully.',
      propertyId: id,
      approval_status: targetApprovalStatus
    });

  } catch (err) {
    await dbConnection.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Server error updating property details. Details: ' + err.message });
  } finally {
    dbConnection.release();
  }
});

// POST /api/properties/:id/approve (Super Admin Approve/Reject reviews)
router.post('/:id/approve', authenticate, requireRole(['super_admin']), async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  if (action !== 'approve' && action !== 'reject') { // check strings
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
// DELETE /api/properties/:id (Soft-delete property)
router.delete('/:id', authenticate, requireRole(['super_admin', 'assistant_admin', 'branch_admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT branch_id FROM properties WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    const property = rows[0];

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    if (req.user.role === 'branch_admin') {
      if (!enforceBranchIsolation(req, res, property.branch_id)) return;
    }

    await pool.query('UPDATE properties SET is_deleted = 1 WHERE id = ?', [id]);
    return res.json({ message: 'Property listing deleted successfully.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error deleting property.' });
  }
});

module.exports = router;
