<?php
// External Broker Activity Log Fetching API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Admin roles only (Super Admin, Assistant Admin, Branch Admin)
AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin', 'branch_admin']);

$database = new Database();
$db = $database->getConnection();

$broker_id = isset($_GET['broker_id']) ? (int)$_GET['broker_id'] : 0;

if ($broker_id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Valid broker ID is required."]);
    exit();
}

try {
    // 1. Verify that the user is actually a broker
    $check_query = "SELECT id, username, role FROM users WHERE id = :id AND role = 'external_broker' AND is_deleted = 0 LIMIT 1";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':id', $broker_id);
    $check_stmt->execute();
    $broker = $check_stmt->fetch();

    if (!$broker) {
        http_response_code(442);
        echo json_encode(["error" => "Specified user is not an external broker."]);
        exit();
    }

    // 2. Branch Admin isolation rule: must have assignment to branch admin's branch to view logs
    if ($currentUser['role'] === 'branch_admin') {
        $check_assign = "SELECT id FROM broker_branch_assignments WHERE broker_id = :broker_id AND branch_id = :branch_id LIMIT 1";
        $ca_stmt = $db->prepare($check_assign);
        $ca_stmt->bindParam(':broker_id', $broker_id);
        $ca_stmt->bindParam(':branch_id', $currentUser['branch_id']);
        $ca_stmt->execute();
        if (!$ca_stmt->fetch()) {
            http_response_code(403);
            echo json_encode(["error" => "You are not authorized to view this broker's activity logs."]);
            exit();
        }
    }

    // 3. Fetch logs
    $log_query = "SELECT l.id, l.activity_type, l.metadata, l.created_at, p.id as property_id, p.project_name, p.property_code
                  FROM broker_activity_logs l
                  LEFT JOIN properties p ON l.property_id = p.id
                  WHERE l.broker_id = :broker_id
                  ORDER BY l.created_at DESC";
    $log_stmt = $db->prepare($log_query);
    $log_stmt->bindParam(':broker_id', $broker_id);
    $log_stmt->execute();
    $logs = $log_stmt->fetchAll();

    // Parse JSON metadata for each log entry
    foreach ($logs as &$log) {
        if (!empty($log['metadata'])) {
            $log['metadata'] = json_decode($log['metadata'], true);
        }
    }

    echo json_encode([
        "broker" => [
            "id" => (int)$broker['id'],
            "username" => $broker['username']
        ],
        "logs" => $logs
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error retrieving activity logs", "details" => $e->getMessage()]);
}
