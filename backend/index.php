<?php
// Property Sales & Rental Management System - Backend API Status

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/database.php';

header('Content-Type: application/json');

$database = new Database();
$db_status = "Disconnected";
$message = "";

try {
    $conn = $database->getConnection();
    if ($conn) {
        $db_status = "Connected";
        $message = "Database connection established successfully.";
    }
} catch (Exception $e) {
    $message = "Database connection error: " . $e->getMessage();
}

echo json_encode([
    "app_name" => "Property Sales & Rental Management System - API Service",
    "version" => "1.0.0",
    "status" => "Healthy",
    "database" => [
        "status" => $db_status,
        "message" => $message
    ],
    "server_time" => date("Y-m-d H:i:s")
]);
