// app.js - Main Express application
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3000;

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME ,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    queueLimit: 0
});

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'inventory-management-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } 
}));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Function to get dashboard data
async function getDashboardData(pool) {
  try {
    // Get total materials count
    const [materialCountResult] = await pool.query('SELECT COUNT(*) as count FROM materials');
    const totalMaterials = materialCountResult[0].count;
    
    // Get unique suppliers count
    const [supplierCountResult] = await pool.query('SELECT COUNT(DISTINCT supplier) as count FROM materials');
    const totalSuppliers = supplierCountResult[0].count;
    
    // Get recent updates (last 5 updated materials)
    const [recentMaterials] = await pool.query(
      'SELECT * FROM materials ORDER BY id DESC LIMIT 5'
    );
    

    // Get material types distribution
    const [materialTypes] = await pool.query(
      'SELECT part_name, COUNT(*) as count FROM materials GROUP BY part_name'
    );
    
    // Format data for charts
    const materialTypeLabels = materialTypes.map(type => type.part_name);
    const materialTypeData = materialTypes.map(type => type.count);
    
    // Mock data for inventory changes
    const inventoryChanges = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      data: [42, 49, 55, 60, 66]
    };
    
    return {
      totalMaterials,
      totalSuppliers,
      recentMaterials,
      materialTypeLabels,
      materialTypeData,
      inventoryChanges
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
}

// Routes
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // In a real application, you should hash passwords and compare hash
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (rows.length > 0 && password === rows[0].password) { // Simplified for demo
      req.session.user = {
        id: rows[0].id,
        username: rows[0].username,
        fullName: rows[0].full_name,
        role: rows[0].role
      };
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'An error occurred during login' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Dashboard route
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const dashboardData = await getDashboardData(pool);
    
    res.render('dashboard', { 
      user: req.session.user,
      ...dashboardData
      
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('error', { error: 'Failed to load dashboard data' });
  }
});

// Inventory routes
app.get('/', isAuthenticated, (req, res) => {
  res.redirect('/dashboard');
});

app.get('/materials', isAuthenticated, async (req, res) => {
  try {
    const [materials] = await pool.query('SELECT * FROM materials ORDER BY id DESC');
    res.render('materials', { 
      user: req.session.user, 
      materials: materials,
      count: materials.length
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).render('error', { error: 'Failed to fetch materials' });
  }
});

// API routes for AJAX calls
app.get('/api/materials', isAuthenticated, async (req, res) => {
  try {
    const [materials] = await pool.query('SELECT * FROM materials ORDER BY id DESC');
    res.json({ success: true, data: materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch materials' });
  }
});

app.post('/api/materials', isAuthenticated, async (req, res) => {
  try {
    const { packetNo, partName, length, width, height, quantity, supplier } = req.body;
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    const [result] = await pool.query(
      `INSERT INTO materials 
       (packet_no, part_name, length, width, height, quantity, supplier, updated_by, last_updated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [packetNo, partName, length, width, height, quantity, supplier, req.session.user.username, currentDate]
    );
    
    res.json({ 
      success: true, 
      message: 'Material added successfully', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error adding material:', error);
    res.status(500).json({ success: false, error: 'Failed to add material' });
  }
});

app.put('/api/materials/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { packetNo, partName, length, width, height, quantity, supplier } = req.body;
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    await pool.query(
      `UPDATE materials 
       SET packet_no = ?, part_name = ?, length = ?, width = ?, height = ?, 
           quantity = ?, supplier = ?, updated_by = ?, last_updated = ? 
       WHERE id = ?`,
      [packetNo, partName, length, width, height, quantity, supplier, 
       req.session.user.username, currentDate, id]
    );
    
    res.json({ success: true, message: 'Material updated successfully' });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ success: false, error: 'Failed to update material' });
  }
});

app.delete('/api/materials/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM materials WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ success: false, error: 'Failed to delete material' });
  }
});

app.delete('/api/materials', isAuthenticated, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid material IDs' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM materials WHERE id IN (${placeholders})`, ids);
    
    res.json({ success: true, message: 'Materials deleted successfully' });
  } catch (error) {
    console.error('Error deleting materials:', error);
    res.status(500).json({ success: false, error: 'Failed to delete materials' });
  }
});

// Error page route
app.get('/error', (req, res) => {
  res.render('error', { error: 'An unexpected error occurred' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { error: 'Page not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;