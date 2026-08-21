<?php
// Submit Property Lead / Inquiry API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// External Brokers or Branch Executives only
AuthMiddleware::requireRole($currentUser, ['external_broker', 'branch_executive', 'branch_admin']);

$database = new Database();
$db = $database->getConnection();

$input = json_decode(file_get_contents("php://input"), true);
$property_id = isset($input['property_id']) ? (int)$input['property_id'] : 0;
$lead_name = isset($input['lead_name']) ? trim($input['lead_name']) : '';
$lead_email = isset($input['lead_email']) ? trim($input['lead_email']) : '';
$lead_phone = isset($input['lead_phone']) ? trim($input['lead_phone']) : '';
$notes = isset($input['notes']) ? trim($input['notes']) : '';

if ($property_id <= 0 || empty($lead_name) || empty($lead_phone)) {
    http_response_code(400);
    echo json_encode(["error" => "Required fields: property_id, lead_name, lead_phone."]);
    exit();
}

try {
    // 1. Fetch property and its branch
    $query = "SELECT id, branch_id, approval_status FROM properties WHERE id = :id AND is_deleted = 0 LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $property_id);
    $stmt->execute();
    $property = $stmt->fetch();

    if (!$property) {
        http_response_code(442);
        echo json_encode(["error" => "Target property does not exist."]);
        exit();
    }

    // External broker branch checking
    if ($currentUser['role'] === 'external_broker') {
        if ($property['approval_status'] !== 'approved') {
            http_response_code(403);
            echo json_encode(["error" => "You can only submit leads for approved properties."]);
            exit();
        }

        $chk_assign = "SELECT id FROM broker_branch_assignments WHERE broker_id = :broker_id AND branch_id = :branch_id LIMIT 1";
        $ca_stmt = $db->prepare($chk_assign);
        $ca_stmt->bindParam(':broker_id', $currentUser['id']);
        $ca_stmt->bindParam(':branch_id', $property['branch_id']);
        $ca_stmt->execute();
        if (!$ca_stmt->fetch()) {
            http_response_code(403);
            echo json_encode(["error" => "You are not assigned to this property's branch."]);
            exit();
        }
    }

    // 2. Select an active sales executive from the property's branch to auto-assign
    $exec_query = "SELECT id FROM users 
                   WHERE role = 'branch_executive' AND branch_id = :branch_id AND status = 'active' AND is_deleted = 0 
                   ORDER BY RAND() LIMIT 1";
    $exec_stmt = $db->prepare($exec_query);
    $exec_stmt->bindParam(':branch_id', $property['branch_id']);
    $exec_stmt->execute();
    $exec = $exec_stmt->fetch();
    
    $assigned_executive_id = $exec ? (int)$exec['id'] : null;

    // Start database transaction
    $db->beginTransaction();

    // 3. Create Lead
    $lead_query = "INSERT INTO property_leads (property_id, broker_id, lead_name, lead_email, lead_phone, notes, assigned_executive_id, status) 
                   VALUES (:property_id, :broker_id, :lead_name, :lead_email, :lead_phone, :notes, :assigned_executive_id, 'new')";
                   
    $lead_stmt = $db->prepare($lead_query);
    $lead_stmt->bindParam(':property_id', $property_id);
    
    $broker_id_val = ($currentUser['role'] === 'external_broker') ? $currentUser['id'] : null;
    $lead_stmt->bindValue(':broker_id', $broker_id_val, $broker_id_val === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    
    $lead_stmt->bindParam(':lead_name', $lead_name);
    $lead_stmt->bindParam(':lead_email', $lead_email);
    $lead_stmt->bindParam(':lead_phone', $lead_phone);
    $lead_stmt->bindParam(':notes', $notes);
    $lead_stmt->bindValue(':assigned_executive_id', $assigned_executive_id, $assigned_executive_id === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $lead_stmt->execute();

    $new_lead_id = $db->lastInsertId();

    // 4. Log broker activity if applicable
    if ($currentUser['role'] === 'external_broker') {
        $log_query = "INSERT INTO broker_activity_logs (broker_id, activity_type, property_id, metadata) 
                      VALUES (:broker_id, 'lead_submission', :property_id, :metadata)";
        $log_stmt = $db->prepare($log_query);
        $metadata = json_encode([
            "lead_id" => $new_lead_id,
            "lead_name" => $lead_name,
            "ip" => $_SERVER['REMOTE_ADDR']
        ]);
        $log_stmt->bindParam(':broker_id', $currentUser['id']);
        $log_stmt->bindParam(':property_id', $property_id);
        $log_stmt->bindParam(':metadata', $metadata);
        $log_stmt->execute();
    }

    $db->commit();

    echo json_encode([
        "message" => "Lead submitted successfully",
        "lead_id" => (int)$new_lead_id,
        "assigned_executive_id" => $assigned_executive_id
    ]);

} catch(PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Error submitting lead inquiry", "details" => $e->getMessage()]);
}
