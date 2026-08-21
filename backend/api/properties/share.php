<?php
// Property Share Tracker API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$input = json_decode(file_get_contents("php://input"), true);
$channel = isset($input['channel']) ? trim($input['channel']) : ''; // 'whatsapp' or 'email'
$recipient = isset($input['recipient']) ? trim($input['recipient']) : ''; // Optional recipient phone/email

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Valid property ID is required."]);
    exit();
}

if ($channel !== 'whatsapp' && $channel !== 'email') {
    http_response_code(400);
    echo json_encode(["error" => "Valid sharing channel is required. Options: 'whatsapp' or 'email'."]);
    exit();
}

try {
    // Fetch property
    $query = "SELECT id, project_name, property_code FROM properties WHERE id = :id AND is_deleted = 0 LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $property = $stmt->fetch();

    if (!$property) {
        http_response_code(404);
        echo json_encode(["error" => "Property not found."]);
        exit();
    }

    // Only log activity if the current user is an external broker
    if ($currentUser['role'] === 'external_broker') {
        $activity_type = ($channel === 'whatsapp') ? 'property_share_whatsapp' : 'property_share_email';
        
        $log_query = "INSERT INTO broker_activity_logs (broker_id, activity_type, property_id, metadata) 
                      VALUES (:broker_id, :activity_type, :property_id, :metadata)";
        $log_stmt = $db->prepare($log_query);
        $metadata = json_encode([
            "recipient" => $recipient,
            "ip" => $_SERVER['REMOTE_ADDR'],
            "timestamp" => time()
        ]);
        $log_stmt->bindParam(':broker_id', $currentUser['id']);
        $log_stmt->bindParam(':activity_type', $activity_type);
        $log_stmt->bindParam(':property_id', $id);
        $log_stmt->bindParam(':metadata', $metadata);
        $log_stmt->execute();
    }

    echo json_encode([
        "message" => "Sharing logged successfully",
        "share_data" => [
            "project_name" => $property['project_name'],
            "property_code" => $property['property_code'],
            "channel" => $channel
        ]
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error logging share event", "details" => $e->getMessage()]);
}
