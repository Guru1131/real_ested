<?php
// Update Property Lead Status API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Staff only (Super Admin, Branch Admin, Branch Executive)
AuthMiddleware::requireRole($currentUser, ['super_admin', 'branch_admin', 'branch_executive']);

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$input = json_decode(file_get_contents("php://input"), true);
$status = isset($input['status']) ? trim($input['status']) : '';

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Valid lead ID is required."]);
    exit();
}

$valid_statuses = ['new', 'in_progress', 'converted', 'closed'];
if (!in_array($status, $valid_statuses)) {
    http_response_code(400);
    echo json_encode(["error" => "Valid status is required. Options: new, in_progress, converted, closed."]);
    exit();
}

try {
    // 1. Fetch lead details along with property branch information
    $query = "SELECT l.id, l.assigned_executive_id, p.branch_id 
              FROM property_leads l
              JOIN properties p ON l.property_id = p.id
              WHERE l.id = :id LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $lead = $stmt->fetch();

    if (!$lead) {
        http_response_code(404);
        echo json_encode(["error" => "Lead not found."]);
        exit();
    }

    // 2. Enforce Access Isolation Policies
    if ($currentUser['role'] === 'branch_executive') {
        // Executive can only edit leads assigned to them specifically
        if ($lead['assigned_executive_id'] != $currentUser['id']) {
            http_response_code(403);
            echo json_encode(["error" => "Access denied. You can only update leads assigned to you."]);
            exit();
        }
    } else if ($currentUser['role'] === 'branch_admin') {
        // Branch Admin can only edit leads belonging to properties of their branch
        AuthMiddleware::enforceBranchIsolation($currentUser, $lead['branch_id']);
    }

    // 3. Update status
    $update_query = "UPDATE property_leads SET status = :status WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':status', $status);
    $update_stmt->bindParam(':id', $id);
    $update_stmt->execute();

    echo json_encode(["message" => "Lead status updated successfully."]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error updating lead status", "details" => $e->getMessage()]);
}
