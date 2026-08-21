<?php
// User Management API (Internal Staff & General CRUD)

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Only Admins (Super Admin, Assistant Admin, Branch Admin) can manage users
AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin', 'branch_admin']);

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            // Get all non-deleted, non-super-admin users
            if (in_array($currentUser['role'], ['super_admin', 'assistant_admin'])) {
                $query = "SELECT u.id, u.username, u.email, u.role, u.branch_id, u.phone, u.status, b.name as branch_name 
                          FROM users u
                          LEFT JOIN branches b ON u.branch_id = b.id
                          WHERE u.is_deleted = 0 AND u.role != 'super_admin'
                          ORDER BY u.id DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $users = $stmt->fetchAll();
            } else {
                // Branch Admin can only see users of their own branch OR brokers assigned to their branch
                $branch_id = $currentUser['branch_id'];
                $query = "SELECT DISTINCT u.id, u.username, u.email, u.role, u.branch_id, u.phone, u.status, b.name as branch_name 
                          FROM users u
                          LEFT JOIN branches b ON u.branch_id = b.id
                          LEFT JOIN broker_branch_assignments ba ON u.id = ba.broker_id
                          WHERE u.is_deleted = 0 
                            AND u.role != 'super_admin' 
                            AND (u.branch_id = :branch_id OR ba.branch_id = :branch_id2)
                          ORDER BY u.id DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':branch_id', $branch_id);
                $stmt->bindParam(':branch_id2', $branch_id);
                $stmt->execute();
                $users = $stmt->fetchAll();
            }
            
            echo json_encode($users);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error listing users", "details" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $username = isset($input['username']) ? trim($input['username']) : '';
        $email = isset($input['email']) ? trim($input['email']) : '';
        $password = isset($input['password']) ? trim($input['password']) : '';
        $role = isset($input['role']) ? trim($input['role']) : '';
        $branch_id = isset($input['branch_id']) ? (int)$input['branch_id'] : null;
        $phone = isset($input['phone']) ? trim($input['phone']) : '';
        
        if (empty($username) || empty($email) || empty($password) || empty($role)) {
            http_response_code(400);
            echo json_encode(["error" => "Username, email, password, and role are required."]);
            exit();
        }

        // Branch Admin isolation rule: can only create Branch Executive or External Broker for their own branch
        if ($currentUser['role'] === 'branch_admin') {
            if (!in_array($role, ['branch_executive', 'external_broker'])) {
                http_response_code(403);
                echo json_encode(["error" => "Branch Admins can only create executives or external brokers."]);
                exit();
            }
            // Force branch ID to match Branch Admin's branch
            if ($role === 'branch_executive') {
                $branch_id = $currentUser['branch_id'];
            }
        }
        
        try {
            // Check username/email duplicates
            $check_query = "SELECT id FROM users WHERE (username = :username OR email = :email) AND is_deleted = 0 LIMIT 1";
            $check_stmt = $db->prepare($check_query);
            $check_stmt->bindParam(':username', $username);
            $check_stmt->bindParam(':email', $email);
            $check_stmt->execute();
            if ($check_stmt->fetch()) {
                http_response_code(400);
                echo json_encode(["error" => "Username or Email already exists."]);
                exit();
            }

            $password_hash = password_hash($password, PASSWORD_BCRYPT);
            
            // Start transaction in case of broker assignments
            $db->beginTransaction();

            $query = "INSERT INTO users (username, email, password_hash, role, branch_id, phone, status) 
                      VALUES (:username, :email, :password_hash, :role, :branch_id, :phone, 'active')";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':password_hash', $password_hash);
            $stmt->bindParam(':role', $role);
            
            // Set branch_id to null for brokers and super/assistant admins
            $actual_branch_id = in_array($role, ['super_admin', 'assistant_admin', 'external_broker']) ? null : $branch_id;
            $stmt->bindValue(':branch_id', $actual_branch_id, $actual_branch_id === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $stmt->bindParam(':phone', $phone);
            $stmt->execute();
            
            $new_user_id = $db->lastInsertId();

            // If creating a broker and branch was provided (e.g. Branch Admin creating a broker assigned to their branch)
            if ($role === 'external_broker' && $branch_id) {
                $assign_query = "INSERT INTO broker_branch_assignments (broker_id, branch_id) VALUES (:broker_id, :branch_id)";
                $assign_stmt = $db->prepare($assign_query);
                $assign_stmt->bindParam(':broker_id', $new_user_id);
                $assign_stmt->bindParam(':branch_id', $branch_id);
                $assign_stmt->execute();
            }
            
            $db->commit();

            echo json_encode([
                "message" => "User created successfully",
                "user" => [
                    "id" => (int)$new_user_id,
                    "username" => $username,
                    "email" => $email,
                    "role" => $role,
                    "branch_id" => $actual_branch_id,
                    "phone" => $phone
                ]
            ]);

        } catch(PDOException $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Error creating user", "details" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $input = json_decode(file_get_contents("php://input"), true);
        
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid user ID is required."]);
            exit();
        }

        try {
            // Fetch target user
            $fetch_query = "SELECT id, role, branch_id FROM users WHERE id = :id AND is_deleted = 0 LIMIT 1";
            $fetch_stmt = $db->prepare($fetch_query);
            $fetch_stmt->bindParam(':id', $id);
            $fetch_stmt->execute();
            $targetUser = $fetch_stmt->fetch();
            
            if (!$targetUser) {
                http_response_code(404);
                echo json_encode(["error" => "User not found."]);
                exit();
            }

            // Protect Super Admin account
            if ($targetUser['role'] === 'super_admin') {
                // Only Super Admin themselves can edit their profile
                if ($currentUser['role'] !== 'super_admin' || $currentUser['id'] !== $id) {
                    http_response_code(403);
                    echo json_encode(["error" => "Super Admin profile can only be edited by themselves."]);
                    exit();
                }
            }

            // Branch Admin isolation rule: can only update staff of their own branch or brokers assigned to them
            if ($currentUser['role'] === 'branch_admin') {
                if ($targetUser['role'] === 'external_broker') {
                    // Check assignment
                    $check_assign = "SELECT id FROM broker_branch_assignments WHERE broker_id = :broker_id AND branch_id = :branch_id LIMIT 1";
                    $ca_stmt = $db->prepare($check_assign);
                    $ca_stmt->bindParam(':broker_id', $id);
                    $ca_stmt->bindParam(':branch_id', $currentUser['branch_id']);
                    $ca_stmt->execute();
                    if (!$ca_stmt->fetch()) {
                        http_response_code(403);
                        echo json_encode(["error" => "You are not authorized to manage this broker."]);
                        exit();
                    }
                } else {
                    // Internal employee: must match branch ID
                    if ($targetUser['branch_id'] != $currentUser['branch_id']) {
                        http_response_code(403);
                        echo json_encode(["error" => "You are not authorized to manage staff of other branches."]);
                        exit();
                    }
                }
            }

            // Perform Update
            $phone = isset($input['phone']) ? trim($input['phone']) : null;
            $status = isset($input['status']) ? trim($input['status']) : null;
            $password = isset($input['password']) ? trim($input['password']) : '';

            $update_fields = [];
            $params = [':id' => $id];

            if ($phone !== null) {
                $update_fields[] = "phone = :phone";
                $params[':phone'] = $phone;
            }
            if ($status !== null) {
                // Prevent deactivating own account
                if ($currentUser['id'] === $id && $status === 'inactive') {
                    http_response_code(400);
                    echo json_encode(["error" => "You cannot deactivate your own account."]);
                    exit();
                }
                $update_fields[] = "status = :status";
                $params[':status'] = $status;
            }
            if (!empty($password)) {
                $update_fields[] = "password_hash = :password_hash";
                $params[':password_hash'] = password_hash($password, PASSWORD_BCRYPT);
            }

            if (empty($update_fields)) {
                http_response_code(400);
                echo json_encode(["error" => "No fields to update provided."]);
                exit();
            }

            $query = "UPDATE users SET " . implode(", ", $update_fields) . " WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->execute($params);
            
            echo json_encode(["message" => "User updated successfully."]);

        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error updating user", "details" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid user ID is required."]);
            exit();
        }

        try {
            // Fetch target user
            $fetch_query = "SELECT id, role, branch_id FROM users WHERE id = :id AND is_deleted = 0 LIMIT 1";
            $fetch_stmt = $db->prepare($fetch_query);
            $fetch_stmt->bindParam(':id', $id);
            $fetch_stmt->execute();
            $targetUser = $fetch_stmt->fetch();
            
            if (!$targetUser) {
                http_response_code(404);
                echo json_encode(["error" => "User not found."]);
                exit();
            }

            // Protect Super Admin from being deleted
            if ($targetUser['role'] === 'super_admin') {
                http_response_code(403);
                echo json_encode(["error" => "Super Admin account cannot be deleted."]);
                exit();
            }

            // Prevent self-deletion
            if ($currentUser['id'] === $id) {
                http_response_code(400);
                echo json_encode(["error" => "You cannot delete your own account."]);
                exit();
            }

            // Branch Admin isolation check
            if ($currentUser['role'] === 'branch_admin') {
                if ($targetUser['role'] === 'external_broker') {
                    // Check assignment
                    $check_assign = "SELECT id FROM broker_branch_assignments WHERE broker_id = :broker_id AND branch_id = :branch_id LIMIT 1";
                    $ca_stmt = $db->prepare($check_assign);
                    $ca_stmt->bindParam(':broker_id', $id);
                    $ca_stmt->bindParam(':branch_id', $currentUser['branch_id']);
                    $ca_stmt->execute();
                    if (!$ca_stmt->fetch()) {
                        http_response_code(403);
                        echo json_encode(["error" => "You are not authorized to delete this broker."]);
                        exit();
                    }
                } else {
                    if ($targetUser['branch_id'] != $currentUser['branch_id']) {
                        http_response_code(403);
                        echo json_encode(["error" => "You are not authorized to delete staff of other branches."]);
                        exit();
                    }
                }
            }

            // Soft-deactivate user instead of hard delete
            $query = "UPDATE users SET is_deleted = 1, status = 'inactive' WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            echo json_encode(["message" => "User soft-deleted successfully."]);

        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error deleting user", "details" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed."]);
        break;
}
