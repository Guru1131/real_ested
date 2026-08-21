-- Property Sales & Rental Management System
-- Seed Test Data (Node-Express Backend)
-- Default password for all seeded users: password123
-- Password hash: $2y$10$1U9YzC9MogdnXE1vQis/pu/nLTTM1nN3EM.OK2HJijmwAgVPpSOwS

USE property_mgmt_db;

-- Clear previous mock records
DELETE FROM broker_activity_logs;
DELETE FROM property_leads;
DELETE FROM property_media;
DELETE FROM property_specifications;
DELETE FROM property_amenities;
DELETE FROM property_configurations;
DELETE FROM properties;
DELETE FROM broker_branch_assignments;
DELETE FROM users;
DELETE FROM branches;

-- 1. Insert Branches
INSERT INTO branches (id, name, code, city, address) VALUES
(1, 'Pune Kondhwa Branch', 'PUNE-KND-01', 'Pune', 'Phase 2, Kondhwa Road, Near Sai Temple, Pune - 411048'),
(2, 'Mumbai Andheri Branch', 'MUM-AND-02', 'Mumbai', '402, Signature Plaza, Link Road, Andheri West, Mumbai - 400053');

-- 2. Insert Users
INSERT INTO users (id, username, email, password_hash, role, branch_id, phone, status) VALUES
-- Super Admin
(1, 'superadmin', 'superadmin@realestate.com', '$2y$10$1U9YzC9MogdnXE1vQis/pu/nLTTM1nN3EM.OK2HJijmwAgVPpSOwS', 'super_admin', NULL, '+919999999991', 'active'),
-- Assistant Admin
(2, 'assistantadmin', 'assistant.admin@realestate.com', '$2y$10$1U9YzC9MogdnXE1vQis/pu/nLTTM1nN3EM.OK2HJijmwAgVPpSOwS', 'assistant_admin', NULL, '+919999999992', 'active'),
-- Branch Admin - Pune
(3, 'pune_admin', 'pune.admin@realestate.com', '$2y$10$1U9YzC9MogdnXE1vQis/pu/nLTTM1nN3EM.OK2HJijmwAgVPpSOwS', 'branch_admin', 1, '+919888888881', 'active'),
-- Branch Executive - Pune
(4, 'pune_executive', 'pune.exec@realestate.com', '$2y$10$1U9YzC9MogdnXE1vQis/pu/nLTTM1nN3EM.OK2HJijmwAgVPpSOwS', 'branch_executive', 1, '+919777777771', 'active'),
-- External Broker
(5, 'broker_maharashtra', 'maharashtra.broker@gmail.com', '$2y$10$1U9YzC9MogdnXE1vQis/pu/nLTTM1nN3EM.OK2HJijmwAgVPpSOwS', 'external_broker', NULL, '+919666666661', 'active'),
-- Deactivated Broker
(6, 'deactivated_broker', 'deactivated.broker@gmail.com', '$2y$10$1U9YzC9MogdnXE1vQis/pu/nLTTM1nN3EM.OK2HJijmwAgVPpSOwS', 'external_broker', NULL, '+919555555551', 'inactive');

-- 3. Assign Broker to Branch 1 (Pune)
INSERT INTO broker_branch_assignments (broker_id, branch_id) VALUES
(5, 1);

-- 4. Insert Properties (Sai Sanskruti Phase 2, Lords Elegance, Central Park)
INSERT INTO properties (id, property_code, property_slug, project_name, property_type, branch_id, location, address, survey_number, city, builder, rera_id, completion_date, project_status, highlights, map_embed_url, developer_legacy, availability_status, approval_status, created_by, approved_by) VALUES
-- Sai Sanskruti Phase 2 (Approved, Pune branch)
(1, 'PROP-KND-PUNE-01', 'pune-kondhwa-sai-sanskruti-phase-2', 'Sai Sanskruti Phase 2', 'flat', 1, 'Kondhwa', 'Sai Sanskruti Phase 2, Kondhwa Budruk, Near ISKCON Temple, Pune', 'Survey No 42/1A', 'Pune', 'Sanskruti Builders', 'P52100024567', '2027-12-31', 'under_construction', 
'Sai Sanskruti Phase 2 offers premium smart-home apartments. Located in the fast-growing suburb of Kondhwa Budruk, Pune, it ensures excellent connectivity to major IT parks and schools.', 
'https://www.google.com/maps/embed?pb=!1m18!1m12!1m13!1d3784.4552467776106!2d73.8860228!3d18.4629851!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2ea5fb6ffffff%3A0xe506bc1f9b3bdbe5!2sSai%20Sanskruti%20Kondhwa!5e0!3m2!1sen!2sin!4v1700000000000', 
'Sanskruti Group is a trusted developer with 15+ years of legacy delivering quality properties and over 2000 happy families across Maharashtra.', 
'available', 'approved', 3, 1),

-- Lords Elegance (Pending, Pune branch)
(2, 'PROP-KND-PUNE-02', 'pune-kondhwa-bypass-lords-elegance', 'Lords Elegance', 'villa', 1, 'Kondhwa Bypass', 'Lords Elegance, Off Kondhwa Road, Pune', 'Survey No 89/3B', 'Pune', 'Lords Group', 'P52100028888', '2028-06-30', 'new_launch', 
'Exquisite independent villas in a gated community offering modern luxury, solar water systems, and customizable layouts.', 
'https://www.google.com/maps/embed?pb=!1m18!1m12!1m13!1d3784.5!2d73.89!3d18.46!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1sin!2sin!4v1700000000000', 
'Lords Group specializes in boutique villaments and high-end luxury residences.', 
'available', 'pending_approval', 3, NULL),

-- Central Park Avenue (Draft, Pune branch)
(3, 'PROP-KND-PUNE-03', 'pune-nibm-road-central-park-avenue', 'Central Park Avenue', 'flat', 1, 'NIBM Road', 'Central Park, NIBM Road, Kondhwa, Pune', 'Survey No 102/4', 'Pune', 'Avenue Infra', 'P52100030000', '2029-03-31', 'new_launch', 
'Premium modular apartments with excellent green views and luxury clubs.', 
NULL, 
'Avenue Infra focuses on urban green housing.', 
'available', 'draft', 3, NULL);

-- 5. Insert Configurations
INSERT INTO property_configurations (property_id, bhk_type, carpet_area, price, estimated_emi) VALUES
(1, '2 BHK Standard', 1050, 7500000.00, 55000.00),
(1, '3 BHK Premium', 1400, 11000000.00, 82000.00),
(2, '4 BHK Villa Deluxe', 3200, 24000000.00, 175000.00);

-- 6. Insert Amenities
INSERT INTO property_amenities (property_id, amenity_name) VALUES
(1, 'Swimming Pool'),
(1, 'Club House'),
(1, 'Gymnasium'),
(1, 'Landscape Garden'),
(1, '24/7 Security'),
(1, 'Children Play Area'),
(2, 'Private Garden'),
(2, 'Power Backup'),
(2, 'Swimming Pool');

-- 7. Insert Specifications
INSERT INTO property_specifications (property_id, title, details) VALUES
(1, 'Structure', 'RCC Earthquake resistant frame structure designed to withstand heavy seismic loads.'),
(1, 'Flooring', 'Premium double-charged Vitrified tiles in living room, dining area, and passages.'),
(1, 'Electrical', 'Concealed copper wiring with Polycab/Anchor cables and Schneider modular switches.'),
(1, 'Plumbing', 'Jaquar/Cera premium sanitary ware and anti-skid ceramic tiles in bathrooms.'),
(2, 'Automation', 'Home automation systems integrated for lighting, security cameras, and AC controls.');

-- 8. Insert Media
INSERT INTO property_media (property_id, media_type, file_url, file_name) VALUES
(1, 'image', 'uploads/sai_sanskruti_main.jpg', 'Sai Sanskruti Exterior'),
(1, 'image', 'uploads/sai_sanskruti_living.jpg', 'Living Room Layout'),
(1, 'floor_plan', 'uploads/sai_sanskruti_floor.jpg', '2 BHK Floor Plan'),
(1, 'brochure', 'uploads/sai_sanskruti_brochure.pdf', 'Sai Sanskruti Brochure.pdf'),
(2, 'image', 'uploads/lords_elegance_main.jpg', 'Lords Elegance Front View'),
(2, 'floor_plan', 'uploads/lords_elegance_floor.jpg', '4 BHK Villa Floor Plan'),
(2, 'brochure', 'uploads/lords_elegance_brochure.pdf', 'Lords Elegance Brochure.pdf');

-- 9. Insert Leads
INSERT INTO property_leads (id, property_id, broker_id, lead_name, lead_email, lead_phone, notes, assigned_executive_id, status) VALUES
(1, 1, 5, 'Rahul Sharma', 'rahul.sharma@gmail.com', '+919988776655', 'Interested in Sai Sanskruti 2BHK flat. Wants to schedule site visit.', 4, 'new');

-- 10. Insert Broker Activity Logs
INSERT INTO broker_activity_logs (broker_id, activity_type, property_id, metadata) VALUES
(5, 'login', NULL, '{"ip": "127.0.0.1", "user_agent": "Mozilla/5.0"}'),
(5, 'property_view', 1, '{"duration_sec": 45}'),
(5, 'property_share_whatsapp', 1, '{"recipient": "+919876543210"}'),
(5, 'lead_submission', 1, '{"lead_id": 1}');
