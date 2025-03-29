// app.js - Main Express application
const cors = require('cors');
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3000;

// ===== DATABASE SETUP =====
// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    queueLimit: 0
});

// Make pool available to route handlers
app.locals.pool = pool;

// ===== MIDDLEWARE SETUP =====
// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    
    // Allow all origins in development
    if(process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, you would be more restrictive
    callback(null, true);
  },
  credentials: true
}));

// Body parsing middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'inventory-management-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    // Don't set a specific domain for cookies
    // This allows the cookies to work with IP addresses
  }
}));

// ===== AUTHENTICATION MIDDLEWARE =====
// API Authentication middleware
const isAuthenticatedAPI = (req, res, next) => {
  if (req.session.user) {
    // Make user info available in req.user
    req.user = req.session.user;
    next();
  } else {
    res.status(401).json({ success: false, error: 'Not authenticated' });
  }
};

// Admin role check middleware
const isAdminAPI = (req, res, next) => {
  if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'quản lý')) {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
};

// Admin-only routes middleware
const isStrictAdminAPI = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
};

// ===== HELPER FUNCTIONS =====
// Safely parse JSON
function safelyParseJSON(json) {
  try {
    // If it's already an object, return it
    if (typeof json === 'object' && json !== null) {
      return json;
    }
    
    // If it's a string, parse it
    if (typeof json === 'string') {
      return JSON.parse(json);
    }
    
    // Otherwise, return an empty object
    return {};
  } catch (error) {
    console.error("JSON parse error:", error);
    return {};
  }
}

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
    
    // Get system users count
    const [usersCountResult] = await pool.query('SELECT COUNT(*) as count FROM users');
    const systemUsers = usersCountResult[0].count;
    
    return {
      totalMaterials,
      totalSuppliers,
      recentMaterials,
      materialTypeLabels,
      materialTypeData,
      inventoryChanges,
      systemUsers,
      ordersThisWeek: 12 // This is still mock data, replace with actual query
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
}

// ===== TEST PAGE =====
// Add a direct login test page for debugging
app.get('/login-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login Test</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
      <h2>Login Test</h2>
      <div id="status"></div>
      <form id="loginForm">
        <div>
          <label>Username:</label>
          <input type="text" id="username" name="username" value="nguyenhieu">
        </div>
        <div style="margin-top: 10px;">
          <label>Password:</label>
          <input type="password" id="password" name="password" value="password123">
        </div>
        <div style="margin-top: 15px;">
          <button type="submit">Login</button>
        </div>
      </form>

      <div style="margin-top: 20px;">
        <button id="checkStatus">Check Status</button>
      </div>

      <script>
        // Check initial status
        fetch('/api/auth/status', {
          credentials: 'include'
        })
        .then(res => res.json())
        .then(data => {
          document.getElementById('status').innerHTML = 
            'Current status: ' + (data.authenticated ? 'Logged in as ' + data.user.username : 'Not logged in');
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', function(e) {
          e.preventDefault();
          
          fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              username: document.getElementById('username').value,
              password: document.getElementById('password').value
            })
          })
          .then(res => res.json())
          .then(data => {
            alert(JSON.stringify(data));
            
            if(data.success) {
              document.getElementById('status').innerHTML = 
                'Current status: Logged in as ' + data.user.username;
            }
          })
          .catch(err => {
            alert('Error: ' + err.message);
          });
        });

        // Check status button
        document.getElementById('checkStatus').addEventListener('click', function() {
          fetch('/api/auth/status', {
            credentials: 'include'
          })
          .then(res => res.json())
          .then(data => {
            alert(JSON.stringify(data));
            document.getElementById('status').innerHTML = 
              'Current status: ' + (data.authenticated ? 'Logged in as ' + data.user.username : 'Not logged in');
          });
        });
      </script>
    </body>
    </html>
  `);
});

// ===== API ROUTES =====
// Authentication API
app.post('/api/auth/login', async (req, res) => {
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
      res.json({ 
        success: true, 
        user: req.session.user 
      });
    } else {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An error occurred during login' 
    });
  }
});

app.get('/api/auth/status', (req, res) => {
  if (req.session.user) {
    res.json({ 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ 
      authenticated: false, 
      user: null 
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Dashboard API
app.get('/api/dashboard', isAuthenticatedAPI, async (req, res) => {
  try {
    const dashboardData = await getDashboardData(pool);
    res.json({
      success: true,
      ...dashboardData
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load dashboard data' 
    });
  }
});

// ===== USER MANAGEMENT API =====
// Get all users (admin only)
app.get('/api/users', isAuthenticatedAPI, isAdminAPI, async (req, res) => {
  try {
    // Don't return password in the response
    const [users] = await pool.query('SELECT id, username, full_name, role, phone FROM users ORDER BY id');
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Get a specific user
app.get('/api/users/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Safer checks for user role
    const currentUserRole = req.session.user && req.session.user.role ? 
                           String(req.session.user.role).toLowerCase() : '';
    
    // Check if user is admin or manager
    const isAdmin = currentUserRole === 'admin';
    const isManager = ['quản lý', 'quan ly', 'manager'].includes(currentUserRole);
    
    // Permission check with better error handling
    if (!isAdmin && !isManager && req.session.user.id !== parseInt(id)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }
    
    const [users] = await pool.query(
      'SELECT id, username, full_name, role, phone, created_at FROM users WHERE id = ?', 
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: users[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user', 
      details: error.message 
    });
  }
});

// Create a new user (admin only)
app.post('/api/users', isAuthenticatedAPI, isAdminAPI, async (req, res) => {
  try {
    const { username, password, fullName, role, phone } = req.body;
    
    // Validate required fields
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Check if username already exists
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    
    // In a real app, you would hash the password here
    // For simplicity, we're storing plain text passwords (not recommended for production!)
    const [result] = await pool.query(
      'INSERT INTO users (username, password, full_name, role, phone) VALUES (?, ?, ?, ?, ?)',
      [username, password, fullName, role, phone || null]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully', 
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Update a user
app.put('/api/users/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, fullName, role, phone } = req.body;
    
    // First, check if user exists and get their role
    const [existingUsers] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
    
    if (existingUsers.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const existingUser = existingUsers[0];
    
    // Determine current user's permission level
    const isAdmin = req.session.user.role === 'admin';
    const isManager = ['quản lý', 'quan ly', 'manager'].includes(req.session.user.role.toLowerCase());
    const isSelfUpdate = req.session.user.id === parseInt(id);
    
    // Determine target user's type
    const targetIsAdmin = existingUser.role === 'admin';
    const targetIsManager = ['quản lý', 'quan ly', 'manager'].includes(existingUser.role.toLowerCase());
    
    // Permission checks
    // 1. Regular users can only update themselves
    if (!isAdmin && !isManager && !isSelfUpdate) {
      return res.status(403).json({ success: false, error: 'You can only update your own information' });
    }
    
    // 2. Managers can't modify admins or other managers
    if (isManager && !isAdmin && (targetIsAdmin || targetIsManager)) {
      return res.status(403).json({ success: false, error: 'Managers cannot modify admins or other managers' });
    }
    
    // 3. Only admins can assign admin role
    if (role === 'admin' && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Only admins can assign admin role' });
    }
    
    // 4. Regular users can't change their role
    if (!isAdmin && !isManager && isSelfUpdate && role && role !== req.session.user.role) {
      return res.status(403).json({ success: false, error: 'Regular users cannot change their role' });
    }
    
    // Check if username exists (if changing username)
    if (username) {
      const [existingUsername] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
      if (existingUsername.length > 0) {
        return res.status(400).json({ success: false, error: 'Username already exists' });
      }
    }
    
    // Build the SQL update statement dynamically based on what's provided
    let updateFields = [];
    let queryParams = [];
    
    if (username) {
      updateFields.push('username = ?');
      queryParams.push(username);
    }
    
    if (password) {
      // In a real app, you would hash the password here
      updateFields.push('password = ?');
      queryParams.push(password);
    }
    
    if (fullName) {
      updateFields.push('full_name = ?');
      queryParams.push(fullName);
    }
    
    // Only admins and managers can update roles (with appropriate restrictions)
    if (role && (isAdmin || isManager)) {
      updateFields.push('role = ?');
      queryParams.push(role);
    }
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      queryParams.push(phone);
    }
    
    // Add the ID at the end of params array
    queryParams.push(id);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log("Executing query:", query);
    console.log("With params:", queryParams);
    
    await pool.query(query, queryParams);
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user', details: error.message });
  }
});

// Delete a user (admin only)
app.delete('/api/users/:id', isAuthenticatedAPI, isAdminAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting the current user
    if (req.session.user.id === parseInt(id)) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }
    
    // Check if user exists
    const [existingUser] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Additional permission checks for managers
    if (req.session.user.role === 'quản lý') {
      // Managers can't delete admins or other managers
      if (existingUser[0].role === 'admin' || existingUser[0].role === 'quản lý') {
        return res.status(403).json({ 
          success: false, 
          error: 'Insufficient permissions to delete managers or admins' 
        });
      }
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// ===== MATERIALS API =====
// Get all materials
app.get('/api/materials', isAuthenticatedAPI, async (req, res) => {
  try {
    const [materials] = await pool.query('SELECT * FROM materials ORDER BY id DESC');
    res.json({ success: true, data: materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch materials' });
  }
});

// Create new material
// Create new material with packet_no validation
app.post('/api/materials', isAuthenticatedAPI, async (req, res) => {
    try {
      const { packetNo, partName, length, width, height, quantity, supplier } = req.body;
      const currentDate = new Date().toLocaleDateString('en-GB');
      
      // Validate that packet_no is provided and not null
      if (packetNo === null || packetNo === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Packet number (packet_no) is required and cannot be null' 
        });
      }
      
      // Check if a material with the same packet_no already exists
      const [existingMaterials] = await pool.query(
        'SELECT id FROM materials WHERE packet_no = ?',
        [packetNo]
      );
      
      if (existingMaterials.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'A material with this packet number already exists. Packet numbers must be unique.' 
        });
      }
      
      // Insert material with validated packet_no
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
      res.status(500).json({ success: false, error: 'Failed to add material: ' + error.message });
    }
  });

// Update material
app.put('/api/materials/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const { packetNo, partName, length, width, height, quantity, supplier } = req.body;
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    // Check if material exists
    const [existingMaterial] = await pool.query(
      'SELECT id FROM materials WHERE id = ?',
      [id]
    );
    
    if (existingMaterial.length === 0) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }
    
    // Check for duplicate packet number
    if (packetNo) {
      const [duplicatePacketNo] = await pool.query(
        'SELECT id FROM materials WHERE packet_no = ? AND id != ?',
        [packetNo, id]
      );
      
      if (duplicatePacketNo.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Another material with this packet number already exists' 
        });
      }
    }
    
    // Build the SQL update statement dynamically
    let updateFields = [];
    let queryParams = [];
    
    if (packetNo) {
      updateFields.push('packet_no = ?');
      queryParams.push(packetNo);
    }
    
    if (partName) {
      updateFields.push('part_name = ?');
      queryParams.push(partName);
    }
    
    if (length !== undefined) {
      updateFields.push('length = ?');
      queryParams.push(length);
    }
    
    if (width !== undefined) {
      updateFields.push('width = ?');
      queryParams.push(width);
    }
    
    if (height !== undefined) {
      updateFields.push('height = ?');
      queryParams.push(height);
    }
    
    if (quantity !== undefined) {
      updateFields.push('quantity = ?');
      queryParams.push(quantity);
    }
    
    if (supplier) {
      updateFields.push('supplier = ?');
      queryParams.push(supplier);
    }
    
    // Always update these fields
    updateFields.push('updated_by = ?');
    queryParams.push(req.session.user.username);
    
    updateFields.push('last_updated = ?');
    queryParams.push(currentDate);
    
    // Add the ID at the end
    queryParams.push(id);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    
    const query = `UPDATE materials SET ${updateFields.join(', ')} WHERE id = ?`;
    await pool.query(query, queryParams);
    
    res.json({ success: true, message: 'Material updated successfully' });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ success: false, error: 'Failed to update material' });
  }
});

// Delete a material
app.delete('/api/materials/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM materials WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ success: false, error: 'Failed to delete material' });
  }
});

// Delete multiple materials
app.delete('/api/materials', isAuthenticatedAPI, async (req, res) => {
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

// Get a single material by ID
app.get('/api/materials/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query('SELECT * FROM materials WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch material' });
  }
});

// ===== MATERIAL REQUESTS API =====
// Get material requests for current user
app.get('/api/material-requests', isAuthenticatedAPI, async (req, res) => {
  try {
    // Get request filter from query params
    const status = req.query.status || 'pending';
    const isAdminOrManager = req.session.user.role === 'admin' || req.session.user.role === 'quản lý';

    // Admins see all requests, regular users only see their own
    const whereClause = isAdminOrManager
      ? 'WHERE mr.status = ?' 
      : 'WHERE mr.status = ? AND mr.user_id = ?';
    
    const queryParams = isAdminOrManager
      ? [status]
      : [status, req.session.user.id];
    
    // Query with joins to get user info
    const [requests] = await pool.query(
      `SELECT mr.*, u.username as user_username, u.full_name as user_full_name
       FROM material_requests mr
       JOIN users u ON mr.user_id = u.id
       ${whereClause}
       ORDER BY mr.request_date DESC`,
      queryParams
    );
    
    // Pre-process the request data to ensure it's properly formatted
    const processedRequests = requests.map(request => {
      // Make a copy to avoid modifying the original
      const processedRequest = {...request};
      
      // Process the request_data field
      if (processedRequest.request_data) {
        try {
          // Parse JSON string if needed
          processedRequest.request_data = safelyParseJSON(processedRequest.request_data);
        } catch (error) {
          console.error(`Error processing request data for ID ${request.id}:`, error);
          processedRequest.request_data = {};
        }
      }
      
      return processedRequest;
    });
    
    res.json({ success: true, data: processedRequests });
  } catch (error) {
    console.error('Error fetching material requests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch material requests' });
  }
});

// Create a new material request
app.post('/api/material-requests', isAuthenticatedAPI, async (req, res) => {
  try {
    console.log('Received material request payload:', JSON.stringify(req.body));
    
    const { requestType, materialId, requestData } = req.body;
    
    // Validate request type
    if (!['add', 'edit', 'delete'].includes(requestType)) {
      return res.status(400).json({ success: false, error: 'Invalid request type' });
    }
    
    // For edit and delete, materialId is required
    if ((requestType === 'edit' || requestType === 'delete') && !materialId) {
      return res.status(400).json({ success: false, error: 'Material ID is required for edit/delete requests' });
    }
    
    // Insert request into database
    const [result] = await pool.query(
      `INSERT INTO material_requests 
       (request_type, material_id, request_data, user_id) 
       VALUES (?, ?, ?, ?)`,
      [
        requestType, 
        materialId || null, 
        JSON.stringify(requestData || {}), 
        req.session.user.id
      ]
    );
    
    console.log(`Created material request with ID ${result.insertId}`);
    
    // Create notification for all admins
    const [admins] = await pool.query('SELECT id FROM users WHERE role = "admin"');
    
    for (const admin of admins) {
      await pool.query(
        `INSERT INTO admin_notifications (user_id, message)
         VALUES (?, ?)`,
        [admin.id, `New ${requestType} material request from ${req.session.user.username}`]
      );
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Material request submitted successfully', 
      requestId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating material request:', error);
    res.status(500).json({ success: false, error: `Failed to create material request: ${error.message}` });
  }
});

// Process a material request (admin only)
app.put('/api/material-requests/:id', isAuthenticatedAPI, isAdminAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    console.log(`Processing material request ${id} with status ${status}`);
     
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Get the request details with requester username
    const [requests] = await pool.query(
      `SELECT mr.*, u.username as requester_username 
       FROM material_requests mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.id = ?`, 
      [id]
    );
    
    if (requests.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    
    const request = requests[0];
    
    // Check if request is already processed
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Request already processed' });
    }

    let requestData = {};
    try {
      requestData = safelyParseJSON(request.request_data);
    } catch (error) {
      console.error('Error parsing request data:', error);
      return res.status(400).json({ success: false, error: 'Invalid request data format' });
    }
    
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update request status
      await connection.query(
        `UPDATE material_requests 
         SET status = ?, response_date = NOW(), admin_id = ?, admin_notes = ? 
         WHERE id = ?`,
        [status, req.session.user.id, adminNotes || null, id]
      );
      
      console.log(`Updated material request ${id} status to ${status}`);
      
      // If approved, process the request
      if (status === 'approved') {
        let requestData = {};
        try {
          requestData = safelyParseJSON(request.request_data);
        } catch (error) {
          console.error('Error parsing request data:', error);
          return res.status(400).json({ success: false, error: 'Invalid request data format' });
        }
        
        if (request.request_type === 'add') {
          // Add new material
          const { packetNo, partName, length, width, height, quantity, supplier } = requestData;
          const currentDate = new Date().toLocaleDateString('en-GB');

          // Check if a material with the same packet_no already exists
          const [existingMaterials] = await connection.query(
            'SELECT id FROM materials WHERE packet_no = ?',
            [packetNo]
          );
          
          if (existingMaterials.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
              success: false, 
              error: 'A material with this packet number already exists. The request cannot be approved.' 
            });
          }
          
          // Use the requester's username for updated_by
          const [addResult] = await connection.query(
            `INSERT INTO materials 
             (packet_no, part_name, length, width, height, quantity, supplier, updated_by, last_updated) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [packetNo, partName, length, width, height, quantity, supplier, request.requester_username, currentDate]
          );
          
          console.log(`Added new material with ID ${addResult.insertId}`);
        } else if (request.request_type === 'edit') {
          // Edit existing material
          const { packetNo, partName, length, width, height, quantity, supplier } = requestData;
          const currentDate = new Date().toLocaleDateString('en-GB');

          // Check if any other material has the same packet_no (excluding the current material)
          const [existingMaterials] = await connection.query(
            'SELECT id FROM materials WHERE packet_no = ? AND id != ?',
            [packetNo, request.material_id]
          );
          
          if (existingMaterials.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
              success: false, 
              error: 'Another material with this packet number already exists. The request cannot be approved.' 
            });
          }
          
          // Use the requester's username for updated_by
          await connection.query(
            `UPDATE materials 
             SET packet_no = ?, part_name = ?, length = ?, width = ?, height = ?, 
                 quantity = ?, supplier = ?, updated_by = ?, last_updated = ? 
             WHERE id = ?`,
            [packetNo, partName, length, width, height, quantity, supplier, 
             request.requester_username, currentDate, request.material_id]
          );
          
          console.log(`Updated material ${request.material_id}`);
        } else if (request.request_type === 'delete') {
          // Delete material
          await connection.query('DELETE FROM materials WHERE id = ?', [request.material_id]);
          console.log(`Deleted material ${request.material_id}`);
        }
      }
      
      // Commit the transaction
      await connection.commit();
      
      // Create notification for the requester
      await pool.query(
        `INSERT INTO admin_notifications (user_id, message)
         VALUES (?, ?)`,
        [request.user_id, `Your ${request.request_type} material request has been ${status}`]
      );
      
      res.json({ 
        success: true, 
        message: `Request ${status} successfully`,
        requestId: id
      });
    } catch (error) {
      // If error, rollback changes
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error processing material request:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to process material request: ${error.message}` 
    });
  }
});

// ===== NOTIFICATIONS API =====
// This is to fix the 404 error in the frontend
app.get('/api/notifications', isAuthenticatedAPI, async (req, res) => {
  try {
    // Query for notifications
    const [notifications] = await pool.query(
      `SELECT * FROM admin_notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.session.user.id]
    );
    
    res.json(notifications || []);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read
app.post('/api/notifications/mark-as-read', isAuthenticatedAPI, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid notification IDs' });
    }
    
    await pool.query(
      `UPDATE admin_notifications 
       SET is_read = true 
       WHERE id IN (?) AND user_id = ?`,
      [ids, req.session.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});


// Add these routes to app.js after the existing API routes

// ===== PRODUCTION (SAN XUAT) API =====

// Create machine_stop_logs table if it doesn't exist
pool.query(`
    CREATE TABLE IF NOT EXISTS machine_stop_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      machine_id INT NOT NULL,
      reason TEXT NOT NULL,
      stop_time VARCHAR(50),
      stop_date VARCHAR(50),
      user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `).catch(err => {
    console.error('Error creating machine_stop_logs table:', err);
  });
  
  // Modify molds table to add material_id column if needed
  pool.query(`
    ALTER TABLE molds
    ADD COLUMN IF NOT EXISTS material_id INT,
    ADD CONSTRAINT IF NOT EXISTS fk_molds_material
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
  `).catch(err => {
    console.error('Error modifying molds table:', err);
  });
  
  // Get all machines
  app.get('/api/machines', isAuthenticatedAPI, async (req, res) => {
    try {
      const [machines] = await pool.query(`
        SELECT m.*, 
          (SELECT ma_khuon FROM molds WHERE machine_id = m.id LIMIT 1) as mold_code,
          (SELECT so_luong FROM molds WHERE machine_id = m.id LIMIT 1) as mold_quantity
        FROM machines m 
        ORDER BY m.id
      `);
      
      res.json({ success: true, data: machines });
    } catch (error) {
      console.error('Error fetching machines:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch machines' });
    }
  });
  
  // Get a specific machine
  app.get('/api/machines/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      const [machines] = await pool.query(`
        SELECT m.*, 
          (SELECT ma_khuon FROM molds WHERE machine_id = m.id LIMIT 1) as mold_code,
          (SELECT so_luong FROM molds WHERE machine_id = m.id LIMIT 1) as mold_quantity
        FROM machines m 
        WHERE m.id = ?
      `, [id]);
      
      if (machines.length === 0) {
        return res.status(404).json({ success: false, error: 'Machine not found' });
      }
      
      res.json({ success: true, data: machines[0] });
    } catch (error) {
      console.error('Error fetching machine:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch machine' });
    }
  });
  
  // Create a new machine
  app.post('/api/machines', isAuthenticatedAPI, async (req, res) => {
    try {
      const { tenMayDap, status } = req.body;
      
      // Validate required fields
      if (!tenMayDap) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      
      // Check if machine with this name already exists
      const [existingMachines] = await pool.query(
        'SELECT id FROM machines WHERE ten_may_dap = ?',
        [tenMayDap]
      );
      
      if (existingMachines.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'A machine with this name already exists. Machine names must be unique.' 
        });
      }
      
      const [result] = await pool.query(
        'INSERT INTO machines (ten_may_dap, status) VALUES (?, ?)',
        [tenMayDap, status || 'stopped']
      );
      
      res.status(201).json({ 
        success: true, 
        message: 'Machine created successfully', 
        machineId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating machine:', error);
      res.status(500).json({ success: false, error: 'Failed to create machine' });
    }
  });
  
  // Update machine status with improved error handling and transaction support
  app.put('/api/machines/:id/status', isAuthenticatedAPI, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { status, reason, stopTime, stopDate } = req.body;
      
      // Validate required fields
      if (!status || !['running', 'stopped'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status value' });
      }
      
      // If stopping a machine, require a reason
      if (status === 'stopped' && !reason) {
        return res.status(400).json({ success: false, error: 'Reason is required when stopping a machine' });
      }
      
      // Check if machine exists
      const [machines] = await connection.query('SELECT * FROM machines WHERE id = ?', [id]);
      if (machines.length === 0) {
        return res.status(404).json({ success: false, error: 'Machine not found' });
      }
      
      // Update the machine status
      await connection.query(
        'UPDATE machines SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );
      
      // If stopping with a reason, log the stop event
      if (status === 'stopped' && reason) {
        // Make sure the machine_stop_logs table exists
        await connection.query(`
          CREATE TABLE IF NOT EXISTS machine_stop_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            machine_id INT NOT NULL,
            reason TEXT NOT NULL,
            stop_time VARCHAR(50),
            stop_date VARCHAR(50),
            user_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
          )
        `);
        
        // Insert the stop log
        await connection.query(
          `INSERT INTO machine_stop_logs 
           (machine_id, reason, stop_time, stop_date, user_id) 
           VALUES (?, ?, ?, ?, ?)`,
          [id, reason, stopTime || null, stopDate || null, req.session.user.id]
        );
      }
      
      // Commit the transaction
      await connection.commit();
      
      res.json({ 
        success: true, 
        message: 'Machine status updated successfully'
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('Error updating machine status:', error);
      res.status(500).json({ success: false, error: 'Failed to update machine status: ' + error.message });
    } finally {
      connection.release();
    }
  });
  
  // Get all molds with machine info
  app.get('/api/molds', isAuthenticatedAPI, async (req, res) => {
    try {
      const [molds] = await pool.query(`
        SELECT m.*, mc.ten_may_dap as machine_name 
        FROM molds m
        LEFT JOIN machines mc ON m.machine_id = mc.id
        ORDER BY m.id
      `);
      res.json({ success: true, data: molds });
    } catch (error) {
      console.error('Error fetching molds:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch molds' });
    }
  });
  
  // Get a specific mold
  app.get('/api/molds/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      const [molds] = await pool.query(`
        SELECT m.*, mc.ten_may_dap as machine_name 
        FROM molds m
        LEFT JOIN machines mc ON m.machine_id = mc.id
        WHERE m.id = ?
      `, [id]);
      
      if (molds.length === 0) {
        return res.status(404).json({ success: false, error: 'Mold not found' });
      }
      
      res.json({ success: true, data: molds[0] });
    } catch (error) {
      console.error('Error fetching mold:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch mold' });
    }
  });
  
  // Create a new mold
  app.post('/api/molds', isAuthenticatedAPI, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { maKhuon, soLuong, machineId, materialId } = req.body;
      
      // Validate required fields
      if (!maKhuon || soLuong === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      
      // Check if mold code already exists
      const [existingMolds] = await connection.query(
        'SELECT id FROM molds WHERE ma_khuon = ?',
        [maKhuon]
      );
      
      if (existingMolds.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'A mold with this code already exists. Mold codes must be unique.' 
        });
      }
      
      // Insert the mold
      const [result] = await connection.query(
        'INSERT INTO molds (ma_khuon, so_luong, machine_id, material_id) VALUES (?, ?, ?, ?)',
        [maKhuon, soLuong, machineId || null, materialId || null]
      );
      
      await connection.commit();
      
      res.status(201).json({ 
        success: true, 
        message: 'Mold created successfully', 
        moldId: result.insertId 
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating mold:', error);
      res.status(500).json({ success: false, error: 'Failed to create mold: ' + error.message });
    } finally {
      connection.release();
    }
  });
  
  // Update a mold
  app.put('/api/molds/:id', isAuthenticatedAPI, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { maKhuon, soLuong, machineId, materialId } = req.body;
      
      // Validate required fields
      if (!maKhuon || soLuong === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      
      // Check if mold exists
      const [existingMold] = await connection.query(
        'SELECT id FROM molds WHERE id = ?',
        [id]
      );
      
      if (existingMold.length === 0) {
        return res.status(404).json({ success: false, error: 'Mold not found' });
      }
      
      // Check for duplicate mold code
      if (maKhuon) {
        const [duplicateMolds] = await connection.query(
          'SELECT id FROM molds WHERE ma_khuon = ? AND id != ?',
          [maKhuon, id]
        );
        
        if (duplicateMolds.length > 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'Another mold with this code already exists' 
          });
        }
      }
      
      // Update the mold
      await connection.query(
        'UPDATE molds SET ma_khuon = ?, so_luong = ?, machine_id = ?, material_id = ? WHERE id = ?',
        [maKhuon, soLuong, machineId || null, materialId || null, id]
      );
      
      await connection.commit();
      
      res.json({ 
        success: true, 
        message: 'Mold updated successfully' 
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error updating mold:', error);
      res.status(500).json({ success: false, error: 'Failed to update mold: ' + error.message });
    } finally {
      connection.release();
    }
  });
  
  // Delete a mold
  app.delete('/api/molds/:id', isAuthenticatedAPI, isAdminAPI, async (req, res) => {
    try {
      const { id } = req.params;
      
      await pool.query('DELETE FROM molds WHERE id = ?', [id]);
      
      res.json({ 
        success: true, 
        message: 'Mold deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting mold:', error);
      res.status(500).json({ success: false, error: 'Failed to delete mold: ' + error.message });
    }
  });

  
  // Get machine stop logs
  app.get('/api/machine-logs', isAuthenticatedAPI, async (req, res) => {
    try {
      const { machineId } = req.query;
      
      let query = `
        SELECT l.*, m.ten_may_dap, u.username
        FROM machine_stop_logs l
        JOIN machines m ON l.machine_id = m.id
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
      `;
      
      let params = [];
      
      if (machineId) {
        query = `
          SELECT l.*, m.ten_may_dap, u.username
          FROM machine_stop_logs l
          JOIN machines m ON l.machine_id = m.id
          LEFT JOIN users u ON l.user_id = u.id
          WHERE l.machine_id = ?
          ORDER BY l.created_at DESC
        `;
        params = [machineId];
      }
      
      const [logs] = await pool.query(query, params);
      
      res.json({ success: true, data: logs });
    } catch (error) {
      console.error('Error fetching machine logs:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch machine logs' });
    }
  });
  
  // Delete a machine
  app.delete('/api/machines/:id', isAuthenticatedAPI, isAdminAPI, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      
      // Check if machine exists
      const [existingMachine] = await connection.query(
        'SELECT id FROM machines WHERE id = ?', 
        [id]
      );
      
      if (existingMachine.length === 0) {
        return res.status(404).json({ success: false, error: 'Machine not found' });
      }
      
      // Remove machine from any molds
      await connection.query(
        'UPDATE molds SET machine_id = NULL WHERE machine_id = ?',
        [id]
      );
      
      // Delete the machine
      await connection.query('DELETE FROM machines WHERE id = ?', [id]);
      
      await connection.commit();
      
      res.json({ 
        success: true, 
        message: 'Machine deleted successfully' 
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting machine:', error);
      res.status(500).json({ success: false, error: 'Failed to delete machine: ' + error.message });
    } finally {
      connection.release();
    }
  });

  // Add this to your app.js file in the server

// ===== BATCH API ROUTES ===== FOR BATCH

// Create a batch with proper transaction handling
// Add these to your app.js file

// ===== BATCH API ROUTES =====

// Create a new batch (references existing materials, machines, and molds)
// Update this function in your app.js file
app.post('/api/batches', isAuthenticatedAPI, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { materialId, machineId, moldId, expectedOutput, notes } = req.body;
      
      // Basic validation
      if (!materialId || !machineId || !moldId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: materialId, machineId, and moldId are required' 
        });
      }
      
      // Verify that referenced entities exist with proper column names
      // Check if material exists with the correct column name (part_name)
      const [materials] = await connection.query(
        'SELECT id FROM materials WHERE id = ?', 
        [materialId]
      );
      
      // Check if machine exists with the correct column name (ten_may_dap)
      const [machines] = await connection.query(
        'SELECT id FROM machines WHERE id = ?', 
        [machineId]
      );
      
      // Check if mold exists with the correct column name (ma_khuon)
      const [molds] = await connection.query(
        'SELECT id FROM molds WHERE id = ?', 
        [moldId]
      );
      
      // Verify records were found
      if (materials.length === 0) {
        return res.status(404).json({ success: false, error: 'Material not found' });
      }
      
      if (machines.length === 0) {
        return res.status(404).json({ success: false, error: 'Machine not found' });
      }
      
      if (molds.length === 0) {
        return res.status(404).json({ success: false, error: 'Mold not found' });
      }
      
      // Create the batch record
      const [result] = await connection.query(
        `INSERT INTO batches 
         (material_id, machine_id, mold_id, created_by, expected_output, notes, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'planned', NOW())`,
        [materialId, machineId, moldId, req.session.user.id, expectedOutput || null, notes || null]
      );
      
      // Commit the transaction
      await connection.commit();
      
      res.status(201).json({
        success: true,
        message: 'Batch created successfully',
        data: { batchId: result.insertId }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating batch:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create batch: ' + error.message 
      });
    } finally {
      connection.release();
    }
  });
  
  // Get all batches with related data
  // Update this function in your app.js file
app.get('/api/batches', isAuthenticatedAPI, async (req, res) => {
    try {
      // Use explicit column naming with table aliases to avoid field name confusion
      const [batches] = await pool.query(`
        SELECT 
          b.*,
          m.part_name,
          m.length,
          m.width,
          m.height,
          m.quantity,
          m.supplier,
          mc.ten_may_dap,
          mc.status as machine_status,
          md.ma_khuon,
          md.so_luong,
          u.username as created_by_username
        FROM batches b
        LEFT JOIN materials m ON b.material_id = m.id
        LEFT JOIN machines mc ON b.machine_id = mc.id
        LEFT JOIN molds md ON b.mold_id = md.id
        LEFT JOIN users u ON b.created_by = u.id
        ORDER BY b.created_at DESC
      `);
      
      res.json({ 
        success: true, 
        data: batches 
      });
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch batches: ' + error.message 
      });
    }
  });
  
  // Get a specific batch with detailed information
  app.get('/api/batches/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [batches] = await pool.query(`
        SELECT b.*,
          m.part_name, m.length, m.width, m.height, m.quantity, m.supplier,
          mc.ten_may_dap, mc.status as machine_status,
          md.ma_khuon, md.so_luong,
          u.username as created_by_username, u.full_name as created_by_fullname
        FROM batches b
        LEFT JOIN materials m ON b.material_id = m.id
        LEFT JOIN machines mc ON b.machine_id = mc.id
        LEFT JOIN molds md ON b.mold_id = md.id
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.id = ?
      `, [id]);
      
      if (batches.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Batch not found' 
        });
      }
      
      res.json({ 
        success: true, 
        data: batches[0] 
      });
    } catch (error) {
      console.error('Error fetching batch:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch batch: ' + error.message 
      });
    }
  });
  
  // Update batch status
  app.put('/api/batches/:id/status', isAuthenticatedAPI, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { status, actualOutput } = req.body;
      
      // Validate the status
      if (!status || !['planned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status. Must be one of: planned, in_progress, completed, cancelled' 
        });
      }
      
      // Check if batch exists
      const [batches] = await connection.query('SELECT * FROM batches WHERE id = ?', [id]);
      if (batches.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Batch not found' 
        });
      }
      
      // Update fields based on status
      let updateFields = 'status = ?';
      let updateParams = [status];
      
      // If completing the batch, update actual output
      if (status === 'completed' && actualOutput !== undefined) {
        updateFields += ', actual_output = ?';
        updateParams.push(actualOutput);
      }
      
      // Add timestamp based on status change
      if (status === 'in_progress') {
        updateFields += ', start_date = NOW()';
      } else if (status === 'completed' || status === 'cancelled') {
        updateFields += ', end_date = NOW()';
      }
      
      // Add batch ID to params
      updateParams.push(id);
      
      // Update the batch
      await connection.query(
        `UPDATE batches SET ${updateFields} WHERE id = ?`,
        updateParams
      );
      
      // Commit the transaction
      await connection.commit();
      
      res.json({ 
        success: true, 
        message: 'Batch status updated successfully' 
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('Error updating batch status:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update batch status: ' + error.message 
      });
    } finally {
      connection.release();
    }
  });
  
  // Delete a batch
  app.delete('/api/batches/:id', isAuthenticatedAPI, isAdminAPI, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if batch exists
      const [batches] = await pool.query('SELECT * FROM batches WHERE id = ?', [id]);
      if (batches.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Batch not found' 
        });
      }
      
      // Delete the batch
      await pool.query('DELETE FROM batches WHERE id = ?', [id]);
      
      res.json({ 
        success: true, 
        message: 'Batch deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting batch:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete batch: ' + error.message 
      });
    }
  });

// Update machine status with proper handling of stop reasons
app.put('/api/machines/:id/status', isAuthenticatedAPI, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { status, reason, stopTime, stopDate } = req.body;
      
      console.log('Machine status update request:', { id, status, reason, stopTime, stopDate });
      
      // Validate required fields
      if (!status || !['running', 'stopped'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status value' });
      }
      
      // If stopping a machine, require a reason
      if (status === 'stopped' && !reason) {
        return res.status(400).json({ success: false, error: 'Reason is required when stopping a machine' });
      }
      
      // Check if machine exists
      const [machines] = await connection.query('SELECT * FROM machines WHERE id = ?', [id]);
      if (machines.length === 0) {
        return res.status(404).json({ success: false, error: 'Machine not found' });
      }
      
      // Update the machine status
      await connection.query(
        'UPDATE machines SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );
      
      // If stopping with a reason, log the stop event
      if (status === 'stopped' && reason) {
        // Make sure the machine_stop_logs table exists
        await connection.query(`
          CREATE TABLE IF NOT EXISTS machine_stop_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            machine_id INT NOT NULL,
            reason TEXT NOT NULL,
            stop_time VARCHAR(50),
            stop_date VARCHAR(50),
            user_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
          )
        `);
        
        // Insert the stop log
        await connection.query(
          `INSERT INTO machine_stop_logs 
           (machine_id, reason, stop_time, stop_date, user_id) 
           VALUES (?, ?, ?, ?, ?)`,
          [id, reason, stopTime || null, stopDate || null, req.session.user.id]
        );
      }
      
      // Commit the transaction
      await connection.commit();
      
      res.json({ 
        success: true, 
        message: 'Machine status updated successfully'
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('Error updating machine status:', error);
      res.status(500).json({ success: false, error: 'Failed to update machine status: ' + error.message });
    } finally {
      connection.release();
    }
  });

// ===== SERVE REACT APP FOR ALL OTHER ROUTES =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
