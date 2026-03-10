const fs = require('fs');
let code = fs.readFileSync('inc/seller-auth-api.php', 'utf8');

// The duplicate add_action
code = code.replace(/add_action\('rest_api_init', function \(\) \{\s*error_log\('ShopX: REST Routes initialization attempt'\);\s*register_rest_route\('shopx\/v1', '\/seller\/login', array\(\s*'methods' => 'POST',\s*'permission_callback' => '__return_true',\s*'callback' => 'shopx_bridge_v2_seller_login',\s*\)\);\s*\}\);\s*/, '');

const utils = `
// ── JWT Utilities ─────────────────────────────────────────────────────────────
function shopx_bridge_v2_authenticate_token(WP_REST_Request $request) {
    $vendor_id = shopx_bridge_v2_get_vendor_id_from_request($request);
    return $vendor_id > 0;
}

function shopx_bridge_v2_get_vendor_id_from_request(WP_REST_Request $request) {
    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    }

    if (!empty($auth_header) && preg_match('/Bearer\\s+(.+)$/i', $auth_header, $m)) {
        $raw_token = $m[1];
        $parts = explode('.', $raw_token);
        if (count($parts) === 3) {
            $payload_json = base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4, '=', STR_PAD_RIGHT));
            $payload = json_decode($payload_json, true);

            $secret_key = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : '';
            if (!empty($secret_key)) {
                $expected_sig = shopx_bridge_v2_jwt_base64url(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret_key, true));
                if (!hash_equals($expected_sig, $parts[2])) {
                    return 0; // Invalid signature
                }
                if (isset($payload['exp']) && $payload['exp'] < time()) {
                    return 0; // Token expired
                }
            }
            return isset($payload['data']['user']['id']) ? intval($payload['data']['user']['id']) : 0;
        }
    }
    return 0;
}
`;

// Inject before outputting get_product
code = code.replace('// ── Seller Product Fetch (GET) ────────────────────────────────────────────────', utils + '\n// ── Seller Product Fetch (GET) ────────────────────────────────────────────────');

fs.writeFileSync('inc/seller-auth-api.php', code, 'utf8');
console.log('Fixed JWT utils.');
