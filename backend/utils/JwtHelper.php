<?php
// Native JWT implementation for session tokens

class JwtHelper {
    private static $secret_key = "property_sales_management_system_super_secret_jwt_key_98765";

    // Helper: Base64Url Encode
    private static function base64UrlEncode($data) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    // Helper: Base64Url Decode
    private static function base64UrlDecode($data) {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }

    // Generate JWT Token
    public static function generateToken($payload, $expiry_seconds = 86400) {
        $header = json_encode([
            "alg" => "HS256",
            "typ" => "JWT"
        ]);

        // Add standard claims
        $payload['iat'] = time();
        $payload['exp'] = time() + $expiry_seconds;

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));

        // Create Signature
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret_key, true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    // Decode and verify JWT Token
    public static function verifyToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

        // Verify Signature
        $signature = self::base64UrlDecode($base64UrlSignature);
        $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret_key, true);

        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }

        // Decode Payload
        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);

        // Verify Expiry
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false; // Token expired
        }

        return $payload;
    }
}
