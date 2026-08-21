const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'property_mgmt_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verify connection
pool.getConnection()
  .then((conn) => {
    console.log('Database connection pool established successfully.');
    conn.release();
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

module.exports = pool;
