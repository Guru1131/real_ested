<?php
// Property Detail API (Enforces isolation and logs broker property views)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Valid property ID is required."]);
    exit();
}

try {
    // 1. Fetch main property data
    $query = "SELECT p.*, b.name as branch_name, b.code as branch_code 
              FROM properties p
              JOIN branches b ON p.branch_id = b.id
              WHERE p.id = :id AND p.is_deleted = 0 LIMIT 1";
              
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $property = $stmt->fetch();

    if (!$property) {
        http_response_code(404);
        echo json_encode(["error" => "Property not found."]);
        exit();
    }

    // 2. Enforce Isolation Policies
    switch ($currentUser['role']) {
        case 'super_admin':
        case 'assistant_admin':
            // Can view anything
            break;

        case 'branch_admin':
            // Must belong to their branch
            AuthMiddleware::enforceBranchIsolation($currentUser, $property['branch_id']);
            break;

        case 'branch_executive':
            // Must belong to their branch AND be approved
            AuthMiddleware::enforceBranchIsolation($currentUser, $property['branch_id']);
            if ($property['approval_status'] !== 'approved') {
                http_response_code(403);
                echo json_encode(["error" => "Access denied. Property is not approved."]);
                exit();
            }
            break;

        case 'external_broker':
            // Must be assigned to that branch AND property must be approved
            if ($property['approval_status'] !== 'approved') {
                http_response_code(403);
                echo json_encode(["error" => "Access denied. Property is not approved."]);
                exit();
            }
            
            $chk_assign = "SELECT id FROM broker_branch_assignments WHERE broker_id = :broker_id AND branch_id = :branch_id LIMIT 1";
            $ca_stmt = $db->prepare($chk_assign);
            $ca_stmt->bindParam(':broker_id', $currentUser['id']);
            $ca_stmt->bindParam(':branch_id', $property['branch_id']);
            $ca_stmt->execute();
            if (!$ca_stmt->fetch()) {
                http_response_code(403);
                echo json_encode(["error" => "Access denied. You are not assigned to this property's branch."]);
                exit();
            }
            
            // Log broker view event
            $log_query = "INSERT INTO broker_activity_logs (broker_id, activity_type, property_id, metadata) 
                          VALUES (:broker_id, 'property_view', :property_id, :metadata)";
            $log_stmt = $db->prepare($log_query);
            $metadata = json_encode([
                "ip" => $_SERVER['REMOTE_ADDR'],
                "user_agent" => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'Unknown'
            ]);
            $log_stmt->bindParam(':broker_id', $currentUser['id']);
            $log_stmt->bindParam(':property_id', $id);
            $log_stmt->bindParam(':metadata', $metadata);
            $log_stmt->execute();
            break;
    }

    // 3. Fetch media attachments
    $media_query = "SELECT id, media_type, file_url, file_name FROM property_media WHERE property_id = :property_id";
    $media_stmt = $db->prepare($media_query);
    $media_stmt->bindParam(':property_id', $id);
    $media_stmt->execute();
    $media = $media_stmt->fetchAll();

    // Parse JSON arrays for response
    $property['amenities'] = json_decode($property['amenities'], true);

    // Group media files by category
    $media_grouped = [
        "images" => [],
        "floor_plans" => [],
        "documents" => [],
        "brochures" => []
    ];

    foreach ($media as $item) {
        $type_key = $item['media_type'] . "s"; // pluralize
        if (array_key_exists($type_key, $media_grouped)) {
            $media_grouped[$type_key][] = [
                "id" => (int)$item['id'],
                "url" => $item['file_url'],
                "name" => $item['file_name']
            ];
        }
    }

    echo json_encode([
        "property" => $property,
        "media" => $media_grouped
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error retrieving property details", "details" => $e->getMessage()]);
}
