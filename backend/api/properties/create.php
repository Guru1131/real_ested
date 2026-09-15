<?php
// Create Property API (Admin & Branch Draft Creator)

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

try {
    // Read text fields from POST parameters
    $project_name = isset($_POST['project_name']) ? trim($_POST['project_name']) : '';
    $property_type = isset($_POST['property_type']) ? trim($_POST['property_type']) : '';
    $location = isset($_POST['location']) ? trim($_POST['location']) : '';
    $address = isset($_POST['address']) ? trim($_POST['address']) : '';
    $city = isset($_POST['city']) ? trim($_POST['city']) : '';
    $builder = isset($_POST['builder']) ? trim($_POST['builder']) : '';
    $survey_number = isset($_POST['survey_number']) ? trim($_POST['survey_number']) : '';
    $rera_id = isset($_POST['rera_id']) ? trim($_POST['rera_id']) : '';
    $completion_date = isset($_POST['completion_date']) ? trim($_POST['completion_date']) : '';
    $project_status = isset($_POST['project_status']) ? trim($_POST['project_status']) : 'under_construction';
    $highlights = isset($_POST['highlights']) ? trim($_POST['highlights']) : '';
    $map_embed_url = isset($_POST['map_embed_url']) ? trim($_POST['map_embed_url']) : '';
    $virtual_tour_url = isset($_POST['virtual_tour_url']) ? trim($_POST['virtual_tour_url']) : '';
    $developer_legacy = isset($_POST['developer_legacy']) ? trim($_POST['developer_legacy']) : '';
    $availability_status = isset($_POST['availability_status']) ? trim($_POST['availability_status']) : 'available';

    // Parse JSON arrays
    $configurations_raw = isset($_POST['configurations']) ? trim($_POST['configurations']) : '[]';
    $amenities_raw = isset($_POST['amenities']) ? trim($_POST['amenities']) : '[]';
    $specifications_raw = isset($_POST['specifications']) ? trim($_POST['specifications']) : '[]';

    if (empty($project_name) || empty($location) || empty($city) || empty($address) || empty($builder)) {
        http_response_code(400);
        echo json_encode(["error" => "Required fields: project_name, location, city, address, builder."]);
        exit();
    }

    $branch_id = (int)$currentUser['branch_id'];
    if (in_array($currentUser['role'], ['super_admin', 'assistant_admin']) && isset($_POST['branch_id']) && (int)$_POST['branch_id'] > 0) {
        $branch_id = (int)$_POST['branch_id'];
    }
    if ($branch_id <= 0) $branch_id = 1;

    // Fetch branch code for Unique Code generation
    $branch_query = "SELECT code FROM branches WHERE id = :branch_id LIMIT 1";
    $b_stmt = $db->prepare($branch_query);
    $b_stmt->bindParam(':branch_id', $branch_id);
    $b_stmt->execute();
    $branch = $b_stmt->fetch();
    $branchCode = $branch ? $branch['code'] : 'PROP';
    
    // Generate unique property code: PROP-[BRANCH-CODE]-[RANDOM-4]
    $random_suffix = rand(1000, 9999);
    $property_code = "PROP-" . str_replace(' ', '', strtoupper($branchCode)) . "-" . $random_suffix;
    // Validate RERA ID Uniqueness if provided
    if (!empty($rera_id)) {
        $checkRera = "SELECT id, project_name FROM properties WHERE rera_id = :rera AND is_deleted = 0 LIMIT 1";
        $crStmt = $db->prepare($checkRera);
        $crStmt->bindParam(':rera', $rera_id);
        $crStmt->execute();
        $existingRera = $crStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingRera) {
            http_response_code(409);
            echo json_encode(["error" => "Duplicate RERA ID! RERA ID '{$rera_id}' is already registered for property '{$existingRera['project_name']}'."]);
            exit();
        }
    }

    // Start Transaction
    $db->beginTransaction();

    // Insert property record
    $query = "INSERT INTO properties 
              (property_code, property_slug, project_name, property_type, branch_id, location, address, survey_number, city, builder, rera_id, completion_date, project_status, highlights, map_embed_url, virtual_tour_url, developer_legacy, availability_status, approval_status, created_by) 
              VALUES (:code, :slug, :pname, :ptype, :bid, :loc, :addr, :surv, :city, :builder, :rera, :comp, :pstat, :high, :map, :vtour, :leg, :avail, 'draft', :cby)";
              
    $stmt = $db->prepare($query);
    $stmt->bindParam(':code', $property_code);
    $stmt->bindParam(':slug', $property_slug);
    $stmt->bindParam(':pname', $project_name);
    $stmt->bindParam(':ptype', $property_type);
    $stmt->bindParam(':bid', $branch_id);
    $stmt->bindParam(':loc', $location);
    $stmt->bindParam(':addr', $address);
    $stmt->bindParam(':surv', $survey_number);
    $stmt->bindParam(':city', $city);
    $stmt->bindParam(':builder', $builder);
    $stmt->bindParam(':rera', $rera_id);
    $stmt->bindParam(':comp', $completion_date);
    $stmt->bindParam(':pstat', $project_status);
    $stmt->bindParam(':high', $highlights);
    $stmt->bindParam(':map', $map_embed_url);
    $stmt->bindParam(':vtour', $virtual_tour_url);
    $stmt->bindParam(':leg', $developer_legacy);
    $stmt->bindParam(':avail', $availability_status);
    $stmt->bindParam(':cby', $currentUser['id']);
    $stmt->execute();

    $property_id = $db->lastInsertId();

    // Insert configurations
    $configs = json_decode($configurations_raw, true);
    if (is_array($configs)) {
        $cStmt = $db->prepare("INSERT INTO property_configurations (property_id, bhk_type, carpet_area, price, estimated_emi, floor_plan_url) VALUES (:pid, :bhk, :area, :price, :emi, :floor_plan)");
        foreach ($configs as $cfg) {
            $cStmt->bindParam(':pid', $property_id);
            $cStmt->bindParam(':bhk', $cfg['bhk_type']);
            $cStmt->bindParam(':area', $cfg['carpet_area']);
            $cStmt->bindParam(':price', $cfg['price']);
            $cStmt->bindParam(':emi', $cfg['estimated_emi']);
            $fpUrl = isset($cfg['floor_plan_url']) ? $cfg['floor_plan_url'] : (isset($cfg['floor_plan']) ? $cfg['floor_plan'] : null);
            $cStmt->bindParam(':floor_plan', $fpUrl);
            $cStmt->execute();
        }
    }

    // Insert amenities
    $amenities = json_decode($amenities_raw, true);
    if (is_array($amenities)) {
        $aStmt = $db->prepare("INSERT INTO property_amenities (property_id, amenity_name) VALUES (:pid, :name)");
        foreach ($amenities as $amenity) {
            $aStmt->bindParam(':pid', $property_id);
            $aStmt->bindParam(':name', $amenity);
            $aStmt->execute();
        }
    }

    // Insert specifications
    $specifications = json_decode($specifications_raw, true);
    if (is_array($specifications)) {
        $sStmt = $db->prepare("INSERT INTO property_specifications (property_id, title, details) VALUES (:pid, :title, :details)");
        foreach ($specifications as $spec) {
            $sStmt->bindParam(':pid', $property_id);
            $sStmt->bindParam(':title', $spec['title']);
            $sStmt->bindParam(':details', $spec['details']);
            $sStmt->execute();
        }
    }

    // File Upload Handling
    $upload_dir = __DIR__ . '/../../uploads/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    $media_types = ['image', 'floor_plan', 'document', 'brochure'];
    $media_stmt = $db->prepare("INSERT INTO property_media (property_id, media_type, file_url, file_name) VALUES (:property_id, :media_type, :file_url, :file_name)");

    foreach ($media_types as $m_type) {
        $field_name = $m_type . "s";
        if (isset($_FILES[$field_name])) {
            $files = $_FILES[$field_name];
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
