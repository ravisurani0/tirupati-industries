require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { pool } = require('./src/config/db');
const { runMigrations } = require('./src/db/migrate');
const { seedData } = require('./src/db/seed');

// Import routes
const authRoutes = require('./src/routes/auth');
const employeeRoutes = require('./src/routes/employees');
const attendanceRoutes = require('./src/routes/attendance');
const advanceRoutes = require('./src/routes/advances');
const payrollRoutes = require('./src/routes/payroll');
const dashboardRoutes = require('./src/routes/dashboard');
const exportRoutes = require('./src/routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static asset serving (React production build in dist/ or fallback to public/)
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
} else {
  app.use(express.static(publicPath));
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() AS current_time, current_database() AS db');
    res.json({
      status: 'ok',
      service: 'Tirupati Industries Workshop EMS',
      time: dbRes.rows[0].current_time,
      database: dbRes.rows[0].db,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/advances', advanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

// Front-end SPA routing (serves React App for all browser navigation routes)
app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.sendFile(path.join(publicPath, 'index.html'));
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

// Auto-migrate & seed on server start
async function startServer() {
  try {
    console.log('🔄 Checking database connection and initializing schema...');
    await runMigrations();
    await seedData();
    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('⚠️ Database migration/seed notice:', err.message);
  }

  // Only listen if not imported by Vercel serverless
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
      console.log(`\n=======================================================`);
      console.log(`🚀 TIRUPATI INDUSTRIES WORKSHOP MANAGEMENT SYSTEM`);
      console.log(`📡 Server running at: http://localhost:${PORT}`);
      console.log(`🔑 Default Admin: admin / admin123`);
      console.log(`=======================================================\n`);
    });
  }
}

startServer();

module.exports = app;
