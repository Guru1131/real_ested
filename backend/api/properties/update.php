<?php
// Update Property API (PHP Endpoint)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Require authorized roles
AuthMiddleware::requireRole($currentUser, ['branch_admin', 'super_admin', 'assistant_admin']);

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Valid property ID is required."]);
    exit();
}

try {
    // Retrieve existing property
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

    // Read input data
    $input = $_POST;
    if (empty($input)) {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true) ?: [];
    }

    $project_name = isset($input['project_name']) ? trim($input['project_name']) : $existing['project_name'];
    $property_type = isset($input['property_type']) ? trim($input['property_type']) : $existing['property_type'];
    $location = isset($input['location']) ? trim($input['location']) : $existing['location'];
    $city = isset($input['city']) ? trim($input['city']) : $existing['city'];
    $address = isset($input['address']) ? trim($input['address']) : $existing['address'];
    $survey_number = isset($input['survey_number']) ? trim($input['survey_number']) : $existing['survey_number'];
    $builder = isset($input['builder']) ? trim($input['builder']) : $existing['builder'];
    $rera_id = isset($input['rera_id']) ? trim($input['rera_id']) : $existing['rera_id'];
    $completion_date = isset($input['completion_date']) ? trim($input['completion_date']) : $existing['completion_date'];
    $project_status = isset($input['project_status']) ? trim($input['project_status']) : $existing['project_status'];
    $highlights = isset($input['highlights']) ? trim($input['highlights']) : $existing['highlights'];
    $map_embed_url = isset($input['map_embed_url']) ? trim($input['map_embed_url']) : $existing['map_embed_url'];
    $developer_legacy = isset($input['developer_legacy']) ? trim($input['developer_legacy']) : $existing['developer_legacy'];
    $availability_status = isset($input['availability_status']) ? trim($input['availability_status']) : $existing['availability_status'];
    $action = isset($input['action']) ? trim($input['action']) : '';

    $targetApprovalStatus = $existing['approval_status'];
    if ($action === 'submit') {
        $targetApprovalStatus = 'pending_approval';
    } else if ($currentUser['role'] === 'branch_admin' && $existing['approval_status'] === 'approved') {
        $targetApprovalStatus = 'pending_approval';
    }

    $db->beginTransaction();

    $updateQuery = "UPDATE properties SET 
                    project_name = :project_name, property_type = :property_type, location = :location, 
                    address = :address, survey_number = :survey_number, city = :city, builder = :builder, 
                    rera_id = :rera_id, completion_date = :completion_date, project_status = :project_status, 
                    highlights = :highlights, map_embed_url = :map_embed_url, developer_legacy = :developer_legacy, 
                    availability_status = :availability_status, approval_status = :approval_status 
                    WHERE id = :id";
    
    $uStmt = $db->prepare($updateQuery);
    $uStmt->bindParam(':project_name', $project_name);
    $uStmt->bindParam(':property_type', $property_type);
    $uStmt->bindParam(':location', $location);
    $uStmt->bindParam(':address', $address);
    $uStmt->bindParam(':survey_number', $survey_number);
    $uStmt->bindParam(':city', $city);
    $uStmt->bindParam(':builder', $builder);
    $uStmt->bindParam(':rera_id', $rera_id);
    $uStmt->bindParam(':completion_date', $completion_date);
    $uStmt->bindParam(':project_status', $project_status);
    $uStmt->bindParam(':highlights', $highlights);
    $uStmt->bindParam(':map_embed_url', $map_embed_url);
    $uStmt->bindParam(':developer_legacy', $developer_legacy);
    $uStmt->bindParam(':availability_status', $availability_status);
    $uStmt->bindParam(':approval_status', $targetApprovalStatus);
    $uStmt->bindParam(':id', $id);
    $uStmt->execute();

    // Replace configurations if present
    if (isset($input['configurations'])) {
        $configs = is_array($input['configurations']) ? $input['configurations'] : json_decode($input['configurations'], true);
        if (is_array($configs)) {
            $delStmt = $db->prepare("DELETE FROM property_configurations WHERE property_id = :id");
            $delStmt->bindParam(':id', $id);
            $delStmt->execute();

            $cStmt = $db->prepare("INSERT INTO property_configurations (property_id, bhk_type, carpet_area, price, estimated_emi) VALUES (:pid, :bhk, :area, :price, :emi)");
            foreach ($configs as $cfg) {
                $cStmt->bindParam(':pid', $id);
                $cStmt->bindParam(':bhk', $cfg['bhk_type']);
                $cStmt->bindParam(':area', $cfg['carpet_area']);
                $cStmt->bindParam(':price', $cfg['price']);
                $cStmt->bindParam(':emi', $cfg['estimated_emi']);
                $cStmt->execute();
            }
        }
    }

    $db->commit();
    echo json_encode([
        "message" => "Property updated successfully.",
        "propertyId" => $id,
        "approval_status" => $targetApprovalStatus
    ]);

} catch (PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Error updating property", "details" => $e->getMessage()]);
}
