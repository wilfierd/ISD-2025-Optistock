-- Complete schema.sql file for Inventory Management System
-- This file contains all database definitions and initial data

-- Drop the database if it exists
DROP DATABASE IF EXISTS inventory_system;

-- Create the database
CREATE DATABASE IF NOT EXISTS inventory_system;
USE inventory_system;

-- ===============================================
-- CORE TABLES
-- ===============================================

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table with department relationship
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    department_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Add foreign key from departments to users (manager)
ALTER TABLE departments
ADD CONSTRAINT fk_department_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

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

-- ===============================================
-- MATERIAL ORGANIZATION TABLES
-- ===============================================

-- Create material categories
CREATE TABLE IF NOT EXISTS material_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create material tags
CREATE TABLE IF NOT EXISTS material_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6c757d',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create junction tables for materials and categories/tags
CREATE TABLE IF NOT EXISTS material_category_mapping (
    material_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (material_id, category_id),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS material_tag_mapping (
    material_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (material_id, tag_id),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES material_tags(id) ON DELETE CASCADE
);

-- ===============================================
-- MATERIAL REQUEST SYSTEM TABLES
-- ===============================================

-- Create material_requests table
CREATE TABLE IF NOT EXISTS material_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_type ENUM('add', 'edit', 'delete') NOT NULL,
    material_id INT NULL,
    request_data JSON NOT NULL,
    request_reason TEXT,
    urgency ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    user_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_date TIMESTAMP NULL,
    admin_id INT NULL,
    admin_notes TEXT,
    email_notification BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (admin_id) REFERENCES users(id),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    related_request_id INT NULL,
    notification_type ENUM('request', 'system', 'user') DEFAULT 'request',
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_request_id) REFERENCES material_requests(id) ON DELETE SET NULL
);

-- Create inventory_history table
CREATE TABLE IF NOT EXISTS inventory_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT,
    change_type ENUM('add', 'edit', 'delete') NOT NULL,
    change_data JSON NOT NULL,
    changed_by INT NOT NULL,
    request_id INT NULL,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    FOREIGN KEY (request_id) REFERENCES material_requests(id) ON DELETE SET NULL
);

-- Create request templates
CREATE TABLE IF NOT EXISTS request_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    request_type ENUM('add', 'edit', 'delete') NOT NULL,
    template_data JSON NOT NULL,
    created_by INT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create report preferences
CREATE TABLE IF NOT EXISTS report_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    settings JSON NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, report_type)
);

-- ===============================================
-- INDEXES
-- ===============================================

-- Create indexes to improve query performance
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_material_requests_user_id ON material_requests(user_id);
CREATE INDEX idx_material_requests_type_status ON material_requests(request_type, status);
CREATE INDEX idx_admin_notifications_user_read ON admin_notifications(user_id, is_read);
CREATE INDEX idx_inventory_history_material ON inventory_history(material_id);
CREATE INDEX idx_inventory_history_change_date ON inventory_history(change_date);
CREATE INDEX idx_materials_part_name ON materials(part_name);
CREATE INDEX idx_materials_supplier ON materials(supplier);

-- ===============================================
-- TRIGGERS
-- ===============================================

-- Trigger for adding new materials
DELIMITER //
CREATE TRIGGER after_material_insert
AFTER INSERT ON materials
FOR EACH ROW
BEGIN
    INSERT INTO inventory_history (
        material_id, 
        change_type, 
        change_data, 
        changed_by, 
        notes
    )
    VALUES (
        NEW.id, 
        'add', 
        JSON_OBJECT(
            'packet_no', NEW.packet_no,
            'part_name', NEW.part_name,
            'length', NEW.length,
            'width', NEW.width,
            'height', NEW.height,
            'quantity', NEW.quantity,
            'supplier', NEW.supplier
        ),
        (SELECT id FROM users WHERE username = NEW.updated_by LIMIT 1),
        'Initial creation'
    );
END //
DELIMITER ;

-- Trigger for updating materials
DELIMITER //
CREATE TRIGGER after_material_update
AFTER UPDATE ON materials
FOR EACH ROW
BEGIN
    INSERT INTO inventory_history (
        material_id, 
        change_type, 
        change_data, 
        changed_by, 
        notes
    )
    VALUES (
        NEW.id, 
        'edit', 
        JSON_OBJECT(
            'old', JSON_OBJECT(
                'packet_no', OLD.packet_no,
                'part_name', OLD.part_name,
                'length', OLD.length,
                'width', OLD.width,
                'height', OLD.height,
                'quantity', OLD.quantity,
                'supplier', OLD.supplier
            ),
            'new', JSON_OBJECT(
                'packet_no', NEW.packet_no,
                'part_name', NEW.part_name,
                'length', NEW.length,
                'width', NEW.width,
                'height', NEW.height,
                'quantity', NEW.quantity,
                'supplier', NEW.supplier
            )
        ),
        (SELECT id FROM users WHERE username = NEW.updated_by LIMIT 1),
        CONCAT('Updated by ', NEW.updated_by)
    );
END //
DELIMITER ;

-- Trigger for deleting materials
DELIMITER //
CREATE TRIGGER before_material_delete
BEFORE DELETE ON materials
FOR EACH ROW
BEGIN
    INSERT INTO inventory_history (
        material_id, 
        change_type, 
        change_data, 
        changed_by, 
        notes
    )
    VALUES (
        OLD.id, 
        'delete', 
        JSON_OBJECT(
            'packet_no', OLD.packet_no,
            'part_name', OLD.part_name,
            'length', OLD.length,
            'width', OLD.width,
            'height', OLD.height,
            'quantity', OLD.quantity,
            'supplier', OLD.supplier
        ),
        (SELECT id FROM users WHERE username = OLD.updated_by LIMIT 1),
        'Material deleted'
    );
END //
DELIMITER ;

-- ===============================================
-- VIEWS
-- ===============================================

-- View for pending requests with user details
CREATE OR REPLACE VIEW pending_requests_view AS
SELECT 
    mr.id,
    mr.request_type,
    mr.material_id,
    m.part_name AS material_name,
    mr.request_date,
    mr.urgency,
    u.username AS requested_by,
    u.full_name AS user_full_name,
    d.department_name
FROM 
    material_requests mr
JOIN 
    users u ON mr.user_id = u.id
LEFT JOIN 
    materials m ON mr.material_id = m.id
LEFT JOIN 
    departments d ON u.department_id = d.id
WHERE 
    mr.status = 'pending'
ORDER BY 
    CASE 
        WHEN mr.urgency = 'critical' THEN 1
        WHEN mr.urgency = 'high' THEN 2
        WHEN mr.urgency = 'medium' THEN 3
        ELSE 4
    END,
    mr.request_date;

-- View for material inventory with categories
CREATE OR REPLACE VIEW material_inventory_view AS
SELECT 
    m.id,
    m.packet_no,
    m.part_name,
    m.length,
    m.width,
    m.height,
    m.quantity,
    m.supplier,
    m.updated_by,
    m.last_updated,
    GROUP_CONCAT(DISTINCT mc.category_name SEPARATOR ', ') AS categories,
    GROUP_CONCAT(DISTINCT mt.tag_name SEPARATOR ', ') AS tags
FROM 
    materials m
LEFT JOIN 
    material_category_mapping mcm ON m.id = mcm.material_id
LEFT JOIN 
    material_categories mc ON mcm.category_id = mc.id
LEFT JOIN 
    material_tag_mapping mtm ON m.id = mtm.material_id
LEFT JOIN 
    material_tags mt ON mtm.tag_id = mt.id
GROUP BY 
    m.id;

-- ===============================================
-- INITIAL DATA
-- ===============================================

-- Insert departments
INSERT INTO departments (department_name, description) VALUES
('Purchasing', 'Responsible for sourcing and purchasing materials'),
('Warehouse', 'Manages inventory and material storage'),
('Production', 'Uses materials in manufacturing process'),
('Quality Control', 'Checks materials and finished products for quality'),
('Administration', 'System administrators and management');

-- Insert default admin user
INSERT INTO users (username, password, full_name, role, phone, department_id) VALUES
('admin', 'admin123', 'Administrator', 'admin', '123456789', 5);

-- Insert sample users
INSERT INTO users (username, password, full_name, role, phone, department_id) VALUES
('nguyenhieu', 'password123', 'Nguyễn Hieu', 'admin', '123456789', 5),
('trankhai', 'password123', 'Trần Nguyễn Khải', 'admin', '123456789', 5),
('lsd_admin', '123456789', 'Nguyen Quoc Hoang An', 'user', '699696969', 2),
('user1', 'password123', 'Máy móc', 'user', NULL, 3);

-- Insert sample categories
INSERT INTO material_categories (category_name, description, created_by) VALUES
('Raw Materials', 'Basic input materials for production', 1),
('Machinery Parts', 'Components for machinery maintenance', 1),
('Packaging', 'Materials used for product packaging', 1),
('Electronics', 'Electronic components and assemblies', 1),
('Office Supplies', 'Materials for office use', 1);

-- Insert sample tags
INSERT INTO material_tags (tag_name, color, created_by) VALUES
('Fragile', '#dc3545', 1),
('Heavy', '#6c757d', 1),
('Hazardous', '#ffc107', 1),
('Refrigerated', '#0dcaf0', 1),
('High Priority', '#fd7e14', 1);

-- Insert sample data for materials
INSERT INTO materials (packet_no, part_name, length, width, height, quantity, supplier, updated_by, last_updated) VALUES
(1, 'xxxxxxxxxxxxxxxxxxxxxxxxx', 3000, 3455, 2255, 10, 'SHENZEN', 'Khai', '05/03/2025'),
(1, '10100070001A (FIN 1)', 3000, 345, 10, 11000, 'NCCV', 'Khai', '05/03/2025'),
(1, '10100070002A (FIN 2)', 3000, 345, 345, 11000, 'NCCV', 'Khai', '05/03/2025'),
(1, '10100070003A (FIN 3)', 3000, 345, 35, 11000, 'NCCV', 'Khai', '05/03/2025'),
(2, '10100070008A (BASE)', 3000, 345, 345, 98000, 'NCCV', 'Khai', '05/03/2025'),
(3, '1010007010A (BLOCK)', 3000, 345, 345, 98000, 'NCCV', 'Khai', '05/03/2025');

-- Add some sample category mappings
INSERT INTO material_category_mapping (material_id, category_id) VALUES
(1, 2), -- First material is in Machinery Parts
(2, 2), -- Second material is in Machinery Parts
(3, 2), -- Third material is in Machinery Parts
(4, 2), -- Fourth material is in Machinery Parts
(5, 2), -- Fifth material is in Machinery Parts
(6, 2); -- Sixth material is in Machinery Parts

-- Add some sample tag mappings
INSERT INTO material_tag_mapping (material_id, tag_id) VALUES
(1, 2), -- First material is Heavy
(2, 2), -- Second material is Heavy
(3, 2), -- Third material is Heavy
(4, 2), -- Fourth material is Heavy
(5, 2), -- Fifth material is Heavy
(6, 2); -- Sixth material is Heavy

-- Sample requests
INSERT INTO material_requests (request_type, material_id, request_data, request_reason, urgency, user_id, status)
VALUES 
('edit', 1, '{"packetNo": 1, "partName": "Modified Part", "length": 3000, "width": 3455, "height": 2255, "quantity": 15, "supplier": "SHENZEN"}', 
 'Need to increase quantity for upcoming production', 'high', 4, 'pending'),
('add', NULL, '{"packetNo": 2, "partName": "New Component", "length": 500, "width": 300, "height": 200, "quantity": 25, "supplier": "Local Supplier"}',
 'Required for new product line', 'medium', 4, 'pending'),
('delete', 3, '{}', 'No longer needed in production', 'low', 4, 'pending');
