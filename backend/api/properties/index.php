<?php
// Properties Listing & Search API (RBAC and Branch Isolated)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Check if public request
$isPublic = (isset($_GET['public']) && $_GET['public'] == '1') || (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/api/properties/public') !== false);

if (!$isPublic) {
    // Authenticate user
    $currentUser = AuthMiddleware::authenticate();
} else {
    $currentUser = ['role' => 'public', 'id' => 0, 'branch_id' => 0];
}

$database = new Database();
$db = $database->getConnection();

// Read query params
$propertyCode = isset($_GET['propertyCode']) ? trim($_GET['propertyCode']) : (isset($_GET['code']) ? trim($_GET['code']) : '');
$projectName = isset($_GET['projectName']) ? trim($_GET['projectName']) : '';
$type = isset($_GET['type']) ? trim($_GET['type']) : '';
$location = isset($_GET['location']) ? trim($_GET['location']) : '';
$city = isset($_GET['city']) ? trim($_GET['city']) : '';
$minPrice = isset($_GET['minPrice']) ? (float)$_GET['minPrice'] : 0;
$maxPrice = isset($_GET['maxPrice']) ? (float)$_GET['maxPrice'] : 0;
$availability = isset($_GET['availability']) ? trim($_GET['availability']) : '';
$approvalStatus = isset($_GET['approvalStatus']) ? trim($_GET['approvalStatus']) : '';
$possessionTimeline = isset($_GET['possessionTimeline']) ? trim($_GET['possessionTimeline']) : (isset($_GET['possession']) ? trim($_GET['possession']) : '');

try {
    // Base query
    $query = "SELECT p.id, p.property_code, p.project_name, p.property_slug, p.property_type, p.branch_id, 
                     p.location, p.city, p.builder, p.area_sqft, p.price, p.min_price, p.min_area, p.availability_status, 
                     p.approval_status, p.completion_date, p.project_status, p.primary_image, p.virtual_tour_url, p.created_at, b.name as branch_name 
              FROM properties p
              JOIN branches b ON p.branch_id = b.id";
              
    $where_clauses = ["p.is_deleted = 0"];
    $params = [];

    // Role-based data isolation filters
    switch ($currentUser['role']) {
        case 'public':
            $where_clauses[] = "p.approval_status = 'approved'";
            break;

        case 'super_admin':
        case 'assistant_admin':
            // No branch limits. Can filter by approvalStatus if specified.
            if (!empty($approvalStatus)) {
                $where_clauses[] = "p.approval_status = :app_status";
                $params[':app_status'] = $approvalStatus;
            }
            break;

        case 'branch_admin':
            // Limited to own branch, but sees all statuses
            $where_clauses[] = "p.branch_id = :branch_id";
            $params[':branch_id'] = $currentUser['branch_id'];
            if (!empty($approvalStatus)) {
                $where_clauses[] = "p.approval_status = :app_status";
                $params[':app_status'] = $approvalStatus;
            }
            break;

        case 'branch_executive':
            // Limited to own branch AND only approved properties
            $where_clauses[] = "p.branch_id = :branch_id";
            $params[':branch_id'] = $currentUser['branch_id'];
            $where_clauses[] = "p.approval_status = 'approved'";
            break;

        case 'external_broker':
            // Limited to assigned branches AND only approved properties
            $query .= " JOIN broker_branch_assignments ba ON p.branch_id = ba.branch_id";
            $where_clauses[] = "ba.broker_id = :broker_id";
            $params[':broker_id'] = $currentUser['id'];
            $where_clauses[] = "p.approval_status = 'approved'";
            break;
            
        default:
            http_response_code(403);
            echo json_encode(["error" => "Role not authorized to access properties."]);
            exit();
    }

    // Apply Search Filters
    if (!empty($propertyCode)) {
        $where_clauses[] = "(p.property_code LIKE :prop_code OR p.id = :prop_code_num)";
        $params[':prop_code'] = "%" . $propertyCode . "%";
        $params[':prop_code_num'] = is_numeric($propertyCode) ? (int)$propertyCode : 0;
    }
    if (!empty($projectName)) {
        $where_clauses[] = "p.project_name LIKE :project_name";
        $params[':project_name'] = "%" . $projectName . "%";
    }
    if (!empty($city)) {
        $where_clauses[] = "p.city LIKE :city";
        $params[':city'] = "%" . $city . "%";
    }
    if (!empty($type)) {
        $where_clauses[] = "p.property_type = :prop_type";
        $params[':prop_type'] = $type;
    }
    if (!empty($location)) {
        $where_clauses[] = "p.location LIKE :location";
        $params[':location'] = "%" . $location . "%";
    }
    if ($minPrice > 0) {
        $where_clauses[] = "p.price >= :min_price";
        $params[':min_price'] = $minPrice;
    }
    if ($maxPrice > 0) {
        $where_clauses[] = "p.price <= :max_price";
        $params[':max_price'] = $maxPrice;
    }
    if (!empty($availability)) {
        $where_clauses[] = "p.availability_status = :avail";
        $params[':avail'] = $availability;
    }
    if (!empty($possessionTimeline)) {
        if ($possessionTimeline === 'ready_to_move' || $possessionTimeline === '0') {
            $where_clauses[] = "(p.project_status = 'ready_possession' OR p.completion_date <= CURDATE())";
        } elseif ($possessionTimeline === '1_month') {
            $where_clauses[] = "p.completion_date <= DATE_ADD(CURDATE(), INTERVAL 1 MONTH)";
        } elseif ($possessionTimeline === '3_months') {
            $where_clauses[] = "p.completion_date <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)";
        } elseif ($possessionTimeline === '6_months') {
            $where_clauses[] = "p.completion_date <= DATE_ADD(CURDATE(), INTERVAL 6 MONTH)";
        } elseif ($possessionTimeline === '12_months') {
            $where_clauses[] = "p.completion_date <= DATE_ADD(CURDATE(), INTERVAL 12 MONTH)";
        }
    }

    // Assemble Query
    if (!empty($where_clauses)) {
        $query .= " WHERE " . implode(" AND ", $where_clauses);
    }
    
    $query .= " ORDER BY p.id DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $properties = $stmt->fetchAll();

    // Map properties and return
    echo json_encode($properties);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error listing properties", "details" => $e->getMessage()]);
}
