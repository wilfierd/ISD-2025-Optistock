// setup-db.js
require('dotenv').config(); 
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Read SQL script
const sqlScript = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Split into individual statements
const statements = sqlScript
  .replace(/(\r\n|\n|\r)/gm, ' ') // Remove newlines
  .replace(/\/\*.*?\*\//g, '') // Remove comments
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => statement.length > 0);

async function setupDatabase() {
  let connection;
  
  try {
    // First, connect without database selected
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
    });
    
    console.log('Connected to MySQL server');
    
    // Execute each statement
    for (const statement of statements) {
      await connection.query(statement);
      console.log(`Executed: ${statement.substring(0, 50)}...`);
    }
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the setup
setupDatabase();