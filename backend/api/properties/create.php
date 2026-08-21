<?php
// Create Property API (Branch Admin Draft Creator)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Only Branch Admin can create drafts
AuthMiddleware::requireRole($currentUser, ['branch_admin']);

$database = new Database();
$db = $database->getConnection();

try {
    // Read text fields from POST parameters (since it is multipart/form-data for file uploads)
    $project_name = isset($_POST['project_name']) ? trim($_POST['project_name']) : '';
    $property_type = isset($_POST['property_type']) ? trim($_POST['property_type']) : '';
    $location = isset($_POST['location']) ? trim($_POST['location']) : '';
    $address = isset($_POST['address']) ? trim($_POST['address']) : '';
    $builder = isset($_POST['builder']) ? trim($_POST['builder']) : '';
    $area_sqft = isset($_POST['area_sqft']) ? (float)$_POST['area_sqft'] : 0.0;
    $price = isset($_POST['price']) ? (float)$_POST['price'] : 0.0;
    $rental_info = isset($_POST['rental_info']) ? trim($_POST['rental_info']) : '';
    
    // Parse amenities as a JSON array of strings
    $amenities_raw = isset($_POST['amenities']) ? trim($_POST['amenities']) : '[]';
    $amenities = json_decode($amenities_raw, true);
    if (!is_array($amenities)) {
        $amenities = [];
    }
    
    $specifications = isset($_POST['specifications']) ? trim($_POST['specifications']) : '';
    $availability_status = isset($_POST['availability_status']) ? trim($_POST['availability_status']) : 'available';

    if (empty($project_name) || empty($property_type) || empty($location) || empty($address) || empty($builder) || $area_sqft <= 0 || $price <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Required fields: project_name, property_type, location, address, builder, area_sqft, price."]);
        exit();
    }

    $branch_id = (int)$currentUser['branch_id'];

    // Fetch branch code to generate a unique property code
    $branch_query = "SELECT code FROM branches WHERE id = :branch_id LIMIT 1";
    $b_stmt = $db->prepare($branch_query);
    $b_stmt->bindParam(':branch_id', $branch_id);
    $b_stmt->execute();
    $branch = $b_stmt->fetch();
    
    if (!$branch) {
        http_response_code(400);
        echo json_encode(["error" => "Your branch profile is invalid."]);
        exit();
    }
    
    // Generate unique property code: PROP-[BRANCH-CODE]-[RANDOM-4]
    $random_suffix = rand(1000, 9999);
    $property_code = "PROP-" . str_replace(' ', '', strtoupper($branch['code'])) . "-" . $random_suffix;

    // Check duplicate code (unlikely, but safe)
    $chk_code = "SELECT id FROM properties WHERE property_code = :code LIMIT 1";
    $cc_stmt = $db->prepare($chk_code);
    $cc_stmt->bindParam(':code', $property_code);
    $cc_stmt->execute();
    if ($cc_stmt->fetch()) {
        $property_code = "PROP-" . str_replace(' ', '', strtoupper($branch['code'])) . "-" . rand(10000, 99999);
    }

    // Start Transaction
    $db->beginTransaction();

    // Insert property draft
    $query = "INSERT INTO properties (property_code, project_name, property_type, branch_id, location, address, builder, area_sqft, price, rental_info, amenities, specifications, availability_status, approval_status, created_by) 
              VALUES (:property_code, :project_name, :property_type, :branch_id, :location, :address, :builder, :area_sqft, :price, :rental_info, :amenities, :specifications, :availability_status, 'draft', :created_by)";
              
    $stmt = $db->prepare($query);
    $stmt->bindParam(':property_code', $property_code);
    $stmt->bindParam(':project_name', $project_name);
    $stmt->bindParam(':property_type', $property_type);
    $stmt->bindParam(':branch_id', $branch_id);
    $stmt->bindParam(':location', $location);
    $stmt->bindParam(':address', $address);
    $stmt->bindParam(':builder', $builder);
    $stmt->bindParam(':area_sqft', $area_sqft);
    $stmt->bindParam(':price', $price);
    
    $rental_info_val = empty($rental_info) ? null : $rental_info;
    $stmt->bindValue(':rental_info', $rental_info_val, $rental_info_val === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    
    $amenities_json = json_encode($amenities);
    $stmt->bindParam(':amenities', $amenities_json);
    
    $stmt->bindParam(':specifications', $specifications);
    $stmt->bindParam(':availability_status', $availability_status);
    $stmt->bindParam(':created_by', $currentUser['id']);
    $stmt->execute();

    $property_id = $db->lastInsertId();

    // File Upload Handling
    $upload_dir = __DIR__ . '/../../uploads/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    $media_types = ['image', 'floor_plan', 'document', 'brochure'];
    $media_stmt = $db->prepare("INSERT INTO property_media (property_id, media_type, file_url, file_name) VALUES (:property_id, :media_type, :file_url, :file_name)");

    foreach ($media_types as $m_type) {
        $field_name = $m_type . "s"; // images, floor_plans, brochures, documents
        
        if (isset($_FILES[$field_name])) {
            $files = $_FILES[$field_name];
            
            // Normalize single file upload to array format for easy iteration
            if (!is_array($files['name'])) {
                $files = [
                    'name' => [$files['name']],
                    'type' => [$files['type']],
                    'tmp_name' => [$files['tmp_name']],
                    'error' => [$files['error']],
                    'size' => [$files['size']]
                ];
            }

            for ($i = 0; $i < count($files['name']); $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $orig_name = basename($files['name'][$i]);
                    $ext = strtolower(pathinfo($orig_name, PATHINFO_EXTENSION));
                    
                    // Generate safe random unique filename
                    $safe_filename = uniqid($m_type . "_", true) . "." . $ext;
                    $target_file = $upload_dir . $safe_filename;
                    
                    if (move_uploaded_file($files['tmp_name'][$i], $target_file)) {
                        $relative_url = "uploads/" . $safe_filename;
                        
                        $media_stmt->bindParam(':property_id', $property_id);
                        $media_stmt->bindParam(':media_type', $m_type);
                        $media_stmt->bindParam(':file_url', $relative_url);
                        $media_stmt->bindParam(':file_name', $orig_name);
                        $media_stmt->execute();
                    }
                }
            }
        }
    }

    $db->commit();

    echo json_encode([
        "message" => "Property draft created successfully",
        "property_id" => (int)$property_id,
        "property_code" => $property_code
    ]);

} catch(PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Error creating property", "details" => $e->getMessage()]);
}
