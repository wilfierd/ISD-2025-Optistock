-- Create the database
CREATE DATABASE IF NOT EXISTS inventory_system;
USE inventory_system;

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    packet_no INT NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    length INT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    quantity INT NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    last_updated VARCHAR(10) NOT NULL
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (username, password, full_name, role) VALUES
('admin', 'admin123', 'Administrator', 'admin');

-- Insert sample data
INSERT INTO materials (packet_no, part_name, length, width, height, quantity, supplier, updated_by, last_updated) VALUES
(1, 'xxxxxxxxxxxxxxxxxxxxxxxxx', 3000, 3455, 2255, 10, 'SHENZEN', 'Khai', '05/03/2025'),
(1, 'Máy móc', 3000, 345, 10, 10, 'Khai', 'Khai', '05/03/2025'),
(1, 'Máy móc', 3000, 345, 345, 10, 'Khai', 'Khai', '05/03/2025'),
(1, 'Máy móc', 3000, 345, 35, 10, 'Khai', 'Khai', '05/03/2025'),
(1, 'Máy móc', 3000, 345, 345, 10, 'Khai', 'Khai', '05/03/2025'),
(1, 'Máy móc', 3000, 345, 345, 10, 'Khai', 'Khai', '05/03/2025');