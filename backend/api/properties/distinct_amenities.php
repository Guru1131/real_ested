<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');
try {
    \ = new Database();
    \ = \->getConnection();
    \ = \->query('SELECT DISTINCT amenity_name FROM property_amenities');
    \ = \->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode(\);
} catch(PDOException \) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
?>