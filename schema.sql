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
    material_code VARCHAR(100) NOT NULL,
    length INT NOT NULL,
    width INT NOT NULL,
    material_type VARCHAR(50) NOT NULL,
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

-- Create batches table if it doesn't exist
CREATE TABLE IF NOT EXISTS batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_name VARCHAR(100) NOT NULL,
    machine_name VARCHAR(100) NOT NULL,
    mold_code VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    warehouse_entry_time VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create batch_groups_counter table for generating unique group IDs
CREATE TABLE IF NOT EXISTS batch_groups_counter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create batch_groups table for mapping batches to groups
CREATE TABLE IF NOT EXISTS batch_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    batch_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES batch_groups_counter(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id),
    UNIQUE KEY (batch_id) -- Each batch can only be in one group
);

-- Create activity_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_details JSON,
    action_target VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

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
INSERT INTO materials (packet_no, part_name, material_code, length, width, material_type, quantity, supplier, updated_by, last_updated) VALUES
(1, 'xxxxxxxxxxxxxxxxxxxxxxxxx','NVX', 3000, 3455, 'Steel', 10, 'SHENZEN', 'Khai', '05/03/2025'),
(1, 'Fin 673675/695045','AL1100', 02, 55, 'Aluminum', 1672, 'BOYD', 'Khai', '05/03/2025'),
(1, '690165/66','AL1100', 1, 75, 'Aluminum',  569 , 'BOYD', 'Khai', '05/03/2025'),
(1, '10100070003A (FIN 3)','AL1100', 3000, 345, 'Steel', 11000, 'NCCV', 'Khai', '05/03/2025'),
(2, 'GC70/71MF0234A0','C2680', 1, 19, 'Copper', 388, 'KMW', 'Khai', '05/03/2025'),
(3, '1010007010A (BLOCK)','AL1100', 3000, 345, 'Steel', 98000, 'NCCV', 'Khai', '05/03/2025');

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
('edit', 3, '{"packetNo": 15, "partName": "Modified Part", "length": 3000, "width": 3455, "materialCode": "ACC", "materialType": "copper", "quantity": 15, "supplier": "SHENZEN"}', 
 'Need to increase quantity for upcoming production', 'high', 4, 'pending'),
('add', NULL, '{"packetNo": 2, "partName": "New Component", "length": 500, "width": 300,"materialCode": "ZYA", "materialType": "steel", "quantity": 25, "supplier": "Local Supplier"}',
 'Required for new product line', 'medium', 4, 'pending'),
('delete', 3, '{}', 'No longer needed in production', 'low', 4, 'pending');
-- Insert sample data for batches
INSERT INTO batches (part_name, machine_name, mold_code, quantity, warehouse_entry_time, status, created_by) VALUES
('ZHG513-301', 'A7-45T', 'ZHG513-302-V1', 10, '19:00:10 05/03/2025', NULL, 1),
('C2021', 'ZHG513-302', 'ZHG513-302-V2', 20, '19:00:10 05/03/2025', NULL, 1),
('C2028', 'ZHG513-303', 'ZHG513-302-V3', 30, '19:00:10 05/03/2025', NULL, 1),
('C2022', 'ZHG513-304', 'ZHG513-302-V4', 40, '19:00:10 05/03/2025', NULL, 1),
('C2028', 'ZHG513-305', 'ZHG513-302-V4', 10, '19:00:10 05/03/2025', NULL, 1);

CREATE TABLE IF NOT EXISTS machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_may_dap VARCHAR(100) NOT NULL
);

-- Create molds table
CREATE TABLE IF NOT EXISTS molds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_khuon VARCHAR(100) NOT NULL,
    so_luong INT NOT NULL DEFAULT 0,
    machine_id INT,
    material_id INT,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

-- Create machine_stop_logs table
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
);

-- Create loHoangHoa table (renamed from batches)
CREATE TABLE IF NOT EXISTS loHangHoa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT,
    machine_id INT,
    mold_id INT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('running', 'stopping') DEFAULT 'running',
    expected_output INT,
    actual_output INT DEFAULT 0,
    start_date DATETIME,
    end_date DATETIME,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
    FOREIGN KEY (mold_id) REFERENCES molds(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
ALTER TABLE loHangHoa ADD COLUMN is_hidden TINYINT(1) DEFAULT 0;
-- Insert sample data for machines
INSERT INTO machines (ten_may_dap) VALUES
('A7-45T'),
('ZHG513-302'),
('ZHG513-303'),
('ZHG513-304'),
('Day la may test');

-- Insert sample data for molds
INSERT INTO molds (ma_khuon, so_luong, machine_id) VALUES
('ZHG513-302-V1', 10, 1),
('C2021', 20, 2),
('C2028', 30, 3),
('C2022', 40, 4),
('C2028', 10, 5);

-- Insert sample data for loHoangHoa (production batches)
INSERT INTO loHangHoa (material_id, machine_id, mold_id, created_by, status, expected_output, start_date) VALUES
(1, 2, 2, 1, 'running', 500, NOW()),
(2, 4, 4, 1, 'running', 250, NOW()),
(3, 1, 1, 2, 'running', 1000, '2025-04-01 08:00:00'),
(4, 3, 3, 2, 'running', 750, '2025-03-01 08:00:00'),
(5, 5, 5, 1, 'running', 300, '2025-05-01 08:00:00');

ALTER TABLE machines ADD COLUMN status ENUM('running', 'stopping') DEFAULT NULL;


-- Assembly components table
CREATE TABLE IF NOT EXISTS assembly_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    completion_time DATETIME,
    product_quantity INT NOT NULL,
    pic_id INT NOT NULL,
    product_name VARCHAR(255),
    product_code VARCHAR(100),
    notes TEXT,
    status ENUM('processing', 'completed', 'plating') DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES batch_groups_counter(id) ON DELETE CASCADE,
    FOREIGN KEY (pic_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Plating table
CREATE TABLE IF NOT EXISTS plating (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assembly_id INT NOT NULL,
    product_name VARCHAR(255),
    product_code VARCHAR(100),
    notes TEXT,
    plating_start_time DATETIME NOT NULL,
    plating_end_time DATETIME,
    status ENUM('pending', 'processing', 'completed', 'received') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assembly_id) REFERENCES assembly_components(id) ON DELETE CASCADE
);

-- IMPORTANT: Finished Products table must be created AFTER the plating table
-- since it references plating(id)
CREATE TABLE IF NOT EXISTS finished_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plating_id INT NOT NULL,
    assembly_id INT NOT NULL,
    group_id INT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    completion_date DATETIME NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'in_stock',
    qr_code_data JSON,
    FOREIGN KEY (plating_id) REFERENCES plating(id),
    FOREIGN KEY (assembly_id) REFERENCES assembly_components(id),
    FOREIGN KEY (group_id) REFERENCES batch_groups_counter(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Add defect_count column to the finished_products table
ALTER TABLE finished_products 
ADD COLUMN defect_count INT NOT NULL DEFAULT 0;

-- Add a comment to the column for documentation
ALTER TABLE finished_products
MODIFY COLUMN defect_count INT NOT NULL DEFAULT 0 COMMENT 'Number of defective products in this batch';

-- Optional: Update existing records if needed (set defect_count based on status)
-- This will set defect_count to quantity for all products with 'defective' status
UPDATE finished_products 
SET defect_count = quantity 
WHERE status = 'defective';

-- Optional: Create an index on defect_count if you plan to query by it often
CREATE INDEX idx_finished_products_defect_count ON finished_products(defect_count);

-- Optional: Add a check constraint to ensure defect_count is not greater than quantity
-- Note: This requires MySQL 8.0.16 or higher
ALTER TABLE finished_products
ADD CONSTRAINT chk_defect_count_range 
CHECK (defect_count >= 0 AND defect_count <= quantity);

-- Create quality_checks table to track inspection history
CREATE TABLE IF NOT EXISTS quality_checks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  status ENUM('OK', 'NG') NOT NULL,
  defect_count INT NOT NULL DEFAULT 0,
  defect_type VARCHAR(100),
  repair_recommendation TEXT,
  checked_by INT NOT NULL,
  check_date DATETIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES finished_products(id) ON DELETE CASCADE,
  FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create index for faster retrieval by product_id
CREATE INDEX idx_quality_checks_product ON quality_checks(product_id);