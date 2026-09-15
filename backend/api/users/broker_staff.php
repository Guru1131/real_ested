<?php
// Broker Staff Sub-Account Management API

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
        try {
            // Determine parent broker ID
            $broker_id = 0;
            if ($currentUser['role'] === 'external_broker') {
                $broker_id = !empty($currentUser['parent_broker_id']) ? (int)$currentUser['parent_broker_id'] : (int)$currentUser['id'];
            } else if (in_array($currentUser['role'], ['super_admin', 'assistant_admin', 'branch_admin'])) {
                $broker_id = isset($_GET['broker_id']) ? (int)$_GET['broker_id'] : 0;
            }

            if ($broker_id <= 0) {
                http_response_code(400);
                echo json_encode(["error" => "Valid broker ID is required."]);
                exit();
            }

            // Fetch broker info (to get sub_account_limit)
            $bStmt = $db->prepare("SELECT id, username, sub_account_limit FROM users WHERE id = :id AND role = 'external_broker' AND is_deleted = 0 LIMIT 1");
            $bStmt->bindParam(':id', $broker_id);
            $bStmt->execute();
            $broker = $bStmt->fetch();

            if (!$broker) {
                http_response_code(404);
                echo json_encode(["error" => "Parent broker account not found."]);
                exit();
            }

            // Fetch staff sub-accounts
            $staffStmt = $db->prepare("SELECT id, username, email, phone, status, created_at FROM users WHERE parent_broker_id = :bid AND is_deleted = 0 ORDER BY id DESC");
            $staffStmt->bindParam(':bid', $broker_id);
            $staffStmt->execute();
            $staffMembers = $staffStmt->fetchAll();

            $limit = (int)($broker['sub_account_limit'] ?? 5);

            echo json_encode([
                "broker_id" => $broker_id,
                "broker_username" => $broker['username'],
                "sub_account_limit" => $limit,
                "sub_account_count" => count($staffMembers),
                "remaining_slots" => max(0, $limit - count($staffMembers)),
                "staff" => $staffMembers
            ]);

        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error listing staff sub-accounts", "details" => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Create staff sub-account
        $input = json_decode(file_get_contents("php://input"), true);
        $username = isset($input['username']) ? trim($input['username']) : '';
        $email = isset($input['email']) ? trim($input['email']) : '';
        $password = isset($input['password']) ? trim($input['password']) : '';
        $phone = isset($input['phone']) ? trim($input['phone']) : '';

        // Target parent broker ID
        $broker_id = 0;
        if ($currentUser['role'] === 'external_broker') {
            $broker_id = !empty($currentUser['parent_broker_id']) ? (int)$currentUser['parent_broker_id'] : (int)$currentUser['id'];
        } else if (in_array($currentUser['role'], ['super_admin', 'assistant_admin'])) {
            $broker_id = isset($input['broker_id']) ? (int)$input['broker_id'] : 0;
        }

        if ($broker_id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Parent broker ID is required to create sub-account."]);
            exit();
        }

        if (empty($username) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(["error" => "Staff username, email, and password are required."]);
            exit();
        }

        try {
            // Check broker limit
            $bStmt = $db->prepare("SELECT id, sub_account_limit FROM users WHERE id = :id AND role = 'external_broker' AND is_deleted = 0 LIMIT 1");
            $bStmt->bindParam(':id', $broker_id);
            $bStmt->execute();
            $broker = $bStmt->fetch();

            if (!$broker) {
                http_response_code(404);
                echo json_encode(["error" => "Parent broker account not found."]);
                exit();
            }

            $limit = (int)($broker['sub_account_limit'] ?? 5);

            // Count existing active staff sub-accounts
            $cStmt = $db->prepare("SELECT COUNT(*) as cnt FROM users WHERE parent_broker_id = :bid AND is_deleted = 0");
            $cStmt->bindParam(':bid', $broker_id);
            $cStmt->execute();
            $cRow = $cStmt->fetch();
            $currentCount = (int)($cRow['cnt'] ?? 0);

            if ($currentCount >= $limit) {
                http_response_code(400);
                echo json_encode([
                    "error" => "Sub-account creation limit reached. You have used {$currentCount} of {$limit} allowed staff IDs. Please contact Super Admin to upgrade your account limit."
                ]);
                exit();
            }

            // Verify duplicate username or email
            $chk = $db->prepare("SELECT id FROM users WHERE (username = :u OR email = :e) AND is_deleted = 0 LIMIT 1");
            $chk->bindParam(':u', $username);
            $chk->bindParam(':e', $email);
            $chk->execute();
            if ($chk->fetch()) {
                http_response_code(400);
                echo json_encode(["error" => "Username or email already exists in system."]);
                exit();
            }

            $password_hash = password_hash($password, PASSWORD_BCRYPT);

            $db->beginTransaction();

            // Insert staff sub-account user
            $insQuery = "INSERT INTO users (username, email, password_hash, role, branch_id, parent_broker_id, phone, status) 
                         VALUES (:username, :email, :password_hash, 'external_broker', NULL, :parent_id, :phone, 'active')";
            $insStmt = $db->prepare($insQuery);
            $insStmt->bindParam(':username', $username);
            $insStmt->bindParam(':email', $email);
            $insStmt->bindParam(':password_hash', $password_hash);
            $insStmt->bindParam(':parent_id', $broker_id);
            $insStmt->bindParam(':phone', $phone);
            $insStmt->execute();

            $staff_id = $db->lastInsertId();

            // Inherit parent broker branch assignments
            $parentAssignStmt = $db->prepare("SELECT branch_id FROM broker_branch_assignments WHERE broker_id = :pid");
            $parentAssignStmt->bindParam(':pid', $broker_id);
            $parentAssignStmt->execute();
            $parentBranches = $parentAssignStmt->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($parentBranches)) {
                $childAssignStmt = $db->prepare("INSERT INTO broker_branch_assignments (broker_id, branch_id) VALUES (:bid, :branch_id)");
                foreach ($parentBranches as $bId) {
                    $childAssignStmt->bindParam(':bid', $staff_id);
                    $childAssignStmt->bindParam(':branch_id', $bId);
                    $childAssignStmt->execute();
                }
            }

            $db->commit();

            echo json_encode([
                "message" => "Staff sub-account ID created successfully.",
                "staff_id" => (int)$staff_id,
                "sub_account_count" => $currentCount + 1,
                "sub_account_limit" => $limit
            ]);

        } catch(PDOException $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Error creating staff sub-account", "details" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Edit staff password or status
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $input = json_decode(file_get_contents("php://input"), true);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid staff ID is required."]);
            exit();
        }

        try {
            // Verify target staff sub-account
            $fetchStmt = $db->prepare("SELECT id, parent_broker_id, username FROM users WHERE id = :id AND is_deleted = 0 LIMIT 1");
            $fetchStmt->bindParam(':id', $id);
            $fetchStmt->execute();
            $targetStaff = $fetchStmt->fetch();

            if (!$targetStaff) {
                http_response_code(404);
                echo json_encode(["error" => "Staff account not found."]);
                exit();
            }

            // Authorization check
            if ($currentUser['role'] === 'external_broker') {
                $myBrokerId = !empty($currentUser['parent_broker_id']) ? (int)$currentUser['parent_broker_id'] : (int)$currentUser['id'];
                if ($targetStaff['parent_broker_id'] != $myBrokerId) {
                    http_response_code(403);
                    echo json_encode(["error" => "You can only manage your own staff sub-accounts."]);
                    exit();
                }
            }

            $phone = isset($input['phone']) ? trim($input['phone']) : null;
            $status = isset($input['status']) ? trim($input['status']) : null;
            $password = isset($input['password']) ? trim($input['password']) : null;

            $update_fields = [];
            $params = [':id' => $id];

            if ($phone !== null) {
                $update_fields[] = "phone = :phone";
                $params[':phone'] = $phone;
            }
            if ($status !== null) {
                $update_fields[] = "status = :status";
                $params[':status'] = $status;
            }
            if (!empty($password)) {
                $update_fields[] = "password_hash = :hash";
                $params[':hash'] = password_hash($password, PASSWORD_BCRYPT);
            }

            if (!empty($update_fields)) {
                $uQuery = "UPDATE users SET " . implode(", ", $update_fields) . " WHERE id = :id";
                $uStmt = $db->prepare($uQuery);
                $uStmt->execute($params);
            }

            echo json_encode(["message" => "Staff sub-account updated successfully."]);

        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error updating staff account", "details" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Delete staff sub-account
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid staff ID is required."]);
            exit();
        }

        try {
            $fetchStmt = $db->prepare("SELECT id, parent_broker_id FROM users WHERE id = :id AND is_deleted = 0 LIMIT 1");
            $fetchStmt->bindParam(':id', $id);
            $fetchStmt->execute();
            $targetStaff = $fetchStmt->fetch();

            if (!$targetStaff) {
                http_response_code(404);
                echo json_encode(["error" => "Staff account not found."]);
                exit();
            }

            // Authorization check
            if ($currentUser['role'] === 'external_broker') {
                $myBrokerId = !empty($currentUser['parent_broker_id']) ? (int)$currentUser['parent_broker_id'] : (int)$currentUser['id'];
                if ($targetStaff['parent_broker_id'] != $myBrokerId) {
                    http_response_code(403);
                    echo json_encode(["error" => "You can only delete your own staff sub-accounts."]);
                    exit();
                }
            }

            $delStmt = $db->prepare("UPDATE users SET is_deleted = 1, status = 'inactive' WHERE id = :id");
            $delStmt->bindParam(':id', $id);
            $delStmt->execute();

            echo json_encode(["message" => "Staff sub-account deleted successfully."]);

        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error deleting staff sub-account", "details" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed."]);
        break;
}
