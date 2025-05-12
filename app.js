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

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'inventory-management-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    // The key change - don't set a specific domain for cookies
    // This allows the cookies to work with IP addresses
  }
}));

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

// ===== API AUTHENTICATION MIDDLEWARE =====

// API Authentication middleware
const isAuthenticatedAPI = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Not authenticated' });
  }
};

// Admin role check middleware
const isAdminAPI = (req, res, next) => {
  if (req.session.user && (req.session.user.role === 'admin'|| req.session.user.role === 'quản lý')) {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
};

// Add a new middleware for admin-only routes
const isStrictAdminAPI = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
};

// ===== HELPER FUNCTIONS =====

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

// Add this function near the top of your app.js file
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


// ===== MATERIALS API =====

app.get('/api/materials', isAuthenticatedAPI, async (req, res) => {
  try {
    const [materials] = await pool.query('SELECT id,packet_no,part_name,material_code,length,width,material_type,quantity,supplier,updated_by,last_updated FROM materials ORDER BY id DESC');
    res.json({ success: true, data: materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch materials' });
  }
});

// Create new material with packet_no uniqueness validation
app.post('/api/materials', isAuthenticatedAPI, async (req, res) => {
  try {
    const { packetNo, partName, materialCode, length, width, materialType, quantity, supplier } = req.body;
    const currentDate = new Date().toLocaleDateString('en-GB');
    
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
    
    const [result] = await pool.query(
      `INSERT INTO materials 
       (packet_no, part_name, material_code, length, width, material_type, quantity, supplier, updated_by, last_updated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [packetNo, partName, materialCode, length, width, materialType, quantity, supplier, req.session.user.username, currentDate]
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

// Update a user (admin, manager, or self update)
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

// Create a new material request (simplified)
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

// Get a single material request by ID
app.get('/api/material-requests/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const isAdminOrManager = req.session.user.role === 'admin' || req.session.user.role === 'quản lý';
    
    // Build query to get the request with user information
    const query = `
      SELECT mr.*, u.username as requested_by_username, u.full_name as requested_by_fullname,
             a.username as admin_username, a.full_name as admin_fullname
      FROM material_requests mr
      LEFT JOIN users u ON mr.user_id = u.id
      LEFT JOIN users a ON mr.admin_id = a.id
      WHERE mr.id = ?
    `;
    
    // Add permission check - admins see all, users only see their own
    const permissionCheck = isAdminOrManager ? '' : ' AND mr.user_id = ?';
    
    const [requests] = await pool.query(
      query + permissionCheck,
      isAdminOrManager ? [id] : [id, userId]
    );
    
    if (requests.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    
    // Format the request data if it's a string
    const request = requests[0];
    if (typeof request.request_data === 'string') {
      try {
        request.request_data = JSON.parse(request.request_data);
      } catch (error) {
        console.error('Error parsing request data:', error);
        // Keep the original string if parsing fails
      }
    }
    
    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Error fetching material request:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch material request' });
  }
});

app.put('/api/material-requests/:id', isAuthenticatedAPI, isAdminAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    console.log(`Processing material request ${id} with status ${status}`);
     
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Get the request details
    const [requests] = await pool.query('SELECT * FROM material_requests WHERE id = ?', [id]);
    
    if (requests.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    
    const request = requests[0];
    
    // Check if request is already processed
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Request already processed' });
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
        // Parse and log request data
        let requestData = {};
        try {
          requestData = safelyParseJSON(request.request_data);
          console.log("Parsed request data:", JSON.stringify(requestData, null, 2)); // Detailed logging
        } catch (error) {
          console.error('Error parsing request data:', error);
          await connection.rollback();
          return res.status(400).json({ success: false, error: 'Invalid request data format' });
        }
        
        if (request.request_type === 'add') {
          // Add new material - Handle both camelCase and snake_case properties
          const packetNo = requestData.packetNo || requestData.packet_no;
          const partName = requestData.partName || requestData.part_name;
          const materialCode = requestData.materialCode || requestData.material_code;
          const length = requestData.length;
          const width = requestData.width;
          const materialType = requestData.materialType || requestData.material_type;
          const quantity = requestData.quantity;
          const supplier = requestData.supplier;
          const currentDate = new Date().toLocaleDateString('en-GB');

          // Validate all required fields
          if (!packetNo || !partName || !materialCode || !length || !width || !materialType || !quantity || !supplier) {
            console.error('Missing required fields in request data:', requestData);
            await connection.rollback();
            return res.status(400).json({ 
              success: false, 
              error: 'Missing required fields in request data' 
            });
          }

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
          
          try {
            // Get username for the requester
            const [userResult] = await connection.query('SELECT username FROM users WHERE id = ?', [request.user_id]);
            const username = userResult[0]?.username || 'system';
            
            const [addResult] = await connection.query(
              `INSERT INTO materials 
               (packet_no, part_name, material_code, length, width, material_type, quantity, supplier, updated_by, last_updated) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [packetNo, partName, materialCode, length, width, materialType, quantity, supplier, username, currentDate]
            );
            
            console.log(`Added new material with ID ${addResult.insertId}`);
          } catch (dbError) {
            console.error('Database error when adding material:', dbError);
            await connection.rollback();
            return res.status(500).json({ 
              success: false, 
              error: 'Database error when adding material' 
            });
          }
        } else if (request.request_type === 'edit') {
          // Edit existing material - Handle both camelCase and snake_case properties
          const packetNo = requestData.packetNo || requestData.packet_no;
          const partName = requestData.partName || requestData.part_name;
          const materialCode = requestData.materialCode || requestData.material_code;
          const length = requestData.length;
          const width = requestData.width;
          const materialType = requestData.materialType || requestData.material_type;
          const quantity = requestData.quantity;
          const supplier = requestData.supplier;
          const currentDate = new Date().toLocaleDateString('en-GB');

          // Validate all required fields
          if (!packetNo || !partName || !materialCode || !length || !width || !materialType || !quantity || !supplier) {
            console.error('Missing required fields in edit request data:', requestData);
            await connection.rollback();
            return res.status(400).json({ 
              success: false, 
              error: 'Missing required fields in edit request data' 
            });
          }

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
          
          try {
            // Get username for the requester
            const [userResult] = await connection.query('SELECT username FROM users WHERE id = ?', [request.user_id]);
            const username = userResult[0]?.username || 'system';
            
            await connection.query(
              `UPDATE materials 
               SET packet_no = ?, part_name = ?, material_code = ?, length = ?, width = ?, material_type = ?, 
                   quantity = ?, supplier = ?, updated_by = ?, last_updated = ? 
               WHERE id = ?`,
              [packetNo, partName, materialCode, length, width, materialType, quantity, supplier, username, currentDate, request.material_id]
            );
            
            console.log(`Updated material ${request.material_id}`);
          } catch (dbError) {
            console.error('Database error when updating material:', dbError);
            await connection.rollback();
            return res.status(500).json({ 
              success: false, 
              error: 'Database error when updating material' 
            });
          }
        } else if (request.request_type === 'delete') {
          // Delete material
          try {
            await connection.query('DELETE FROM materials WHERE id = ?', [request.material_id]);
            console.log(`Deleted material ${request.material_id}`);
          } catch (dbError) {
            console.error('Database error when deleting material:', dbError);
            await connection.rollback();
            return res.status(500).json({ 
              success: false, 
              error: 'Database error when deleting material' 
            });
          }
        }
      }
      
      // Commit the transaction
      await connection.commit();
      
      // Create notification for the requester
      // Tạo thông báo chi tiết hơn cho người yêu cầu dựa trên loại yêu cầu và trạng thái
      let notificationMessage = '';
      const requestTypeMap = {
        'add': 'thêm',
        'edit': 'sửa',
        'delete': 'xóa'
      };

      const requestTypeInVietnamese = requestTypeMap[request.request_type] || request.request_type;

      // Lấy thông tin về nguyên vật liệu nếu có
      let materialInfo = '';
      if (request.material_id) {
        try {
          const [materialResult] = await connection.query(
            'SELECT part_name FROM materials WHERE id = ?',
            [request.material_id]
          );
          
          if (materialResult.length > 0) {
            materialInfo = materialResult[0].part_name;
          }
        } catch (err) {
          console.error('Error fetching material info:', err);
        }
      }

      // Tạo thông báo chi tiết
      if (status === 'approved') {
        notificationMessage = `Yêu cầu ${requestTypeInVietnamese} nguyên vật liệu${materialInfo ? ` "${materialInfo}"` : ''} đã được phê duyệt`;
      } else {
        notificationMessage = `Yêu cầu ${requestTypeInVietnamese} nguyên vật liệu${materialInfo ? ` "${materialInfo}"` : ''} đã bị từ chối`;
      }

      // Thêm lý do từ chối nếu có
      if (status === 'rejected' && adminNotes) {
        notificationMessage += `. Lý do: ${adminNotes}`;
      }

      // Tạo thông báo cho người yêu cầu
      await pool.query(
        `INSERT INTO admin_notifications (user_id, related_request_id, message, notification_type)
        VALUES (?, ?, ?, 'request')`,
        [request.user_id, request.id, notificationMessage]
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

// Lấy tất cả thông báo của người dùng hiện tại
app.get('/api/notifications', isAuthenticatedAPI, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Lấy tất cả thông báo của người dùng
    const [notifications] = await pool.query(
      `SELECT * FROM admin_notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 100`,  // Giới hạn 100 thông báo gần nhất
      [userId]
    );
    
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

// Clear all notifications for a user
app.delete('/api/notifications', isAuthenticatedAPI, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Delete all notifications for the current user
    await pool.query(
      'DELETE FROM admin_notifications WHERE user_id = ?',
      [userId]
    );
    
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to clear notifications' });
  }
});

// Lấy số lượng thông báo chưa đọc
app.get('/api/notifications/unread-count', isAuthenticatedAPI, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Đếm số lượng thông báo chưa đọc
    const [result] = await pool.query(
      `SELECT COUNT(*) as count FROM admin_notifications 
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    
    const unreadCount = result[0].count;
    
    res.json({ success: true, count: unreadCount });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to count unread notifications', count: 0 });
  }
});

// Đánh dấu thông báo là đã đọc
app.put('/api/notifications/read', isAuthenticatedAPI, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.session.user.id;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid notification IDs' });
    }
    
    // Tạo placeholders cho câu truy vấn SQL
    const placeholders = notificationIds.map(() => '?').join(',');
    
    // Cập nhật là đã đọc (chỉ đối với thông báo của người dùng hiện tại)
    await pool.query(
      `UPDATE admin_notifications 
       SET is_read = 1 
       WHERE id IN (${placeholders}) AND user_id = ?`,
      [...notificationIds, userId]
    );
    
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

// Xóa thông báo (tùy chọn)
app.delete('/api/notifications/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    
    // Xóa thông báo (chỉ thông báo của người dùng hiện tại)
    await pool.query(
      'DELETE FROM admin_notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

// ===== BATCHES API =====

// Get all batches
app.get('/api/batches', isAuthenticatedAPI, async (req, res) => {
  try {
    const [batches] = await pool.query('SELECT * FROM batches ORDER BY id DESC');
    res.json({ success: true, data: batches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch batches' });
  }
});

// Get ungrouped batches
app.get('/api/batches/ungrouped', isAuthenticatedAPI, async (req, res) => {
  try {
    const [batches] = await pool.query(
      'SELECT * FROM batches WHERE status != "Grouped for Assembly" OR status IS NULL ORDER BY id DESC'
    );
    res.json({ success: true, data: batches });
  } catch (error) {
    console.error('Error fetching ungrouped batches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ungrouped batches' });
  }
});

// Get grouped batches
app.get('/api/batches/grouped', isAuthenticatedAPI, async (req, res) => {
  try {
    const [batches] = await pool.query(
      'SELECT b.*, bg.group_id FROM batches b ' +
      'JOIN batch_groups bg ON b.id = bg.batch_id ' +
      'WHERE b.status = "Grouped for Assembly" ' +
      'ORDER BY bg.group_id, b.id'
    );
    res.json({ success: true, data: batches });
  } catch (error) {
    console.error('Error fetching grouped batches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch grouped batches' });
  }
});

// Get a single batch by ID
app.get('/api/batches/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query('SELECT * FROM batches WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch batch' });
  }
});

// Group batches
app.post('/api/batches/group', isAuthenticatedAPI, async (req, res) => {
  // Start a transaction
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const { batchIds, status } = req.body;
    
    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid batch IDs' });
    }
    
    // Check if any of the batches are already grouped
    const placeholders = batchIds.map(() => '?').join(',');
    const [existingGrouped] = await connection.query(
      `SELECT id, part_name FROM batches 
       WHERE id IN (${placeholders}) AND status = "Grouped for Assembly"`,
      batchIds
    );
    
    if (existingGrouped.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Lô ${existingGrouped[0].part_name} đã được nhóm` 
      });
    }
    
    // Create a new group
    const [groupResult] = await connection.query(
      'INSERT INTO batch_groups_counter (created_by) VALUES (?)',
      [req.session.user.id]
    );
    
    const groupId = groupResult.insertId;
    
    // Add batches to the group
    for (const batchId of batchIds) {
      await connection.query(
        'INSERT INTO batch_groups (group_id, batch_id) VALUES (?, ?)',
        [groupId, batchId]
      );
      
      // Update batch status
      await connection.query(
        'UPDATE batches SET status = ? WHERE id = ?',
        [status, batchId]
      );
    }
    
    // Log the grouping activity
    await connection.query(
      `INSERT INTO activity_logs 
       (user_id, action_type, action_details, action_target) 
       VALUES (?, ?, ?, ?)`,
      [
        req.session.user.id,
        'BATCH_GROUP',
        JSON.stringify({ batchIds, groupId }),
        'batches'
      ]
    );
    
    // Commit the transaction
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Batches grouped successfully',
      groupId
    });
  } catch (error) {
    // Rollback in case of error
    await connection.rollback();
    console.error('Error grouping batches:', error);
    res.status(500).json({ success: false, error: 'Failed to group batches' });
  } finally {
    connection.release();
  }
});

// Update batch status
app.put('/api/batches/:id/status', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }
    
    await pool.query(
      'UPDATE batches SET status = ? WHERE id = ?',
      [status, id]
    );
    
    // Log the status update
    await pool.query(
      `INSERT INTO activity_logs 
       (user_id, action_type, action_details, action_target) 
       VALUES (?, ?, ?, ?)`,
      [
        req.session.user.id,
        'BATCH_STATUS_UPDATE',
        JSON.stringify({ batchId: id, newStatus: status }),
        'batches'
      ]
    );
    
    res.json({ 
      success: true, 
      message: 'Batch status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating batch status:', error);
    res.status(500).json({ success: false, error: 'Failed to update batch status' });
  }
});

// Add these server-side routes to your app.js file

// Create a new batch
app.post('/api/batches', isAuthenticatedAPI, async (req, res) => {
  try {
    const { part_name, machine_name, mold_code, quantity, warehouse_entry_time, status, created_by } = req.body;
    
    // Validate required fields
    if (!part_name || !machine_name || !mold_code || !quantity || !warehouse_entry_time) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Insert the batch into database
    const [result] = await pool.query(
      `INSERT INTO batches 
       (part_name, machine_name, mold_code, quantity, warehouse_entry_time, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [part_name, machine_name, mold_code, quantity, warehouse_entry_time, status, created_by]
    );
    
    // Create notification for admins
    const [admins] = await pool.query('SELECT id FROM users WHERE role = "admin" OR role = "quản lý"');
    
    for (const admin of admins) {
      await pool.query(
        `INSERT INTO admin_notifications (user_id, message, notification_type)
         VALUES (?, ?, ?)`,
        [admin.id, `New batch created: ${part_name} (${quantity} units)`, 'system']
      );
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Batch created successfully',
      batchId: result.insertId
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ success: false, error: 'Failed to create batch' });
  }
});

// ===== PRODUCTION API ROUTES =====

// Get all production data from loHangHoa
// ===== PRODUCTION API =====
// ===== PRODUCTION API ROUTES =====

app.get('/api/production', isAuthenticatedAPI, async (req, res) => {
  try {
    // Get filter from query parameter (default to all)
    const status = req.query.status || 'all';
    
    // Build query based on status filter
    let query = `
      SELECT loHangHoa.*, 
             materials.part_name AS material_name,
             machines.ten_may_dap AS machine_name,
             molds.ma_khuon AS mold_code,
             users.username AS created_by_username
      FROM loHangHoa
      LEFT JOIN materials ON loHangHoa.material_id = materials.id
      LEFT JOIN machines ON loHangHoa.machine_id = machines.id
      LEFT JOIN molds ON loHangHoa.mold_id = molds.id
      LEFT JOIN users ON loHangHoa.created_by = users.id
      WHERE loHangHoa.is_hidden = 0
    `;
    
    // Add where clause if filtering by status
    if (status !== 'all') {
      query += ` AND loHangHoa.status = ?`;
    }
    
    // Order by creation date, newest first
    query += ` ORDER BY loHangHoa.created_at DESC`;
    
    // Execute query
    const [batches] = status === 'all' 
      ? await pool.query(query)
      : await pool.query(query, [status]);
    
    res.json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('Error fetching production batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production batches'
    });
  }
});
app.put('/api/production/:id/archive', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE loHangHoa SET status = ?, end_date = NOW(), is_hidden = 1 WHERE id = ?', 
      ['stopping', id]
    );
    
    res.json({
      success: true,
      message: 'Production batch archived successfully'
    });
  } catch (error) {
    console.error('Error archiving production batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive production batch'
    });
  }
});
  // Get batch by ID
  app.get('/api/production/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [batches] = await pool.query(
        `SELECT loHangHoa.*, 
                materials.part_name AS material_name,
                machines.ten_may_dap AS machine_name,
                molds.ma_khuon AS mold_code,
                users.username AS created_by_username
         FROM loHangHoa
         LEFT JOIN materials ON loHangHoa.material_id = materials.id
         LEFT JOIN machines ON loHangHoa.machine_id = machines.id
         LEFT JOIN molds ON loHangHoa.mold_id = molds.id
         LEFT JOIN users ON loHangHoa.created_by = users.id
         WHERE loHangHoa.id = ?`,
        [id]
      );
      
      if (batches.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Production batch not found'
        });
      }
      
      res.json({
        success: true,
        data: batches[0]
      });
    } catch (error) {
      console.error('Error fetching production batch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch production batch'
      });
    }
  });
  
  // Create new production batch (status set to running initially)
  app.post('/api/production', isAuthenticatedAPI, async (req, res) => {
    try {
      const { 
        materialId, 
        machineId, 
        moldId, 
        expectedOutput
      } = req.body;
      
      // Validate required fields
      if (!materialId || !machineId || !moldId) {
        return res.status(400).json({
          success: false,
          error: 'Material, machine, and mold are required'
        });
      }
      
      // Set current date/time for start_date
      const currentDate = new Date();
      
      // Create new batch with running status
      const [result] = await pool.query(
        `INSERT INTO loHangHoa (
          material_id,
          machine_id,
          mold_id,
          created_by,
          status,
          expected_output,
          start_date
        ) VALUES (?, ?, ?, ?, 'running', ?, ?)`,
        [
          materialId,
          machineId,
          moldId,
          req.session.user.id,
          expectedOutput || 0,
          currentDate
        ]
      );
      
      // Update machine status to running
      await pool.query(
        `UPDATE machines SET status = 'running' WHERE id = ?`,
        [machineId]
      );
      
      // Get the newly created batch with joined data
      const [newBatch] = await pool.query(
        `SELECT loHangHoa.*, 
                materials.part_name AS material_name,
                machines.ten_may_dap AS machine_name,
                molds.ma_khuon AS mold_code,
                users.username AS created_by_username
         FROM loHangHoa
         LEFT JOIN materials ON loHangHoa.material_id = materials.id
         LEFT JOIN machines ON loHangHoa.machine_id = machines.id
         LEFT JOIN molds ON loHangHoa.mold_id = molds.id
         LEFT JOIN users ON loHangHoa.created_by = users.id
         WHERE loHangHoa.id = ?`,
        [result.insertId]
      );
      
      res.status(201).json({
        success: true,
        message: 'Production batch created successfully',
        data: newBatch[0]
      });
    } catch (error) {
      console.error('Error creating production batch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create production batch'
      });
    }
  });
  
  // Update production batch
  app.put('/api/production/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, actualOutput } = req.body;
      
      // Get the current batch
      const [currentBatch] = await pool.query(
        'SELECT * FROM loHangHoa WHERE id = ?',
        [id]
      );
      
      if (currentBatch.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Production batch not found'
        });
      }
      
      // Handle status transitions
      if (status) {
        // If changing to stopping (completed), set end_date
        if (status === 'stopping' && currentBatch[0].status !== 'stopping') {
          await pool.query(
            `UPDATE loHangHoa SET 
             status = ?,
             actual_output = ?,
             end_date = NOW()
             WHERE id = ?`,
            [status, actualOutput || currentBatch[0].actual_output, id]
          );
          
          // Update machine status to stopped
          await pool.query(
            `UPDATE machines SET status = 'stopping' WHERE id = ?`,
            [currentBatch[0].machine_id]
          );
        } 
        // If restarting a completed batch
        else if (status === 'running' && currentBatch[0].status === 'stopping') {
          await pool.query(
            `UPDATE loHangHoa SET 
             status = ?,
             actual_output = ?,
             end_date = NULL
             WHERE id = ?`,
            [status, actualOutput || currentBatch[0].actual_output, id]
          );
          
          // Update machine status to running
          await pool.query(
            `UPDATE machines SET status = 'running' WHERE id = ?`,
            [currentBatch[0].machine_id]
          );
        }
        // For other status changes without special handling
        else {
          await pool.query(
            `UPDATE loHangHoa SET 
             status = ?,
             actual_output = ?
             WHERE id = ?`,
            [status, actualOutput || currentBatch[0].actual_output, id]
          );
        }
      } else {
        // Update without changing status
        await pool.query(
          `UPDATE loHangHoa SET 
           actual_output = ?
           WHERE id = ?`,
          [actualOutput || currentBatch[0].actual_output, id]
        );
      }
      
      // Get the updated batch with joined data
      const [updatedBatch] = await pool.query(
        `SELECT loHangHoa.*, 
                materials.part_name AS material_name,
                machines.ten_may_dap AS machine_name,
                molds.ma_khuon AS mold_code,
                users.username AS created_by_username
         FROM loHangHoa
         LEFT JOIN materials ON loHangHoa.material_id = materials.id
         LEFT JOIN machines ON loHangHoa.machine_id = machines.id
         LEFT JOIN molds ON loHangHoa.mold_id = molds.id
         LEFT JOIN users ON loHangHoa.created_by = users.id
         WHERE loHangHoa.id = ?`,
        [id]
      );
      
      res.json({
        success: true,
        message: 'Production batch updated successfully',
        data: updatedBatch[0]
      });
    } catch (error) {
      console.error('Error updating production batch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update production batch'
      });
    }
  });
  
  // Delete production batch
// "Archive" production batch by marking it as "stopping" instead of deleting
app.delete('/api/production/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the batch to check machine status
    const [batch] = await pool.query(
      'SELECT machine_id, status FROM loHangHoa WHERE id = ?',
      [id]
    );
    
    if (batch.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Production batch not found'
      });
    }
    
    // Update to "stopping" and set end_date to mark as completed
    await pool.query(
      'UPDATE loHangHoa SET status = ?, end_date = NOW(), is_hidden = 1 WHERE id = ?', 
      ['stopping', id]
    );
    
    // If batch was running, update machine status
    if (batch[0].status === 'running') {
      await pool.query(
        'UPDATE machines SET status = ? WHERE id = ?',
        ['stopping', batch[0].machine_id]
      );
    }
    
    res.json({
      success: true,
      message: 'Production batch archived successfully'
    });
  } catch (error) {
    console.error('Error archiving production batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive production batch'
    });
  }
});
  
  // Additional endpoints for machines
  
  // Get all machines
  app.get('/api/machines', isAuthenticatedAPI, async (req, res) => {
    try {
      const [machines] = await pool.query('SELECT * FROM machines ORDER BY id');
      res.json({
        success: true,
        data: machines
      });
    } catch (error) {
      console.error('Error fetching machines:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch machines'
      });
    }
  });
  
  // Get all molds
  app.get('/api/molds', isAuthenticatedAPI, async (req, res) => {
    try {
      const [molds] = await pool.query('SELECT * FROM molds ORDER BY id');
      res.json({
        success: true,
        data: molds
      });
    } catch (error) {
      console.error('Error fetching molds:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch molds'
      });
    }
  });
  
  // Save machine stop reason
  app.post('/api/machines/:id/stop', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, stopTime, stopDate } = req.body;
      
      // Validate input
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Reason is required'
        });
      }
      
      // Log the stop reason
      await pool.query(
        `INSERT INTO machine_stop_logs 
         (machine_id, reason, stop_time, stop_date, user_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, reason, stopTime, stopDate, req.session.user.id]
      );
      
      // Update machine status
      await pool.query(
        'UPDATE machines SET status = ? WHERE id = ?',
        ['stopping', id]
      );
      
      res.json({
        success: true,
        message: 'Machine stop reason saved successfully'
      });
    } catch (error) {
      console.error('Error saving machine stop reason:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save machine stop reason'
      });
    }
  });

  // Add these routes to your Express app.js file

// Assembly routes
app.get('/api/assemblies', isAuthenticatedAPI, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT ac.*, u.username as pic_name 
        FROM assembly_components ac
        JOIN users u ON ac.pic_id = u.id
        ORDER BY ac.created_at DESC
      `);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching assemblies:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch assemblies' });
    }
  });
  
  app.get('/api/assemblies/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get assembly data with details
      const [rows] = await pool.query(`
        SELECT ac.*, u.username as pic_name, u.full_name as pic_full_name
        FROM assembly_components ac
        JOIN users u ON ac.pic_id = u.id
        WHERE ac.id = ?
      `, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Assembly not found' });
      }
      
      // Get batch information for this assembly
      const [batchRows] = await pool.query(`
        SELECT b.id, b.part_name, b.machine_name, b.mold_code, b.quantity
        FROM batches b
        JOIN batch_groups bg ON b.id = bg.batch_id
        WHERE bg.group_id = ?
      `, [rows[0].group_id]);
      
      const assemblyData = {
        ...rows[0],
        batches: batchRows
      };
      
      res.json({ success: true, data: assemblyData });
    } catch (error) {
      console.error('Error fetching assembly:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch assembly' });
    }
  });
  
  app.get('/api/assemblies/group/:groupId', isAuthenticatedAPI, async (req, res) => {
    try {
      const { groupId } = req.params;
      
      const [rows] = await pool.query(`
        SELECT ac.*, u.username as pic_name 
        FROM assembly_components ac
        JOIN users u ON ac.pic_id = u.id
        WHERE ac.group_id = ?
      `, [groupId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'No assembly found for this group' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error fetching assembly by group:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch assembly by group' });
    }
  });
  
  app.post('/api/assemblies', isAuthenticatedAPI, async (req, res) => {
    try {
      const { groupId, picId, startTime, completionTime, productQuantity, productName, productCode, notes } = req.body;
      
      // Validate required fields
      if (!groupId || !picId || !productQuantity) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      
      // Parse the start time string
      let parsedStartTime = null;
      try {
        if (startTime && startTime.includes(' - ')) {
          // Format: "hh:mm:ss - dd/mm/yyyy"
          const [time, date] = startTime.split(' - ');
          const [hours, minutes, seconds] = time.split(':');
          const [day, month, year] = date.split('/');
          
          parsedStartTime = new Date(year, month - 1, day, hours, minutes, seconds);
        } else {
          parsedStartTime = new Date();
        }
      } catch (e) {
        parsedStartTime = new Date();
      }
      
      // Parse the completion time string if provided
      let parsedCompletionTime = null;
      if (completionTime && completionTime.includes(' - ')) {
        try {
          const [time, date] = completionTime.split(' - ');
          const [hours, minutes, seconds] = time.split(':');
          const [day, month, year] = date.split('/');
          
          parsedCompletionTime = new Date(year, month - 1, day, hours, minutes, seconds);
        } catch (e) {
          // If parsing fails, leave as null
        }
      }
      
      // Insert the assembly
      const [result] = await pool.query(`
        INSERT INTO assembly_components 
        (group_id, pic_id, start_time, completion_time, product_quantity, product_name, product_code, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')
      `, [
        groupId,
        picId,
        parsedStartTime,
        parsedCompletionTime,
        productQuantity,
        productName || null,
        productCode || null,
        notes || null
      ]);
      
      res.status(201).json({ 
        success: true, 
        message: 'Assembly created successfully', 
        assemblyId: result.insertId 
      });
    } catch (error) {
      console.error('Error creating assembly:', error);
      res.status(500).json({ success: false, error: 'Failed to create assembly' });
    }
  });
  
  app.put('/api/assemblies/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      const { picId, startTime, completionTime, productQuantity, status } = req.body;
      
      // Build the SQL update statement dynamically
      let updateFields = [];
      let queryParams = [];
      
      if (picId) {
        updateFields.push('pic_id = ?');
        queryParams.push(picId);
      }
      
      if (startTime) {
        updateFields.push('start_time = ?');
        queryParams.push(new Date(startTime));
      }
      
      if (completionTime) {
        updateFields.push('completion_time = ?');
        queryParams.push(new Date(completionTime));
      }
      
      if (productQuantity) {
        updateFields.push('product_quantity = ?');
        queryParams.push(productQuantity);
      }
      
      if (status) {
        updateFields.push('status = ?');
        queryParams.push(status);
      }
      
      // Add the ID at the end of params array
      queryParams.push(id);
      
      if (updateFields.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }
      
      const query = `UPDATE assembly_components SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await pool.query(query, queryParams);
      
      res.json({ success: true, message: 'Assembly updated successfully' });
    } catch (error) {
      console.error('Error updating assembly:', error);
      res.status(500).json({ success: false, error: 'Failed to update assembly' });
    }
  });
  
  app.put('/api/assemblies/:id/status', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      
      await pool.query(
        'UPDATE assembly_components SET status = ? WHERE id = ?',
        [status, id]
      );
      
      res.json({ success: true, message: 'Assembly status updated successfully' });
    } catch (error) {
      console.error('Error updating assembly status:', error);
      res.status(500).json({ success: false, error: 'Failed to update assembly status' });
    }
  });
  
  app.post('/api/assemblies/:id/plating', isAuthenticatedAPI, async (req, res) => {
    // Bắt đầu transaction để đảm bảo tính nhất quán dữ liệu
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const { id } = req.params;
      
      // Lấy thông tin từ assembly_components
      const [assemblyResults] = await connection.query(
        `SELECT * FROM assembly_components WHERE id = ?`,
        [id]
      );
      
      if (assemblyResults.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          error: 'Assembly not found'
        });
      }
      
      const assembly = assemblyResults[0];
      
      // Cập nhật trạng thái assembly thành 'plating'
      await connection.query(
        `UPDATE assembly_components SET status = 'plating' WHERE id = ?`,
        [id]
      );
      
      // Tạo bản ghi mới trong bảng plating
      const now = new Date();
      await connection.query(
        `INSERT INTO plating 
         (assembly_id, product_name, product_code, notes, plating_start_time, status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [
          id,
          assembly.product_name,  // Lấy từ assembly_components
          assembly.product_code,  // Lấy từ assembly_components
          assembly.notes,        // Lấy từ assembly_components
          now
        ]
      );
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      res.json({
        success: true,
        message: 'Successfully transferred to plating process'
      });
    } catch (error) {
      // Rollback nếu có lỗi
      await connection.rollback();
      connection.release();
      console.error('Error transferring to plating:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to transfer to plating process'
      });
    }
  });  
  
  // Plating routes
  app.get('/api/plating', isAuthenticatedAPI, async (req, res) => {
    try {
      // Lấy danh sách với thông tin từ bảng assembly_components và users
      const [rows] = await pool.query(`
        SELECT 
          p.id, p.assembly_id, p.plating_start_time, p.plating_end_time, 
          p.status, p.created_at, p.product_name, p.product_code, p.notes,
          a.group_id, a.product_quantity, a.pic_id,
          u.username as pic_name
        FROM plating p
        JOIN assembly_components a ON p.assembly_id = a.id
        JOIN users u ON a.pic_id = u.id
        ORDER BY p.created_at DESC
      `);
      
      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Error fetching plating records:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch plating records'
      });
    }
  });  
  
  app.get('/api/plating/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Lấy chi tiết plating kèm thông tin từ assembly_components và users
      const [rows] = await pool.query(`
        SELECT 
          p.id, p.assembly_id, p.plating_start_time, p.plating_end_time, 
          p.status, p.created_at, p.product_name, p.product_code, p.notes,
          a.group_id, a.product_quantity, a.pic_id,
          u.username as pic_name
        FROM plating p
        JOIN assembly_components a ON p.assembly_id = a.id
        JOIN users u ON a.pic_id = u.id
        WHERE p.id = ?
      `, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Plating record not found'
        });
      }
      
      res.json({
        success: true,
        data: rows[0]
      });
    } catch (error) {
      console.error('Error fetching plating record:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch plating record'
      });
    }
  });
  
  app.get('/api/plating/assembly/:assemblyId', isAuthenticatedAPI, async (req, res) => {
    try {
      const { assemblyId } = req.params;
      
      // Lấy thông tin plating của một assembly cụ thể
      const [rows] = await pool.query(`
        SELECT 
          p.id, p.assembly_id, p.plating_start_time, p.plating_end_time, 
          p.status, p.created_at, p.product_name, p.product_code, p.notes,
          a.group_id, a.product_quantity, a.pic_id,
          u.username as pic_name
        FROM plating p
        JOIN assembly_components a ON p.assembly_id = a.id
        JOIN users u ON a.pic_id = u.id
        WHERE p.assembly_id = ?
      `, [assemblyId]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No plating record found for this assembly'
        });
      }
      
      res.json({
        success: true,
        data: rows[0]
      });
    } catch (error) {
      console.error('Error fetching plating by assembly:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch plating by assembly'
      });
    }
  });
  
  app.put('/api/plating/:id', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      const { product_name, product_code, notes, status, platingDate, platingTime } = req.body;
      
      // Xây dựng câu lệnh UPDATE dựa trên dữ liệu được cung cấp
      let updateFields = [];
      let queryParams = [];
      
      if (product_name !== undefined) {
        updateFields.push('product_name = ?');
        queryParams.push(product_name);
      }
      
      if (product_code !== undefined) {
        updateFields.push('product_code = ?');
        queryParams.push(product_code);
      }
      
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        queryParams.push(notes);
      }
      if (platingDate && platingTime) {
        // Convert DD/MM/YYYY to MySQL datetime format
        const [day, month, year] = platingDate.split('/');
        const formattedDateTime = `${year}-${month}-${day} ${platingTime}:00`;
        
        updateFields.push('plating_start_time = ?');
        queryParams.push(formattedDateTime);
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        queryParams.push(status);
        
        // Nếu status là 'completed', tự động cập nhật plating_end_time
        if (status === 'completed') {
          updateFields.push('plating_end_time = NOW()');
        }
      }
      
      // Nếu không có trường nào cần cập nhật
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      // Thêm id vào mảng tham số
      queryParams.push(id);
      
      // Thực hiện câu lệnh UPDATE
      await pool.query(
        `UPDATE plating SET ${updateFields.join(', ')} WHERE id = ?`,
        queryParams
      );
      
      res.json({
        success: true,
        message: 'Plating record updated successfully'
      });
    } catch (error) {
      console.error('Error updating plating record:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update plating record'
      });
    }
  });
  
  // Route để hoàn thành công đoạn mạ
  app.put('/api/plating/:id/complete', isAuthenticatedAPI, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Cập nhật trạng thái và thời gian kết thúc
      await pool.query(`
        UPDATE plating
        SET status = 'completed', plating_end_time = NOW()
        WHERE id = ?
      `, [id]);
      
      res.json({
        success: true,
        message: 'Plating process completed successfully'
      });
    } catch (error) {
      console.error('Error completing plating process:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete plating process'
      });
    }
});

// Finished Products API
app.get('/api/finished-products', isAuthenticatedAPI, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT fp.*, 
             p.product_name as plating_product_name,
             p.product_code as plating_product_code,
             a.group_id,
             u.username as created_by_name
      FROM finished_products fp
      LEFT JOIN plating p ON fp.plating_id = p.id
      LEFT JOIN assembly_components a ON fp.assembly_id = a.id
      LEFT JOIN users u ON fp.created_by = u.id
      ORDER BY fp.created_at DESC
    `);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching finished products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch finished products' });
  }
});

// Replace the current endpoint with this enhanced version
app.get('/api/finished-products/:id', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, get the basic product information
    const [products] = await pool.query(`
      SELECT fp.*, 
             p.product_name as plating_product_name,
             p.product_code as plating_product_code,
             a.group_id,
             u.username as created_by_name
      FROM finished_products fp
      LEFT JOIN plating p ON fp.plating_id = p.id
      LEFT JOIN assembly_components a ON fp.assembly_id = a.id
      LEFT JOIN users u ON fp.created_by = u.id
      WHERE fp.id = ?
    `, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ success: false, error: 'Finished product not found' });
    }
    
    const product = products[0];
    
    // Now, enrich the product with complete production history
    
    // 1. Get material information
    const [materialRows] = await pool.query(`
    SELECT * FROM materials
    ORDER BY id DESC
    LIMIT 1
  `);
    
    // 2. Get production information
// Get production information - fix the query
const [productionRows] = await pool.query(`
  SELECT l.*, 
         m.ten_may_dap as machine_name,
         mold.ma_khuon as mold_code,
         u.username as operator_name
  FROM loHangHoa l
  JOIN machines m ON l.machine_id = m.id
  JOIN molds mold ON l.mold_id = mold.id
  JOIN users u ON l.created_by = u.id
  JOIN materials mat ON l.material_id = mat.id
  /* Remove the direct join on group_id which doesn't exist */
  JOIN batches b ON b.mold_code = mold.ma_khuon
  JOIN batch_groups bg ON bg.batch_id = b.id
  WHERE bg.group_id = ?
  LIMIT 1
`, [product.group_id]);
    
    // 3. Get assembly information
    const [assemblyRows] = await pool.query(`
      SELECT ac.*, 
             u.username as pic_name,
             u.full_name as pic_full_name
      FROM assembly_components ac
      JOIN users u ON ac.pic_id = u.id
      WHERE ac.id = ?
    `, [product.assembly_id]);
    
    // 4. Get plating information
    const [platingRows] = await pool.query(`
      SELECT p.*,
             DATE_FORMAT(p.plating_start_time, '%d/%m/%Y') as platingDate,
             DATE_FORMAT(p.plating_start_time, '%H:%i:%s') as platingTime,
             DATE_FORMAT(p.plating_end_time, '%d/%m/%Y') as platingEndDate,
             DATE_FORMAT(p.plating_end_time, '%H:%i:%s') as platingEndTime
      FROM plating p
      WHERE p.id = ?
    `, [product.plating_id]);
    
    // 5. Get batch information
    const [batchRows] = await pool.query(`
      SELECT b.*
      FROM batches b
      JOIN batch_groups bg ON b.id = bg.batch_id
      WHERE bg.group_id = ?
    `, [product.group_id]);
    
    // Combine all the data into a complete product history
    product.history = {
      material: materialRows.length > 0 ? materialRows[0] : null,
      production: productionRows.length > 0 ? productionRows[0] : null,
      assembly: assemblyRows.length > 0 ? assemblyRows[0] : null,
      plating: platingRows.length > 0 ? platingRows[0] : null,
      batches: batchRows
    };
    
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching finished product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch finished product' });
  }
});

// Add a finished product
app.post('/api/finished-products', isAuthenticatedAPI, async (req, res) => {
  try {
    const { 
      platingId, 
      assemblyId, 
      groupId, 
      productName, 
      productCode, 
      quantity, 
      status = 'in_stock',
      qrCodeData = {}
    } = req.body;
    
    // Validate required fields
    if (!platingId || !assemblyId || !groupId || !productName || !productCode || !quantity) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Insert the finished product
    const [result] = await pool.query(`
      INSERT INTO finished_products 
      (plating_id, assembly_id, group_id, product_name, product_code, quantity, completion_date, created_by, status, qr_code_data)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
    `, [
      platingId,
      assemblyId,
      groupId,
      productName,
      productCode,
      quantity,
      req.session.user.id,
      status,
      JSON.stringify(qrCodeData)
    ]);
    
    // Return the newly created product
    const [newProduct] = await pool.query(`
      SELECT * FROM finished_products WHERE id = ?
    `, [result.insertId]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Finished product added successfully',
      data: newProduct[0]
    });
  } catch (error) {
    console.error('Error adding finished product:', error);
    res.status(500).json({ success: false, error: 'Failed to add finished product' });
  }
});

// Update finished product status
app.put('/api/finished-products/:id/status', isAuthenticatedAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }
    
    await pool.query(`
      UPDATE finished_products
      SET status = ?
      WHERE id = ?
    `, [status, id]);
    
    res.json({ success: true, message: 'Product status updated successfully' });
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ success: false, error: 'Failed to update product status' });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;