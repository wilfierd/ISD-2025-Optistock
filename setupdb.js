// setup-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let connection;
  
  try {
    // First connect without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    console.log('Connected to MySQL server');
    
    // Drop database if exists and create a new one
    await connection.query('DROP DATABASE IF EXISTS inventory_system');
    console.log('Dropped existing database (if it existed)');
    
    await connection.query('CREATE DATABASE IF NOT EXISTS inventory_system');
    console.log('Database created successfully');
    
    // Use the inventory_system database
    await connection.query('USE inventory_system');
    console.log('Using inventory_system database');
    
    // Read SQL script (excluding DROP/CREATE DATABASE commands since we already did those)
    const sqlScript = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlScript
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && 
              !statement.toUpperCase().includes('DROP DATABASE') && 
              !statement.toUpperCase().includes('CREATE DATABASE'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.toUpperCase().includes('USE INVENTORY_SYSTEM')) {
        console.log('Skipping USE statement as we already selected the database');
        continue;
      }
      
      try {
        await connection.query(statement);
        console.log(`Executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        console.error(`Error executing statement: ${statement.substring(0, 100)}`);
        console.error(err);
      }
    }
    
    console.log('Database setup completed successfully');
    
    // Verify data was inserted
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM materials');
    console.log(`Inserted ${rows[0].count} materials into the database`);
    
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`Inserted ${users[0].count} users into the database`);
    
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