<?php
// Leads Listing API (Role and Branch Isolated)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Read query params for status filter
$status = isset($_GET['status']) ? trim($_GET['status']) : '';

$database = new Database();
$db = $database->getConnection();

try {
    // Base query
    $query = "SELECT l.*, p.project_name, p.property_code, b.name as branch_name, 
                     u_broker.username as broker_name, u_exec.username as executive_name
              FROM property_leads l
              JOIN properties p ON l.property_id = p.id
              JOIN branches b ON p.branch_id = b.id
              LEFT JOIN users u_broker ON l.broker_id = u_broker.id
              LEFT JOIN users u_exec ON l.assigned_executive_id = u_exec.id";

    $where_clauses = ["p.is_deleted = 0"];
    $params = [];

    // Role-based data isolation
    switch ($currentUser['role']) {
        case 'super_admin':
        case 'assistant_admin':
            // Sees all leads
            break;

        case 'branch_admin':
            // Sees all leads of properties belonging to their branch
            $where_clauses[] = "p.branch_id = :branch_id";
            $params[':branch_id'] = $currentUser['branch_id'];
            break;

        case 'branch_executive':
            // Sees leads assigned to them specifically
            $where_clauses[] = "l.assigned_executive_id = :exec_id";
            $params[':exec_id'] = $currentUser['id'];
            break;

        case 'external_broker':
            // Sees leads submitted by themselves only
            $where_clauses[] = "l.broker_id = :broker_id";
            $params[':broker_id'] = $currentUser['id'];
            break;

        default:
            http_response_code(403);
            echo json_encode(["error" => "Role not authorized to access leads."]);
            exit();
    }

    if (!empty($status)) {
        $where_clauses[] = "l.status = :status";
        $params[':status'] = $status;
    }

    if (!empty($where_clauses)) {
        $query .= " WHERE " . implode(" AND ", $where_clauses);
    }

    $query .= " ORDER BY l.id DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $leads = $stmt->fetchAll();

    echo json_encode($leads);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error listing leads", "details" => $e->getMessage()]);
}
