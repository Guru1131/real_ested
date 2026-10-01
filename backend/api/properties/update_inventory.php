<?php
// Update Inventory API (PHP Endpoint)
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

$currentUser = AuthMiddleware::authenticate();
AuthMiddleware::requireRole($currentUser, ['branch_admin', 'super_admin', 'assistant_admin']);

$database = new Database();
$db = $database->getConnection();

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!isset($input['id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Property ID is required."]);
    exit();
}

$id = (int)$input['id'];
$total_units = isset($input['total_units']) ? (int)$input['total_units'] : 0;
$available_units = isset($input['available_units']) ? (int)$input['available_units'] : 0;

try {
    try {
        $db->query("SELECT total_units FROM properties LIMIT 1");
    } catch (PDOException $e) {
        try { $db->exec("ALTER TABLE properties ADD COLUMN total_units INT DEFAULT 0"); } catch(PDOException $e2){}
    }

    try {
        $db->query("SELECT available_units FROM properties LIMIT 1");
    } catch (PDOException $e) {
        try { $db->exec("ALTER TABLE properties ADD COLUMN available_units INT DEFAULT 0"); } catch(PDOException $e2){}
    }

    $stmt = $db->prepare("SELECT * FROM properties WHERE id = :id AND is_deleted = 0 LIMIT 1");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $existing = $stmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(["error" => "Property not found."]);
        exit();
    }

    if ($currentUser['role'] === 'branch_admin') {
        AuthMiddleware::enforceBranchIsolation($currentUser, $existing['branch_id']);
    }

    $updateQuery = "UPDATE properties SET total_units = :tu, available_units = :au WHERE id = :id";
    $uStmt = $db->prepare($updateQuery);
    $uStmt->bindParam(':tu', $total_units);
    $uStmt->bindParam(':au', $available_units);
    $uStmt->bindParam(':id', $id);
    
    if($uStmt->execute()) {
        echo json_encode(["message" => "Inventory updated successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to update inventory"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error", "details" => $e->getMessage()]);
}
