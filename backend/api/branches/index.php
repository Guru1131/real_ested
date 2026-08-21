<?php
// Branch Management CRUD API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Allow Super Admin, Assistant Admin, and Branch Admin to list branches
        AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin', 'branch_admin']);
        
        try {
            $query = "SELECT id, name, code, city, address, created_at 
                      FROM branches 
                      WHERE is_deleted = 0 
                      ORDER BY name ASC";
            $stmt = $db->prepare($query);
            $stmt->execute();
            $branches = $stmt->fetchAll();
            
            echo json_encode($branches);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error listing branches", "details" => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Super Admin only can create branches
        AuthMiddleware::requireRole($currentUser, ['super_admin']);
        
        $input = json_decode(file_get_contents("php://input"), true);
        $name = isset($input['name']) ? trim($input['name']) : '';
        $code = isset($input['code']) ? trim($input['code']) : '';
        $city = isset($input['city']) ? trim($input['city']) : '';
        $address = isset($input['address']) ? trim($input['address']) : '';
        
        if (empty($name) || empty($code) || empty($city)) {
            http_response_code(400);
            echo json_encode(["error" => "Name, unique code, and city are required."]);
            exit();
        }
        
        try {
            // Check for duplicate branch code
            $check_query = "SELECT id FROM branches WHERE code = :code AND is_deleted = 0 LIMIT 1";
            $check_stmt = $db->prepare($check_query);
            $check_stmt->bindParam(':code', $code);
            $check_stmt->execute();
            if ($check_stmt->fetch()) {
                http_response_code(400);
                echo json_encode(["error" => "Branch code already exists."]);
                exit();
            }

            $query = "INSERT INTO branches (name, code, city, address) VALUES (:name, :code, :city, :address)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':code', $code);
            $stmt->bindParam(':city', $city);
            $stmt->bindParam(':address', $address);
            $stmt->execute();
            
            $new_id = $db->lastInsertId();
            
            echo json_encode([
                "message" => "Branch created successfully",
                "branch" => [
                    "id" => (int)$new_id,
                    "name" => $name,
                    "code" => $code,
                    "city" => $city,
                    "address" => $address
                ]
            ]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error creating branch", "details" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Super Admin only can update branches
        AuthMiddleware::requireRole($currentUser, ['super_admin']);
        
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $input = json_decode(file_get_contents("php://input"), true);
        
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid branch ID is required."]);
            exit();
        }
        
        $name = isset($input['name']) ? trim($input['name']) : '';
        $code = isset($input['code']) ? trim($input['code']) : '';
        $city = isset($input['city']) ? trim($input['city']) : '';
        $address = isset($input['address']) ? trim($input['address']) : '';
        
        if (empty($name) || empty($code) || empty($city)) {
            http_response_code(400);
            echo json_encode(["error" => "Name, unique code, and city are required."]);
            exit();
        }
        
        try {
            // Check duplicate code excluding current ID
            $check_query = "SELECT id FROM branches WHERE code = :code AND id != :id AND is_deleted = 0 LIMIT 1";
            $check_stmt = $db->prepare($check_query);
            $check_stmt->bindParam(':code', $code);
            $check_stmt->bindParam(':id', $id);
            $check_stmt->execute();
            if ($check_stmt->fetch()) {
                http_response_code(400);
                echo json_encode(["error" => "Branch code already in use by another branch."]);
                exit();
            }

            $query = "UPDATE branches SET name = :name, code = :code, city = :city, address = :address WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':code', $code);
            $stmt->bindParam(':city', $city);
            $stmt->bindParam(':address', $address);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            echo json_encode(["message" => "Branch updated successfully"]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error updating branch", "details" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Super Admin only can delete branches (soft delete)
        AuthMiddleware::requireRole($currentUser, ['super_admin']);
        
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid branch ID is required."]);
            exit();
        }
        
        try {
            $query = "UPDATE branches SET is_deleted = 1 WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            echo json_encode(["message" => "Branch soft-deleted successfully"]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error deleting branch", "details" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed."]);
        break;
}
