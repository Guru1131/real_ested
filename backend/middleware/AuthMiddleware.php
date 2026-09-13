<?php
// Authentication and Authorization middleware

require_once __DIR__ . '/../utils/JwtHelper.php';

class AuthMiddleware {
    // Authenticate request and return user payload or terminate with 401
    public static function authenticate() {
        // Enforce JSON header responses
        header('Content-Type: application/json');

        $auth_header = '';

        // Extract Authorization header across various web server configurations (Apache, FastCGI, Nginx, cPanel)
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $key => $val) {
                    if (strtolower($key) === 'authorization') {
                        $auth_header = $val;
                        break;
                    }
                }
            }
        }

        if (empty($auth_header) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (is_array($headers)) {
                foreach ($headers as $key => $val) {
                    if (strtolower($key) === 'authorization') {
                        $auth_header = $val;
                        break;
                    }
                }
            }
        }

        if (empty($auth_header)) {
            http_response_code(401);
            echo json_encode(["error" => "Access denied. Authorization token missing."]);
            exit();
        }

        // Extract Bearer token string
        if (preg_match('/Bearer\s(\S+)/i', $auth_header, $matches)) {
            $token = $matches[1];
        } else {
            $token = trim($auth_header);
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
