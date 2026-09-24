<?php
// Marquee Announcements API (Targeted Notifications & Admin Management)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

$database = new Database();
$db = $database->getConnection();

// Ensure announcements table exists
try {
    $create_table = "CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message TEXT NOT NULL,
        target_audience VARCHAR(50) DEFAULT 'all',
        theme VARCHAR(20) DEFAULT 'warning',
        is_active TINYINT(1) DEFAULT 1,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;";
    $db->exec($create_table);
} catch (PDOException $e) {}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        try {
            if ($action === 'admin') {
                AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin']);
                $query = "SELECT a.*, u.username as created_by_user 
                          FROM announcements a 
                          LEFT JOIN users u ON a.created_by = u.id 
                          ORDER BY a.id DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            } else {
                // Fetch active announcements matching current user role
                $userRole = $currentUser['role'];
                $isStaff = in_array($userRole, ['branch_admin', 'branch_executive']);
                
                $query = "SELECT id, message, target_audience, theme, is_active, created_at 
                          FROM announcements 
                          WHERE is_active = 1 
                            AND (
                              target_audience = 'all' 
                              OR target_audience = :role 
                              OR (:is_staff = 1 AND target_audience = 'staff')
                            )
                          ORDER BY id DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':role', $userRole);
                $stmt->bindValue(':is_staff', $isStaff ? 1 : 0, PDO::PARAM_INT);
                $stmt->execute();
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            }
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error retrieving announcements", "details" => $e->getMessage()]);
        }
        break;

    case 'POST':
        AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin']);
        $input = json_decode(file_get_contents("php://input"), true);
        $message = isset($input['message']) ? trim($input['message']) : '';
        $target_audience = isset($input['target_audience']) ? trim($input['target_audience']) : 'all';
        $theme = isset($input['theme']) ? trim($input['theme']) : 'warning';
        $is_active = isset($input['is_active']) && ($input['is_active'] === false || $input['is_active'] === 0) ? 0 : 1;

        if (empty($message)) {
            http_response_code(400);
            echo json_encode(["error" => "Announcement message is required."]);
            exit();
        }

        $created_by = isset($currentUser['id']) ? (int)$currentUser['id'] : (isset($currentUser['user_id']) ? (int)$currentUser['user_id'] : 1);

        try {
            $query = "INSERT INTO announcements (message, target_audience, theme, is_active, created_by) 
                      VALUES (:message, :target_audience, :theme, :is_active, :created_by)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':message', $message);
            $stmt->bindParam(':target_audience', $target_audience);
            $stmt->bindParam(':theme', $theme);
            $stmt->bindParam(':is_active', $is_active, PDO::PARAM_INT);
            $stmt->bindParam(':created_by', $created_by, PDO::PARAM_INT);
            $stmt->execute();

            echo json_encode(["message" => "Announcement broadcast created successfully.", "announcementId" => (int)$db->lastInsertId()]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error creating announcement: " . $e->getMessage()]);
        }
        break;

    case 'PUT':
        AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin']);
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $input = json_decode(file_get_contents("php://input"), true);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid announcement ID required."]);
            exit();
        }

        try {
            $updates = [];
            $params = [':id' => $id];

            if (isset($input['message'])) {
                $updates[] = "message = :message";
                $params[':message'] = trim($input['message']);
            }
            if (isset($input['target_audience'])) {
                $updates[] = "target_audience = :target_audience";
                $params[':target_audience'] = trim($input['target_audience']);
            }
            if (isset($input['theme'])) {
                $updates[] = "theme = :theme";
                $params[':theme'] = trim($input['theme']);
            }
            if (isset($input['is_active'])) {
                $updates[] = "is_active = :is_active";
                $params[':is_active'] = $input['is_active'] ? 1 : 0;
            }

            if (!empty($updates)) {
                $query = "UPDATE announcements SET " . implode(", ", $updates) . " WHERE id = :id";
                $stmt = $db->prepare($query);
                $stmt->execute($params);
            }

            echo json_encode(["message" => "Announcement updated successfully."]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error updating announcement", "details" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin']);
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid announcement ID required."]);
            exit();
        }

        try {
            $query = "DELETE FROM announcements WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            echo json_encode(["message" => "Announcement deleted successfully."]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error deleting announcement", "details" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed."]);
        break;
}
