const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Starting migration...');

    // 1. Media Library Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media_library (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('media_library created');

    // 2. Property Phases
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_phases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT NOT NULL,
        phase_name VARCHAR(255) NOT NULL,
        rera_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('property_phases created');

    // 3. Property Videos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT NOT NULL,
        video_url TEXT NOT NULL,
        thumbnail_url VARCHAR(500) NULL,
        title VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('property_videos created');

    // 4. Global Amenities Table (for global icons)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_amenities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        amenity_name VARCHAR(100) UNIQUE NOT NULL,
        icon_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('global_amenities created');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
