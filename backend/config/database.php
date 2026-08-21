<?php
// MySQL database connection configuration using PDO

class Database {
    private $host = "localhost";
    private $db_name = "property_mgmt_db";
    private $username = "root";
    private $password = ""; // Default XAMPP password is empty
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            // Set DSN
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            
            // Create PDO instance
            $this->conn = new PDO($dsn, $this->username, $this->password);
            
            // Set error mode to exception
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Fetch associative arrays by default
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
        } catch(PDOException $exception) {
            // Return JSON error response if connection fails
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                "error" => "Database connection failed",
                "message" => $exception->getMessage()
            ]);
            exit();
        }
        return $this->conn;
    }
}
