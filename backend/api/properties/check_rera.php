<?php
// Check RERA ID Uniqueness API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Check if public/authenticated
$rera_id = isset($_GET['rera_id']) ? trim($_GET['rera_id']) : '';
$exclude_id = isset($_GET['exclude_id']) ? (int)$_GET['exclude_id'] : 0;

if (empty($rera_id)) {
    echo json_encode(["exists" => false]);
    exit();
}

$database = new Database();
$db = $database->getConnection();

try {
    if ($exclude_id > 0) {
        $query = "SELECT id, project_name FROM properties WHERE rera_id = :rera AND id != :exclude_id AND is_deleted = 0 LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':rera', $rera_id);
        $stmt->bindParam(':exclude_id', $exclude_id);
    } else {
        $query = "SELECT id, project_name FROM properties WHERE rera_id = :rera AND is_deleted = 0 LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':rera', $rera_id);
    }
    
    $stmt->execute();
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        echo json_encode([
            "exists" => true,
            "property_id" => (int)$existing['id'],
            "project_name" => $existing['project_name']
        ]);
    } else {
        echo json_encode(["exists" => false]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error checking RERA ID uniqueness", "details" => $e->getMessage()]);
}
