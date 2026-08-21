<?php
// Authentication and Authorization middleware

require_once __DIR__ . '/../utils/JwtHelper.php';

class AuthMiddleware {
    // Authenticate request and return user payload or terminate with 401
    public static function authenticate() {
        // Enforce JSON header responses
        header('Content-Type: application/json');

        $headers = getallheaders();
        $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';

        if (empty($auth_header) && isset($headers['authorization'])) {
            $auth_header = $headers['authorization'];
        }

        if (empty($auth_header)) {
            http_response_code(401);
            echo json_encode(["error" => "Access denied. Authorization token missing."]);
            exit();
        }

        // Extract Bearer token
        if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
            $token = $matches[1];
        } else {
            http_response_code(401);
            echo json_encode(["error" => "Access denied. Invalid token format."]);
            exit();
        }

        $decoded = JwtHelper::verifyToken($token);
        if (!$decoded) {
            http_response_code(401);
            echo json_encode(["error" => "Access denied. Invalid or expired token."]);
            exit();
        }

        return $decoded; // Return user array: id, username, role, branch_id
    }

    // Verify if user role is permitted
    public static function requireRole($user, $allowed_roles) {
        if (!in_array($user['role'], $allowed_roles)) {
            http_response_code(403);
            echo json_encode([
                "error" => "Forbidden. Access restricted to authorized roles.",
                "required_roles" => $allowed_roles,
                "current_role" => $user['role']
            ]);
            exit();
        }
    }

    // Enforce branch data isolation
    // Super Admin / Assistant Admin can bypass branch checks
    // Branch Admin / Executive can only access matching branch ID
    public static function enforceBranchIsolation($user, $branch_id) {
        if (in_array($user['role'], ['super_admin', 'assistant_admin'])) {
            return; // Admins bypass isolation
        }

        if ($user['branch_id'] != $branch_id) {
            http_response_code(403);
            echo json_encode(["error" => "Forbidden. Data isolation violation. You cannot access details of another branch."]);
            exit();
        }
    }
}
