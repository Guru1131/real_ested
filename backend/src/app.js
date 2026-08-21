const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const userRoutes = require('./routes/users');
const propertyRoutes = require('./routes/properties');
const leadRoutes = require('./routes/leads');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files Static Route
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes registration
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/leads', leadRoutes);

// Base Health Check
app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'Property Sales & Rental Management API Node-Express' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

module.exports = app;
