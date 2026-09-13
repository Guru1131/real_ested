<?php
// Soft-delete Property API (PHP Endpoint)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

$currentUser = AuthMiddleware::authenticate();
AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin', 'branch_admin']);

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    if (isset($_SERVER['PATH_INFO']) && preg_match('/^\/(\d+)/', $_SERVER['PATH_INFO'], $m)) {
        $id = (int)$m[1];
    } elseif (isset($_SERVER['REQUEST_URI']) && preg_match('/\/(\d+)(?:\?|$)/', $_SERVER['REQUEST_URI'], $m)) {
        $id = (int)$m[1];
    }
}

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Valid property ID is required."]);
    exit();
}

try {
    $stmt = $db->prepare("SELECT branch_id FROM properties WHERE id = :id AND is_deleted = 0 LIMIT 1");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    $prop = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$prop) {
        http_response_code(404);
        echo json_encode(["error" => "Property not found."]);
        exit();
    }

    if ($currentUser['role'] === 'branch_admin') {
        AuthMiddleware::enforceBranchIsolation($currentUser, $prop['branch_id']);
    }

    $uStmt = $db->prepare("UPDATE properties SET is_deleted = 1 WHERE id = :id");
    $uStmt->bindParam(':id', $id);
    $uStmt->execute();

    echo json_encode(["message" => "Property listing deleted successfully."]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error deleting property", "details" => $e->getMessage()]);
}
