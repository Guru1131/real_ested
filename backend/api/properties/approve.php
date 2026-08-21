<?php
// Approve Property API (Super Admin Reviewer)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Super Admin only
AuthMiddleware::requireRole($currentUser, ['super_admin']);

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$input = json_decode(file_get_contents("php://input"), true);
$action = isset($input['action']) ? trim($input['action']) : ''; // 'approve' or 'reject'

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Valid property ID is required."]);
    exit();
}

if ($action !== 'approve' && $action !== 'reject') {
    http_response_code(400);
    echo json_encode(["error" => "Valid action is required. Options are 'approve' or 'reject'."]);
    exit();
}

try {
    // Retrieve property
    $query = "SELECT id, approval_status FROM properties WHERE id = :id AND is_deleted = 0 LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $property = $stmt->fetch();

    if (!$property) {
        http_response_code(404);
        echo json_encode(["error" => "Property not found."]);
        exit();
    }

    if ($property['approval_status'] !== 'pending_approval') {
        http_response_code(400);
        echo json_encode(["error" => "Only properties in pending_approval status can be reviewed."]);
        exit();
    }

    // Set new approval status
    $new_status = ($action === 'approve') ? 'approved' : 'rejected';
    $approved_by_val = ($action === 'approve') ? $currentUser['id'] : null;

    $update_query = "UPDATE properties 
                    SET approval_status = :new_status, approved_by = :approved_by 
                    WHERE id = :id";
                    
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':new_status', $new_status);
    $update_stmt->bindValue(':approved_by', $approved_by_val, $approved_by_val === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $update_stmt->bindParam(':id', $id);
    $update_stmt->execute();

    echo json_encode(["message" => "Property has been successfully " . (($action === 'approve') ? "approved." : "rejected.")]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error updating property approval status", "details" => $e->getMessage()]);
}
