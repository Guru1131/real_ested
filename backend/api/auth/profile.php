<?php
// Get User Profile API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

$database = new Database();
$db = $database->getConnection();

try {
    // Fetch full user details from database
    $query = "SELECT u.id, u.username, u.email, u.role, u.branch_id, u.phone, u.status, b.name as branch_name 
              FROM users u
              LEFT JOIN branches b ON u.branch_id = b.id
              WHERE u.id = :id AND u.is_deleted = 0 LIMIT 1";
              
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $currentUser['id']);
    $stmt->execute();
    
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User profile not found."]);
        exit();
    }
    
    echo json_encode([
        "user" => [
            "id" => (int)$user['id'],
            "username" => $user['username'],
            "email" => $user['email'],
            "role" => $user['role'],
            "branch_id" => $user['branch_id'] ? (int)$user['branch_id'] : null,
            "branch_name" => $user['branch_name'],
            "phone" => $user['phone'],
            "status" => $user['status']
        ]
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error retrieving profile", "details" => $e->getMessage()]);
}
