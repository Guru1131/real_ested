<?php
// External Broker Management Sub-module API

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

header('Content-Type: application/json');

// Authenticate user
$currentUser = AuthMiddleware::authenticate();

// Admin roles only (Super Admin, Assistant Admin, Branch Admin)
AuthMiddleware::requireRole($currentUser, ['super_admin', 'assistant_admin', 'branch_admin']);

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            if (in_array($currentUser['role'], ['super_admin', 'assistant_admin'])) {
                // Fetch all external brokers
                $query = "SELECT u.id, u.username, u.email, u.phone, u.status, u.created_at 
                          FROM users u 
                          WHERE u.role = 'external_broker' AND u.is_deleted = 0 
                          ORDER BY u.id DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $brokers = $stmt->fetchAll();
            } else {
                // Branch Admin: only brokers assigned to their branch
                $branch_id = $currentUser['branch_id'];
                $query = "SELECT u.id, u.username, u.email, u.phone, u.status, u.created_at 
                          FROM users u 
                          JOIN broker_branch_assignments ba ON u.id = ba.broker_id
                          WHERE u.role = 'external_broker' AND u.is_deleted = 0 AND ba.branch_id = :branch_id
                          ORDER BY u.id DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':branch_id', $branch_id);
                $stmt->execute();
                $brokers = $stmt->fetchAll();
            }

            // Fetch assignments for each broker
            foreach ($brokers as &$broker) {
                $assign_query = "SELECT b.id, b.name, b.code 
                                 FROM branches b
                                 JOIN broker_branch_assignments ba ON b.id = ba.branch_id
                                 WHERE ba.broker_id = :broker_id AND b.is_deleted = 0";
                $assign_stmt = $db->prepare($assign_query);
                $assign_stmt->bindParam(':broker_id', $broker['id']);
                $assign_stmt->execute();
                $broker['branches'] = $assign_stmt->fetchAll();
            }

            echo json_encode($brokers);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error listing brokers", "details" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $username = isset($input['username']) ? trim($input['username']) : '';
        $email = isset($input['email']) ? trim($input['email']) : '';
        $password = isset($input['password']) ? trim($input['password']) : '';
        $phone = isset($input['phone']) ? trim($input['phone']) : '';
        $branchIds = isset($input['branchIds']) ? $input['branchIds'] : []; // Array of branch IDs

        if (empty($username) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(["error" => "Username, email, and password are required."]);
            exit();
        }

        // Branch Admin isolation rule
        if ($currentUser['role'] === 'branch_admin') {
            // Force broker to only be assigned to their own branch
            $branchIds = [$currentUser['branch_id']];
        }

        if (empty($branchIds)) {
            http_response_code(400);
            echo json_encode(["error" => "Broker must be assigned to at least one branch."]);
            exit();
        }

        try {
            // Verify duplicates
            $check = "SELECT id FROM users WHERE (username = :username OR email = :email) AND is_deleted = 0 LIMIT 1";
            $chk_stmt = $db->prepare($check);
            $chk_stmt->bindParam(':username', $username);
            $chk_stmt->bindParam(':email', $email);
            $chk_stmt->execute();
            if ($chk_stmt->fetch()) {
                http_response_code(400);
                echo json_encode(["error" => "Username or Email already exists."]);
                exit();
            }

            $password_hash = password_hash($password, PASSWORD_BCRYPT);

            $db->beginTransaction();

            // Insert broker user (branch_id is null for brokers, mappings are in assignments)
            $query = "INSERT INTO users (username, email, password_hash, role, branch_id, phone, status) 
                      VALUES (:username, :email, :password_hash, 'external_broker', NULL, :phone, 'active')";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':password_hash', $password_hash);
            $stmt->bindParam(':phone', $phone);
            $stmt->execute();

            $broker_id = $db->lastInsertId();

            // Create assignments
            $assign_query = "INSERT INTO broker_branch_assignments (broker_id, branch_id) VALUES (:broker_id, :branch_id)";
            $assign_stmt = $db->prepare($assign_query);

            foreach ($branchIds as $bId) {
                // Ensure branch exists and is not deleted
                $chk_branch = "SELECT id FROM branches WHERE id = :bId AND is_deleted = 0 LIMIT 1";
                $cb_stmt = $db->prepare($chk_branch);
                $cb_stmt->bindParam(':bId', $bId);
                $cb_stmt->execute();
                if ($cb_stmt->fetch()) {
                    $assign_stmt->bindParam(':broker_id', $broker_id);
                    $assign_stmt->bindParam(':branch_id', $bId);
                    $assign_stmt->execute();
                }
            }

            $db->commit();

            echo json_encode(["message" => "External Broker account created successfully.", "broker_id" => (int)$broker_id]);

        } catch(PDOException $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Error creating broker user", "details" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $input = json_decode(file_get_contents("php://input"), true);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Valid broker ID is required."]);
            exit();
        }

        try {
            // Fetch target broker
            $fetch_query = "SELECT id, role, status FROM users WHERE id = :id AND role = 'external_broker' AND is_deleted = 0 LIMIT 1";
            $fetch_stmt = $db->prepare($fetch_query);
            $fetch_stmt->bindParam(':id', $id);
            $fetch_stmt->execute();
            $broker = $fetch_stmt->fetch();

            if (!$broker) {
                http_response_code(404);
                echo json_encode(["error" => "Broker not found."]);
                exit();
            }

            // Branch Admin isolation rule: must have assignment to branch admin's branch to edit
            if ($currentUser['role'] === 'branch_admin') {
                $check_assign = "SELECT id FROM broker_branch_assignments WHERE broker_id = :broker_id AND branch_id = :branch_id LIMIT 1";
                $ca_stmt = $db->prepare($check_assign);
                $ca_stmt->bindParam(':broker_id', $id);
                $ca_stmt->bindParam(':branch_id', $currentUser['branch_id']);
                $ca_stmt->execute();
                if (!$ca_stmt->fetch()) {
                    http_response_code(403);
                    echo json_encode(["error" => "You are not authorized to update this broker."]);
                    exit();
                }
            }

            $phone = isset($input['phone']) ? trim($input['phone']) : null;
            $status = isset($input['status']) ? trim($input['status']) : null;
            $branchIds = isset($input['branchIds']) ? $input['branchIds'] : null; // Array of branch IDs

            $db->beginTransaction();

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

            if (!empty($update_fields)) {
                $query = "UPDATE users SET " . implode(", ", $update_fields) . " WHERE id = :id";
                $stmt = $db->prepare($query);
                $stmt->execute($params);
            }

            // Update branch assignments (Super Admin and Assistant Admin only can re-assign branches completely)
            if ($branchIds !== null) {
                if (in_array($currentUser['role'], ['super_admin', 'assistant_admin'])) {
                    // Delete old assignments
                    $del_query = "DELETE FROM broker_branch_assignments WHERE broker_id = :broker_id";
                    $del_stmt = $db->prepare($del_query);
                    $del_stmt->bindParam(':broker_id', $id);
                    $del_stmt->execute();

                    // Re-insert new assignments
                    $ins_query = "INSERT INTO broker_branch_assignments (broker_id, branch_id) VALUES (:broker_id, :branch_id)";
                    $ins_stmt = $db->prepare($ins_query);
                    foreach ($branchIds as $bId) {
                        $ins_stmt->bindParam(':broker_id', $id);
                        $ins_stmt->bindParam(':branch_id', $bId);
                        $ins_stmt->execute();
                    }
                }
            }

            $db->commit();

            echo json_encode(["message" => "Broker updated successfully."]);

        } catch(PDOException $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Error updating broker details", "details" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed."]);
        break;
}
