-- Property Sales & Rental Management System
-- Database Schema Definition (Node-Express Backend)

CREATE DATABASE IF NOT EXISTS property_mgmt_db;
USE property_mgmt_db;

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) DEFAULT 0
) ENGINE=InnoDB;

-- 2. Users Table (5 Roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'assistant_admin', 'branch_admin', 'branch_executive', 'external_broker') NOT NULL,
    branch_id INT NULL,
    phone VARCHAR(20),
    status ENUM('active', 'inactive') DEFAULT 'active',
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Broker Branch Assignment Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS broker_branch_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    broker_id INT NOT NULL,
    branch_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_assignment (broker_id, branch_id),
    FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Properties & Projects Table (Enhanced with Slug, RERA, Completion, and Address Details)
CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_code VARCHAR(50) UNIQUE NOT NULL,
    property_slug VARCHAR(255) UNIQUE NOT NULL, -- URL slug for dynamic routing
    project_name VARCHAR(255) NOT NULL,
    property_type ENUM('flat', 'bungalow', 'villa', 'shop', 'office', 'commercial') NOT NULL,
    branch_id INT NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    survey_number VARCHAR(100) NULL,
    city VARCHAR(100) NOT NULL,
    builder VARCHAR(255) NOT NULL,
    rera_id VARCHAR(100) NULL,
    completion_date DATE NULL,
    project_status ENUM('new_launch', 'under_construction', 'ready_possession') DEFAULT 'under_construction',
    highlights TEXT NULL, -- Project highlights
    map_embed_url TEXT NULL, -- Google Maps iframe source link
    developer_legacy TEXT NULL, -- Developer legacy history details
    availability_status ENUM('available', 'booked', 'sold_out') DEFAULT 'available',
    approval_status ENUM('draft', 'pending_approval', 'approved', 'rejected') DEFAULT 'draft',
    created_by INT NOT NULL,
    approved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 5. Property Unit Configurations (BHK Variants)
CREATE TABLE IF NOT EXISTS property_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    bhk_type VARCHAR(50) NOT NULL, -- e.g. "2 BHK", "3 BHK", "Office Space"
    carpet_area INT NOT NULL, -- in sq. ft.
    price DECIMAL(15, 2) NOT NULL,
    estimated_emi DECIMAL(15, 2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Property Amenities (Separate Table)
CREATE TABLE IF NOT EXISTS property_amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    amenity_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Property Specifications (Technical Details)
CREATE TABLE IF NOT EXISTS property_specifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    title VARCHAR(100) NOT NULL, -- e.g. "Structure", "Flooring", "Plumbing"
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Property Media Table (Photos, Floor plans, Brochures)
CREATE TABLE IF NOT EXISTS property_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    media_type ENUM('image', 'floor_plan', 'document', 'brochure') NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Property Leads / Inquiry Table
CREATE TABLE IF NOT EXISTS property_leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    broker_id INT NULL,
    lead_name VARCHAR(100) NOT NULL,
    lead_email VARCHAR(255) NOT NULL,
    lead_phone VARCHAR(20) NOT NULL,
    notes TEXT,
    assigned_executive_id INT NULL,
    status ENUM('new', 'in_progress', 'converted', 'closed') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_executive_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 10. Broker Activity Logs Table
CREATE TABLE IF NOT EXISTS broker_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    broker_id INT NOT NULL,
    activity_type ENUM('login', 'property_view', 'property_share_whatsapp', 'property_share_email', 'lead_submission') NOT NULL,
    property_id INT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
) ENGINE=InnoDB;
