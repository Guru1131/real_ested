<?php
// Submit Property for Approval API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Only Branch Admin can submit drafts for approval
AuthMiddleware::requireRole($currentUser, ['branch_admin']);

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Valid property ID is required."]);
    exit();
}

try {
    // Retrieve property
    $query = "SELECT id, branch_id, approval_status FROM properties WHERE id = :id AND is_deleted = 0 LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $property = $stmt->fetch();

    if (!$property) {
        http_response_code(404);
        echo json_encode(["error" => "Property not found."]);
        exit();
    }

    // Branch isolation check
    AuthMiddleware::enforceBranchIsolation($currentUser, $property['branch_id']);

    if ($property['approval_status'] !== 'draft') {
        http_response_code(400);
        echo json_encode(["error" => "Only property drafts can be submitted for approval."]);
        exit();
    }

    // Update status to pending_approval
    $update_query = "UPDATE properties SET approval_status = 'pending_approval' WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':id', $id);
    $update_stmt->execute();

    echo json_encode(["message" => "Property submitted successfully and is now pending Super Admin approval."]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error submitting property", "details" => $e->getMessage()]);
}
