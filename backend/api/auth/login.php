<?php
// User Login API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/JwtHelper.php';

header('Content-Type: application/json');

// Read JSON input
$input = json_decode(file_get_contents("php://input"), true);
$username = isset($input['username']) ? trim($input['username']) : '';
$password = isset($input['password']) ? trim($input['password']) : '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(["error" => "Username and password are required."]);
    exit();
}

$database = new Database();
$db = $database->getConnection();

try {
    // Fetch active and non-deleted user
    $query = "SELECT id, username, email, password_hash, role, branch_id, status, is_deleted 
              FROM users 
              WHERE username = :username AND is_deleted = 0 LIMIT 1";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':username', $username);
    $stmt->execute();
    
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid username or password."]);
        exit();
    }
    
    // Check if account is active
    if ($user['status'] !== 'active') {
        http_response_code(403);
        echo json_encode(["error" => "Your account is deactivated. Please contact your administrator."]);
        exit();
    }
    
    // Log login event if role is external broker
    if ($user['role'] === 'external_broker') {
        $log_query = "INSERT INTO broker_activity_logs (broker_id, activity_type, metadata) 
                      VALUES (:broker_id, 'login', :metadata)";
        $log_stmt = $db->prepare($log_query);
        $metadata = json_encode([
            "ip" => $_SERVER['REMOTE_ADDR'],
            "user_agent" => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'Unknown'
        ]);
        $log_stmt->bindParam(':broker_id', $user['id']);
        $log_stmt->bindParam(':metadata', $metadata);
        $log_stmt->execute();
    }
    
    // Generate JWT
    $payload = [
        "id" => (int)$user['id'],
        "username" => $user['username'],
        "email" => $user['email'],
        "role" => $user['role'],
        "branch_id" => $user['branch_id'] ? (int)$user['branch_id'] : null
    ];
    
    $token = JwtHelper::generateToken($payload);
    
    echo json_encode([
        "message" => "Login successful",
        "token" => $token,
        "user" => [
            "id" => (int)$user['id'],
            "username" => $user['username'],
            "email" => $user['email'],
            "role" => $user['role'],
            "branch_id" => $user['branch_id'] ? (int)$user['branch_id'] : null
        ]
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error during login", "details" => $e->getMessage()]);
}
