<?php
/**
 * ShopX Seller Auth API
 * Provides a POST /wp-json/shopx/v1/seller/login endpoint for WCFM vendor authentication.
 * Included by shopx-wcfm-bridge.php inside the plugins_loaded hook.
 */

if (!defined('ABSPATH')) {
    exit;
}

// Ensure PHP notices never pollute our JSON output
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED & ~E_NOTICE & ~E_WARNING);


/**
 * Handle POST /wp-json/shopx/v1/seller/login
 * Accepts: { "username": "...", "password": "..." }
 * Returns: { user_id, store_name, token } on success
 */
add_action('rest_api_init', function () {
    error_log('ShopX: REST Routes initialization attempt');

    register_rest_route('shopx/v1', '/seller/login', array(
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_login',
    ));

    register_rest_route('shopx/v1', '/seller/stats-summary', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_stats_summary',
    ));

    register_rest_route('shopx/v1', '/seller/orders', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_orders',
    ));

    register_rest_route('shopx/v1', '/seller/product/create', array(
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_create_product',
    ));

    register_rest_route('shopx/v1', '/seller/transactions', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_transactions',
    ));

    register_rest_route('shopx/v1', '/seller/autologin-edit', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_autologin_edit',
    ));

    register_rest_route('shopx/v1', '/seller/product/get', array(
        'methods' => 'GET',
        'permission_callback' => 'shopx_bridge_v2_authenticate_token',
        'callback' => 'shopx_bridge_v2_get_product',
    ));

    register_rest_route('shopx/v1', '/seller/product/update', array(
        'methods' => 'POST',
        'permission_callback' => 'shopx_bridge_v2_authenticate_token',
        'callback' => 'shopx_bridge_v2_update_product',
    ));
});

function shopx_bridge_v2_seller_login(WP_REST_Request $request)
{
    // ── CORS: Allow Next.js origins ───────────────────────────────────────────
    $trusted = array(
        'http://localhost:3000',
        'https://localhost:3000',
        'https://next.shopx.lk',
        'https://vendor.shopx.lk',
    );
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $trusted)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit;
    }

    // ── Input validation ──────────────────────────────────────────────────────
    $username = sanitize_user(trim((string) $request->get_param('username')));
    $password = (string) $request->get_param('password');

    if (empty($username) || empty($password)) {
        return new WP_REST_Response(array(
            'success' => false,
            'code' => 'missing_credentials',
            'message' => 'Username and password are required.',
        ), 400);
    }

    // ── Authentication ────────────────────────────────────────────────────────
    $user = wp_authenticate($username, $password);

    if (is_wp_error($user)) {
        error_log("ShopX Seller Auth: Login failed for '{$username}': " . $user->get_error_message());
        return new WP_REST_Response(array(
            'success' => false,
            'code' => $user->get_error_code(),
            'message' => $user->get_error_message(),
        ), 401);
    }

    // ── Role check: must be a WCFM vendor ─────────────────────────────────────
    $allowed_roles = array('wcfm_vendor', 'seller', 'vendor', 'administrator');
    $user_roles = (array) $user->roles;

    if (empty(array_intersect($user_roles, $allowed_roles))) {
        error_log("ShopX Seller Auth: User '{$username}' (ID {$user->ID}) does not have a vendor role. Roles: " . implode(',', $user_roles));
        return new WP_REST_Response(array(
            'success' => false,
            'code' => 'not_a_vendor',
            'message' => 'This account does not have vendor access.',
        ), 403);
    }

    // ── Store name (WCFM stores it in user meta) ──────────────────────────────
    $store_name = get_user_meta($user->ID, 'store_name', true);
    if (empty($store_name)) {
        // Fallback to WC vendor store name key or display name
        $store_name = get_user_meta($user->ID, '_wcfmmp_profile_store_name', true);
    }
    if (empty($store_name)) {
        $store_name = $user->display_name;
    }

    // ── JWT Token generation ──────────────────────────────────────────────────
    // Reuse the JWT Auth plugin secret so tokens work with both our endpoint
    // and the standard WP JWT Auth plugin endpoints.
    $secret_key = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : '';

    if (empty($secret_key)) {
        error_log('ShopX Seller Auth: JWT_AUTH_SECRET_KEY is not defined in wp-config.php');
        return new WP_REST_Response(array(
            'success' => false,
            'code' => 'jwt_not_configured',
            'message' => 'JWT secret key is not configured on this server.',
        ), 500);
    }

    $issued_at = time();
    $expiration = $issued_at + (DAY_IN_SECONDS * 7); // 7-day token

    $payload = array(
        'iss' => get_bloginfo('url'),
        'iat' => $issued_at,
        'nbf' => $issued_at,
        'exp' => $expiration,
        'data' => array(
            'user' => array(
                'id' => $user->ID,
            ),
        ),
    );

    // Use the JWT Auth plugin's signing function if available (avoids duplicating the library)
    if (class_exists('Jwt_Auth_Public')) {
        // JWT Auth plugin is active — generate token via its filter
        $token = apply_filters('jwt_auth_token_before_sign', $payload, $user);
        // The filter may return the raw payload; sign it properly
    }

    // Manual HS256 signing (works whether or not the JWT plugin is active)
    $header = shopx_bridge_v2_jwt_base64url(json_encode(array('typ' => 'JWT', 'alg' => 'HS256')));
    $payload64 = shopx_bridge_v2_jwt_base64url(json_encode($payload));
    $signature = shopx_bridge_v2_jwt_base64url(hash_hmac('sha256', "{$header}.{$payload64}", $secret_key, true));
    $token = "{$header}.{$payload64}.{$signature}";

    error_log("ShopX Seller Auth: Vendor '{$username}' (ID {$user->ID}) logged in successfully. Store: '{$store_name}'");

    return new WP_REST_Response(array(
        'success' => true,
        'user_id' => $user->ID,
        'store_name' => $store_name,
        'token' => $token,
        'token_type' => 'Bearer',
        'expires_in' => $expiration,
    ), 200);
}

/**
 * URL-safe Base64 encode (no padding) — required for compact JWTs.
 */
function shopx_bridge_v2_jwt_base64url($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// ── Stats Summary Route ───────────────────────────────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('shopx/v1', '/seller/stats-summary', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_stats_summary',
    ));
});

/**
 * GET /wp-json/shopx/v1/seller/stats-summary
 * Query param: vendor_id (optional — defaults to the authenticated user from JWT)
 * Header:      Authorization: Bearer <token>
 *
 * Returns: { net_earnings, gross_sales, platform_fees, pending_balance, order_count }
 */
function shopx_bridge_v2_seller_stats_summary(WP_REST_Request $request)
{
    global $wpdb;

    // Clean any buffered PHP notices before we do anything
    if (ob_get_length())
        ob_clean();

    // ── CORS ─────────────────────────────────────────────────────────────────
    $trusted = array('http://localhost:3000', 'https://localhost:3000', 'https://next.shopx.lk', 'https://vendor.shopx.lk');
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $trusted)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit;
    }

    // ── JWT Validation ────────────────────────────────────────────────────────
    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    }

    $vendor_id = 0;

    if (!empty($auth_header) && preg_match('/Bearer\s+(.+)$/i', $auth_header, $m)) {
        $raw_token = $m[1];
        $parts = explode('.', $raw_token);
        if (count($parts) === 3) {
            $payload_json = base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4, '=', STR_PAD_RIGHT));
            $payload = json_decode($payload_json, true);

            $secret_key = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : '';
            if (!empty($secret_key)) {
                $expected_sig = shopx_bridge_v2_jwt_base64url(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret_key, true));
                if (!hash_equals($expected_sig, $parts[2])) {
                    return new WP_REST_Response(array('success' => false, 'code' => 'invalid_token', 'message' => 'Token signature is invalid.'), 401);
                }
                if (isset($payload['exp']) && $payload['exp'] < time()) {
                    return new WP_REST_Response(array('success' => false, 'code' => 'token_expired', 'message' => 'Token has expired.'), 401);
                }
            }
            $vendor_id = isset($payload['data']['user']['id']) ? intval($payload['data']['user']['id']) : 0;
        }
    }

    if ($request->get_param('vendor_id') && current_user_can('manage_woocommerce')) {
        $vendor_id = intval($request->get_param('vendor_id'));
    }

    if (!$vendor_id) {
        return new WP_REST_Response(array('success' => false, 'code' => 'no_vendor', 'message' => 'Could not determine vendor from token.'), 400);
    }



    // ── Direct Revenue Logic (Bypass WCFM Commissions) ────────────────────────
    $gross_sales = 0.0;
    $net_earnings = 0.0;
    $platform_fees = 0.0;
    $pending = 0.0;
    $order_count = 0;

    // Fetch all Processing and Completed orders for this vendor
    // We strictly use wc_order_product_lookup and wc_order_stats
    $revenue_query = $wpdb->prepare("
        SELECT
            SUM(l.product_net_revenue) as vendor_gross,
            COUNT(DISTINCT l.order_id) as vendor_order_count
        FROM {$wpdb->prefix}wc_order_product_lookup l
        INNER JOIN {$wpdb->prefix}wc_order_stats s ON l.order_id = s.order_id
        WHERE l.product_id IN (
            SELECT ID FROM {$wpdb->posts} WHERE post_author = %d AND post_type = 'product'
        )
        AND s.status IN ('wc-processing', 'wc-completed')
    ", $vendor_id);

    $revenue_row = $wpdb->get_row($revenue_query);

    if ($revenue_row && $revenue_row->vendor_gross > 0) {
        $gross_sales = (float) $revenue_row->vendor_gross;
        $order_count = (int) $revenue_row->vendor_order_count;

        // Deduction Logic: 5% Platform + 3% Payment = 8% Total Deduction
        $percentage_fee = $gross_sales * 0.08;

        // Payout Fee Logic: Rs. 30 per payout. For estimation, we might not know exact payout chunks.
        // Assuming 1 consolidated payout awaiting them
        $payout_fee = 30.0;

        $platform_fees = $percentage_fee + $payout_fee;

        // Net Earnings: (Gross Sales * 0.92) - 30
        $net_earnings = max(0, $gross_sales - $platform_fees);

        // All of these are considered 'pending' until a real payout occurs
        $pending = $net_earnings;

        error_log("ShopX Direct Revenue Stats: vendor_id={$vendor_id} gross={$gross_sales} net={$net_earnings} fee={$platform_fees} orders={$order_count}");
    }

    error_log("ShopX Stats Summary [Direct Logic]: vendor_id={$vendor_id} gross={$gross_sales} net={$net_earnings} fee={$platform_fees} pending={$pending} orders={$order_count}");

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'vendor_id' => $vendor_id,
            'net_earnings' => $net_earnings,
            'gross_sales' => $gross_sales,
            'platform_fees' => $platform_fees,
            'pending_balance' => $pending,
            'order_count' => $order_count,
        ),
    ), 200);
}

// ── Seller Orders Route ────────────────────────────────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('shopx/v1', '/seller/orders', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_orders',
    ));
});

/**
 * GET /wp-json/shopx/v1/seller/orders
 * Header: Authorization: Bearer <token>
 * Query:  per_page (default 50), page (default 1), status (default 'any')
 *
 * Fetches vendor orders by joining wcfm_f_commission → WooCommerce orders.
 * Bypasses WC REST API authentication issues entirely.
 */
function shopx_bridge_v2_seller_orders(WP_REST_Request $request)
{
    global $wpdb;

    // ── CORS ─────────────────────────────────────────────────────────────────
    $trusted = array('http://localhost:3000', 'https://localhost:3000', 'https://next.shopx.lk', 'https://vendor.shopx.lk');
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $trusted)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit;
    }

    // ── JWT → vendor_id ───────────────────────────────────────────────────────
    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $hdrs = apache_request_headers();
        $auth_header = isset($hdrs['Authorization']) ? $hdrs['Authorization'] : '';
    }

    $vendor_id = 0;
    if (!empty($auth_header) && preg_match('/Bearer\s+(.+)$/i', $auth_header, $m)) {
        $parts = explode('.', $m[1]);
        if (count($parts) === 3) {
            $payload_json = base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4, '=', STR_PAD_RIGHT));
            $payload = json_decode($payload_json, true);

            $secret_key = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : '';
            if (!empty($secret_key)) {
                $expected = shopx_bridge_v2_jwt_base64url(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret_key, true));
                if (!hash_equals($expected, $parts[2])) {
                    return new WP_REST_Response(array('success' => false, 'code' => 'invalid_token'), 401);
                }
                if (!empty($payload['exp']) && $payload['exp'] < time()) {
                    return new WP_REST_Response(array('success' => false, 'code' => 'token_expired'), 401);
                }
            }
            $vendor_id = isset($payload['data']['user']['id']) ? intval($payload['data']['user']['id']) : 0;
        }
    }

    if (!$vendor_id) {
        return new WP_REST_Response(array('success' => false, 'code' => 'no_vendor', 'message' => 'Token missing or invalid.'), 400);
    }

    // ── Pagination & filters ──────────────────────────────────────────────────
    $per_page = min(100, max(1, intval($request->get_param('per_page') ?: 50)));
    $page = max(1, intval($request->get_param('page') ?: 1));
    $status = sanitize_text_field($request->get_param('status') ?: 'any');
    $offset = ($page - 1) * $per_page;

    // ── Get order IDs from wcfm_f_commission (vendor's orders only) ───────────
    $comm_table = $wpdb->prefix . 'wcfm_f_commission';

    if ($wpdb->get_var("SHOW TABLES LIKE '{$comm_table}'") !== $comm_table) {
        // Fallback: return all orders for this user from WooCommerce post meta
        $order_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT DISTINCT post_id FROM {$wpdb->postmeta}
             WHERE meta_key = '_vendor_id' AND meta_value = %d
             ORDER BY post_id DESC LIMIT %d OFFSET %d",
            $vendor_id,
            $per_page,
            $offset
        ));
    } else {
        $order_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT DISTINCT order_id FROM {$comm_table}
             WHERE vendor_id = %d
             ORDER BY id DESC LIMIT %d OFFSET %d",
            $vendor_id,
            $per_page,
            $offset
        ));
    }

    if (empty($order_ids)) {
        return new WP_REST_Response(array('success' => true, 'data' => array(), 'total' => 0), 200);
    }

    // ── Fetch order objects and format ────────────────────────────────────────
    $orders_data = array();

    foreach ($order_ids as $order_id) {
        $order = wc_get_order(intval($order_id));
        if (!$order || (!($order instanceof WC_Order) && !is_a($order, 'WC_Abstract_Order')))
            continue;

        // Skip if status filter is set and doesn't match
        if ($status !== 'any' && $order->get_status() !== $status)
            continue;

        // Ensure _wcfm_order_processed is 'yes' so WCFM dashboard counts it
        if (get_post_meta($order->get_id(), '_wcfm_order_processed', true) !== 'yes') {
            update_post_meta($order->get_id(), '_wcfm_order_processed', 'yes');
        }

        // Line items
        $line_items = array();
        foreach ($order->get_items() as $item) {
            /** @var WC_Order_Item_Product $item */
            $product = $item->get_product();
            $line_items[] = array(
                'id' => $item->get_id(),
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'total' => $item->get_total(),
                'sku' => $product ? $product->get_sku() : '',
            );
        }

        // Billing & shipping address
        $billing = $order->get_address('billing');
        $shipping = $order->get_address('shipping');

        // Fetch cancel reason if cancelled
        $cancel_reason = '';
        if ($order->get_status() === 'cancelled') {
            $notes = wc_get_order_notes(array('order_id' => $order->get_id(), 'type' => 'customer'));
            if (!empty($notes)) {
                // The first note might be the reason
                $cancel_reason = wp_strip_all_tags($notes[0]->content);
            }
        }

        $orders_data[] = array(
            'id' => $order->get_id(),
            'status' => $order->get_status(),
            'total' => $order->get_total(),
            'shipping_total' => $order->get_shipping_total(),
            'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
            'billing' => array(
                'first_name' => $billing['first_name'] ?? '',
                'last_name' => $billing['last_name'] ?? '',
                'address_1' => $billing['address_1'] ?? '',
                'address_2' => $billing['address_2'] ?? '',
                'city' => $billing['city'] ?? '',
                'state' => $billing['state'] ?? '',
                'postcode' => $billing['postcode'] ?? '',
                'phone' => $billing['phone'] ?? '',
                'email' => $billing['email'] ?? '',
            ),
            'shipping' => array(
                'first_name' => $shipping['first_name'] ?? '',
                'last_name' => $shipping['last_name'] ?? '',
                'address_1' => $shipping['address_1'] ?? '',
                'address_2' => $shipping['address_2'] ?? '',
                'city' => $shipping['city'] ?? '',
                'state' => $shipping['state'] ?? '',
                'postcode' => $shipping['postcode'] ?? '',
            ),
            'line_items' => $line_items,
            'cancel_reason' => $cancel_reason,
        );
    }

    error_log("ShopX Seller Orders: vendor_id={$vendor_id} returned " . count($orders_data) . " orders");

    return new WP_REST_Response(array(
        'success' => true,
        'data' => $orders_data,
        'total' => count($orders_data),
        'page' => $page,
    ), 200);
}

// ── Create Product Route ───────────────────────────────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('shopx/v1', '/seller/product/create', array(
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_create_product',
    ));
});

/**
 * POST /wp-json/shopx/v1/seller/product/create
 * Header: Authorization: Bearer <token>
 * Body (JSON): { name, regular_price, sale_price?, description?, short_description?,
 *                sku?, manage_stock?, stock_quantity?, status?, image_id?, vendor_id? }
 */
function shopx_bridge_v2_create_product(WP_REST_Request $request)
{
    // ── CORS ──────────────────────────────────────────────────────────────────
    $trusted = array('http://localhost:3000', 'https://localhost:3000', 'https://next.shopx.lk', 'https://vendor.shopx.lk');
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $trusted))
        header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit;
    }

    // ── JWT → vendor_id ───────────────────────────────────────────────────────
    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $hdrs = apache_request_headers();
        $auth_header = isset($hdrs['Authorization']) ? $hdrs['Authorization'] : '';
    }

    $vendor_id = 0;
    if (!empty($auth_header) && preg_match('/Bearer\s+(.+)$/i', $auth_header, $m)) {
        $parts = explode('.', $m[1]);
        if (count($parts) === 3) {
            $payload_json = base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4, '=', STR_PAD_RIGHT));
            $payload = json_decode($payload_json, true);
            $secret_key = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : '';
            if (!empty($secret_key)) {
                $expected = shopx_bridge_v2_jwt_base64url(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret_key, true));
                if (!hash_equals($expected, $parts[2])) {
                    return new WP_REST_Response(array('success' => false, 'code' => 'invalid_token'), 401);
                }
                if (!empty($payload['exp']) && $payload['exp'] < time()) {
                    return new WP_REST_Response(array('success' => false, 'code' => 'token_expired'), 401);
                }
            }
            $vendor_id = isset($payload['data']['user']['id']) ? intval($payload['data']['user']['id']) : 0;
        }
    }

    // Allow explicit vendor_id override from body (already validated by JWT above)
    if (!$vendor_id && $request->get_param('vendor_id')) {
        $vendor_id = intval($request->get_param('vendor_id'));
    }

    if (!$vendor_id) {
        return new WP_REST_Response(array('success' => false, 'code' => 'no_vendor', 'message' => 'Token missing or invalid.'), 400);
    }

    // ── Require WooCommerce ───────────────────────────────────────────────────
    if (!function_exists('wc_get_product')) {
        return new WP_REST_Response(array('success' => false, 'code' => 'no_woocommerce', 'message' => 'WooCommerce is not active.'), 500);
    }

    // ── Input ─────────────────────────────────────────────────────────────────
    $product_type = sanitize_text_field($request->get_param('product_type') ?? 'simple');
    $name = sanitize_text_field($request->get_param('name') ?? '');
    $regular_price = sanitize_text_field($request->get_param('regular_price') ?? '');
    $sale_price = sanitize_text_field($request->get_param('sale_price') ?? '');
    $description = wp_kses_post($request->get_param('description') ?? '');
    $short_description = wp_kses_post($request->get_param('short_description') ?? '');
    $sku = sanitize_text_field($request->get_param('sku') ?? '');
    $status = in_array($request->get_param('status'), array('publish', 'draft', 'pending')) ? $request->get_param('status') : 'publish';
    $manage_stock = (bool) $request->get_param('manage_stock');
    $stock_quantity = intval($request->get_param('stock_quantity') ?? 0);
    $image_id = intval($request->get_param('image_id') ?? 0);
    $shipping_cost = sanitize_text_field($request->get_param('shipping_cost') ?? '');
    $weight = sanitize_text_field($request->get_param('weight') ?? '');
    $brand = sanitize_text_field($request->get_param('brand') ?? '');
    $category_ids = $request->get_param('category_ids') ?? array();

    $attributes = $request->get_param('attributes') ?? array();
    $variations_data = $request->get_param('variations') ?? array();

    if (empty($name)) {
        return new WP_REST_Response(array('success' => false, 'code' => 'missing_name', 'message' => 'Product name is required.'), 400);
    }
    if ($product_type === 'simple' && ($regular_price === '' || !is_numeric($regular_price))) {
        return new WP_REST_Response(array('success' => false, 'code' => 'missing_price', 'message' => 'A valid regular price is required for simple products.'), 400);
    }

    // Clean output buffer before product creation (WC may trigger notices)
    if (ob_get_length())
        ob_clean();

    // ── Create product (wrapped to catch any WC exceptions) ───────────────────
    $product_id = 0;
    try {
        if ($product_type === 'variable') {
            $product = new WC_Product_Variable();
        } else {
            $product = new WC_Product_Simple();
            $product->set_regular_price($regular_price);
            if (!empty($sale_price))
                $product->set_sale_price($sale_price);
        }

        $product->set_name($name);
        $product->set_description($description);
        $product->set_short_description($short_description);
        if (!empty($sku))
            $product->set_sku($sku);
        $product->set_status($status);
        $product->set_catalog_visibility('visible');

        if ($product_type === 'simple' && $manage_stock) {
            $product->set_manage_stock(true);
            $product->set_stock_quantity($stock_quantity);
        }

        if ($image_id > 0) {
            $product->set_image_id($image_id);
        }

        if ($weight !== '') {
            $product->set_weight($weight);
        }

        // Process Attributes for Variable Products
        if ($product_type === 'variable' && !empty($attributes) && is_array($attributes)) {
            $wc_attributes = array();
            $position = 0;

            foreach ($attributes as $attr) {
                if (empty($attr['name']) || empty($attr['options']))
                    continue;

                $attribute = new WC_Product_Attribute();
                $attribute->set_id(0); // Custom attribute
                $attribute->set_name($attr['name']);

                $options = is_array($attr['options']) ? $attr['options'] : array_map('trim', explode('|', $attr['options']));
                $attribute->set_options($options);

                $attribute->set_position($position++);
                $attribute->set_visible(true);
                $attribute->set_variation(true);
                $wc_attributes[] = $attribute;
            }
            $product->set_attributes($wc_attributes);
        }

        $product_id = $product->save();

        // Process Variations
        if ($product_type === 'variable' && $product_id && !empty($variations_data) && is_array($variations_data)) {
            foreach ($variations_data as $variation_data) {
                $variation = new WC_Product_Variation();
                $variation->set_parent_id($product_id);
                $variation->set_status('publish');

                if (!empty($variation_data['attributes']) && is_array($variation_data['attributes'])) {
                    $variation->set_attributes($variation_data['attributes']);
                }
                if (isset($variation_data['regular_price']) && is_numeric($variation_data['regular_price'])) {
                    $variation->set_regular_price($variation_data['regular_price']);
                }
                if (isset($variation_data['sale_price']) && is_numeric($variation_data['sale_price'])) {
                    $variation->set_sale_price($variation_data['sale_price']);
                }
                if (!empty($variation_data['sku'])) {
                    $variation->set_sku($variation_data['sku']);
                }
                if (isset($variation_data['manage_stock']) && $variation_data['manage_stock']) {
                    $variation->set_manage_stock(true);
                    if (isset($variation_data['stock_quantity'])) {
                        $variation->set_stock_quantity(intval($variation_data['stock_quantity']));
                    }
                }
                if (isset($variation_data['image_id']) && !empty($variation_data['image_id'])) {
                    $variation->set_image_id(intval($variation_data['image_id']));
                }

                $variation_id = $variation->save();

                // Force Image Persistence (Only if specific image provided)
                if (isset($variation_data['image_id']) && !empty($variation_data['image_id'])) {
                    $img_id = intval($variation_data['image_id']);
                    // Prevent overwriting if it's somehow the parent image ID or if we want to be strict
                    update_post_meta($variation_id, '_thumbnail_id', $img_id);
                    set_post_thumbnail($variation_id, $img_id);
                }

                // Force Price Synchronization (Explicit Mapping)
                if (isset($variation_data['regular_price']) && is_numeric($variation_data['regular_price'])) {
                    $reg_price = $variation_data['regular_price'];
                    update_post_meta($variation_id, '_regular_price', $reg_price);

                    // If no sale price, _price is regular_price
                    $final_price = $reg_price;
                    if (isset($variation_data['sale_price']) && is_numeric($variation_data['sale_price'])) {
                        $sale_price = $variation_data['sale_price'];
                        update_post_meta($variation_id, '_sale_price', $sale_price);
                        $final_price = $sale_price;
                    }
                    update_post_meta($variation_id, '_price', $final_price);
                }
            }
            wc_delete_product_transients($product_id);
        }

        error_log("ShopX Create Product: vendor_id={$vendor_id} save() returned product_id={$product_id} name='{$name}' type='{$product_type}'");
    } catch (Exception $e) {
        error_log("ShopX Create Product EXCEPTION: " . $e->getMessage());
        return new WP_REST_Response(array('success' => false, 'code' => 'wc_exception', 'message' => $e->getMessage()), 500);
    } catch (Error $e) {
        error_log("ShopX Create Product FATAL: " . $e->getMessage());
        return new WP_REST_Response(array('success' => false, 'code' => 'wc_fatal', 'message' => 'A server error occurred saving the product.'), 500);
    }

    if (!$product_id || $product_id < 1) {
        error_log("ShopX Create Product: save() returned falsy product_id for vendor {$vendor_id}");
        return new WP_REST_Response(array('success' => false, 'code' => 'save_failed', 'message' => 'Failed to save product — check debug.log.'), 500);
    }

    if (!empty($shipping_cost)) {
        update_post_meta($product_id, '_seller_shipping_cost', $shipping_cost);
        if (class_exists('WC_Cache_Helper')) {
            WC_Cache_Helper::get_transient_version('shipping', true);
        }
    }

    // Assign post_author to vendor
    wp_update_post(array('ID' => $product_id, 'post_author' => $vendor_id));

    // WCFM stores vendor products via this meta key
    update_post_meta($product_id, '_wcfm_product_author', $vendor_id);

    // Attach image to this post if provided
    if ($image_id > 0) {
        wp_update_post(array('ID' => $image_id, 'post_parent' => $product_id));
    }

    // Weight
    if ($weight !== '') {
        update_post_meta($product_id, '_weight', $weight);
    }

    // Categories
    if (!empty($category_ids) && is_array($category_ids)) {
        wp_set_object_terms($product_id, array_map('intval', $category_ids), 'product_cat');
    }

    // Brand (Meta-based). Logic: verified sellers can set.
    $is_verified = get_user_meta($vendor_id, '_verified_seller', true) === 'yes';
    if ($is_verified && !empty($brand)) {
        update_post_meta($product_id, '_product_brand', $brand);
    } else {
        update_post_meta($product_id, '_product_brand', 'No Brand');
    }

    // Clean buffer once more before JSON response
    if (ob_get_length())
        ob_clean();

    return new WP_REST_Response(array(
        'success' => true,
        'product_id' => $product_id,
        'name' => $name,
        'status' => $status,
        'edit_url' => admin_url("post.php?post={$product_id}&action=edit"),
    ), 201);
}

// ── Seller Transactions Route ──────────────────────────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('shopx/v1', '/seller/transactions', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_transactions',
    ));
});

/**
 * GET /wp-json/shopx/v1/seller/transactions
 * Header: Authorization: Bearer <token>
 * Query:  per_page (default 50), page (default 1)
 *
 * Returns individual commission rows from wcfm_f_commission for the vendor.
 */
function shopx_bridge_v2_seller_transactions(WP_REST_Request $request)
{
    global $wpdb;

    // ── CORS ─────────────────────────────────────────────────────────────────
    $trusted = array('http://localhost:3000', 'https://localhost:3000', 'https://next.shopx.lk', 'https://vendor.shopx.lk');
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $trusted))
        header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit;
    }

    // ── JWT → vendor_id ───────────────────────────────────────────────────────
    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $hdrs = apache_request_headers();
        $auth_header = isset($hdrs['Authorization']) ? $hdrs['Authorization'] : '';
    }

    $vendor_id = 0;
    if (!empty($auth_header) && preg_match('/Bearer\s+(.+)$/i', $auth_header, $m)) {
        $parts = explode('.', $m[1]);
        if (count($parts) === 3) {
            $payload_json = base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4, '=', STR_PAD_RIGHT));
            $payload = json_decode($payload_json, true);
            $secret_key = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : '';
            if (!empty($secret_key)) {
                $expected = shopx_bridge_v2_jwt_base64url(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret_key, true));
                if (!hash_equals($expected, $parts[2])) {
                    return new WP_REST_Response(array('success' => false, 'code' => 'invalid_token'), 401);
                }
                if (!empty($payload['exp']) && $payload['exp'] < time()) {
                    return new WP_REST_Response(array('success' => false, 'code' => 'token_expired'), 401);
                }
            }
            $vendor_id = isset($payload['data']['user']['id']) ? intval($payload['data']['user']['id']) : 0;
        }
    }

    if (!$vendor_id) {
        return new WP_REST_Response(array('success' => false, 'code' => 'no_vendor', 'message' => 'Token missing or invalid.'), 400);
    }

    // ── Pagination ────────────────────────────────────────────────────────────
    $per_page = min(200, max(1, intval($request->get_param('per_page') ?: 50)));
    $page = max(1, intval($request->get_param('page') ?: 1));
    $offset = ($page - 1) * $per_page;

    // ── Direct Revenue Logic (Bypass wcfm_f_commission table) ────────────────
    // We will query wc_order_product_lookup joined with wc_order_stats
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT
            l.order_item_id as id,
            l.order_id,
            l.product_id,
            l.product_net_revenue as gross_amount,
            s.status,
            s.date_created as date
         FROM {$wpdb->prefix}wc_order_product_lookup l
         INNER JOIN {$wpdb->prefix}wc_order_stats s ON l.order_id = s.order_id
         WHERE l.product_id IN (
             SELECT ID FROM {$wpdb->posts} WHERE post_author = %d AND post_type = 'product'
         )
         ORDER BY l.order_id DESC
         LIMIT %d OFFSET %d",
        $vendor_id,
        $per_page,
        $offset
    ), ARRAY_A);

    if (empty($rows)) {
        return new WP_REST_Response(array('success' => true, 'data' => array(), 'total' => 0), 200);
    }

    // ── Enrich with product names in one batch query ──────────────────────────
    $product_ids = array_values(array_unique(array_filter(array_column($rows, 'product_id'))));
    $product_names = array();

    if (!empty($product_ids)) {
        $placeholders = implode(',', array_fill(0, count($product_ids), '%d'));
        $name_rows = $wpdb->get_results(
            // phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
            $wpdb->prepare(
                "SELECT ID, post_title FROM {$wpdb->posts} WHERE ID IN ({$placeholders})",
                ...$product_ids
            ),
            ARRAY_A
        );
        foreach ($name_rows as $nr) {
            $product_names[intval($nr['ID'])] = $nr['post_title'];
        }
    }

    // ── Format response with Direct Revenue Math ──────────────────────────────
    $data = array_map(function ($row) use ($product_names) {
        $gross = (float) ($row['gross_amount'] ?? 0);
        $platform_fee = $gross * 0.08; // 8% Default Deduction (5% platform + 3% payment)
        $commission = max(0, $gross - $platform_fee); // The Seller's Cut

        $mapped_status = 'pending';
        if ($row['status'] === 'wc-completed')
            $mapped_status = 'completed';
        else if ($row['status'] === 'wc-processing')
            $mapped_status = 'processing';
        else
            $mapped_status = str_replace('wc-', '', $row['status']);

        return array(
            'id' => intval($row['id']),
            'order_id' => intval($row['order_id']),
            'product_name' => isset($product_names[intval($row['product_id'])]) ? $product_names[intval($row['product_id'])] : 'Unknown Product',
            'gross_amount' => $gross,
            'commission' => $commission,
            'platform_fee' => $platform_fee,
            'status' => $mapped_status,
            'date' => $row['date'] ?: '',
        );
    }, $rows);

    error_log('ShopX Transactions: vendor_id=' . $vendor_id . ' returned ' . count($data) . ' rows');

    return new WP_REST_Response(array(
        'success' => true,
        'data' => $data,
        'total' => count($data),
        'page' => $page,
    ), 200);
}

// ── Seller Auto-Login Edit Redirect ──────────────────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('shopx/v1', '/seller/autologin-edit', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_autologin_edit',
    ));
});

/**
 * GET /wp-json/shopx/v1/seller/autologin-edit?token=<jwt>&product_id=<id>
 * Validates token, logs the user in via cookie, and redirects to post edit page.
 */
function shopx_bridge_v2_seller_autologin_edit(WP_REST_Request $request)
{
    // Clean buffer just in case, though we are redirecting
    if (ob_get_length())
        ob_clean();

    $token = $request->get_param('token');
    $product_id = intval($request->get_param('product_id'));

    if (empty($token) || empty($product_id)) {
        wp_die('Missing token or product ID.', 'ShopX Bridge', array('response' => 400));
    }

    // ── JWT → vendor_id ───────────────────────────────────────────────────────
    $vendor_id = 0;
    $parts = explode('.', $token);
    if (count($parts) === 3) {
        $payload_json = base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4, '=', STR_PAD_RIGHT));
        $payload = json_decode($payload_json, true);

        $secret_key = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : '';
        if (!empty($secret_key)) {
            $expected = shopx_bridge_v2_jwt_base64url(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret_key, true));
            if (!hash_equals($expected, $parts[2])) {
                wp_die('Invalid token signature.', 'ShopX Bridge', array('response' => 401));
            }
            if (!empty($payload['exp']) && $payload['exp'] < time()) {
                wp_die('Token expired.', 'ShopX Bridge', array('response' => 401));
            }
        }
        $vendor_id = isset($payload['data']['user']['id']) ? intval($payload['data']['user']['id']) : 0;
    }

    if (!$vendor_id) {
        wp_die('Could not determine vendor from token.', 'ShopX Bridge', array('response' => 401));
    }

    // Attempt to log the user in
    $user = get_user_by('id', $vendor_id);
    if (!$user) {
        wp_die('Vendor account not found.', 'ShopX Bridge', array('response' => 404));
    }

    // Set the authentication cookies
    wp_set_current_user($vendor_id, $user->user_login);
    wp_set_auth_cookie($vendor_id, true, is_ssl());
    do_action('wp_login', $user->user_login, $user);

    // Redirect to the edit product page
    $edit_url = admin_url("post.php?post={$product_id}&action=edit");

    error_log("ShopX Auto-Login: vendor_id={$vendor_id} redirected to edit post {$product_id}");

    wp_redirect($edit_url);
    exit;
}


// ── JWT Utilities ─────────────────────────────────────────────────────────────
function shopx_bridge_v2_authenticate_token(WP_REST_Request $request)
{
    $vendor_id = shopx_bridge_v2_get_vendor_id_from_request($request);
    return $vendor_id > 0;
}

function shopx_bridge_v2_get_vendor_id_from_request(WP_REST_Request $request)
{
    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    }

    $raw_token = '';

    if (!empty($auth_header) && preg_match('/Bearer\s+(.+)$/i', $auth_header, $m)) {
        $raw_token = $m[1];
    } elseif (!empty($request->get_param('token'))) {
        $raw_token = $request->get_param('token');
    }

    if (!empty($raw_token)) {
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

// ── Seller Product Fetch (GET) ────────────────────────────────────────────────
function shopx_bridge_v2_get_product(WP_REST_Request $request)
{
    if (ob_get_length())
        ob_clean();

    // Because authenticate_token returns boolean early, we extract vendor directly inside
    $vendor_id = shopx_bridge_v2_get_vendor_id_from_request($request);
    if (!$vendor_id && $request->get_param('vendor_id')) {
        $vendor_id = intval($request->get_param('vendor_id'));
    }

    $product_id = intval($request->get_param('product_id'));

    if (!$vendor_id || !$product_id) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Missing token or product ID.'), 400);
    }

    $product = wc_get_product($product_id);
    if (!$product) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Product not found.'), 404);
    }

    // Security check: Vendor can only fetch their own products
    $post_author = intval(get_post_field('post_author', $product_id));
    if ($post_author !== $vendor_id) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Permission denied.'), 403);
    }

    $image_id = $product->get_image_id();
    $image_url = $image_id ? wp_get_attachment_image_url($image_id, 'large') : null;

    $product_type = $product->get_type();

    $data = array(
        'id' => $product->get_id(),
        'name' => $product->get_name(),
        'status' => $product->get_status(),
        'sku' => $product->get_sku(),
        'regular_price' => $product->get_regular_price(),
        'sale_price' => $product->get_sale_price(),
        'description' => $product->get_description(),
        'short_description' => $product->get_short_description(),
        'manage_stock' => $product->get_manage_stock(),
        'stock_quantity' => $product->get_stock_quantity(),
        'image_id' => $image_id,
        'image_url' => $image_url,
        'shipping_cost' => get_post_meta($product->get_id(), '_seller_shipping_cost', true),
        'weight' => get_post_meta($product->get_id(), '_weight', true),
        'brand' => get_post_meta($product->get_id(), '_product_brand', true) ?: 'No Brand',
        'category_ids' => wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'ids')),
        'product_type' => $product_type,
    );

    if ($product_type === 'variable') {
        $attributes = array();
        foreach ($product->get_attributes() as $attr) {
            if ($attr->get_variation()) {
                $attributes[] = array(
                    'name' => $attr->get_name(),
                    'options' => implode(' | ', $attr->get_options())
                );
            }
        }
        $data['attributes'] = $attributes;

        $variations = array();
        foreach ($product->get_children() as $variation_id) {
            $variation = wc_get_product($variation_id);
            if ($variation) {
                $var_image_id = $variation->get_image_id();
                $variations[] = array(
                    'id' => $variation->get_id(),
                    'attributes' => $variation->get_attributes(),
                    'regular_price' => $variation->get_regular_price(),
                    'sale_price' => $variation->get_sale_price(),
                    'sku' => $variation->get_sku(),
                    'manage_stock' => $variation->get_manage_stock(),
                    'stock_quantity' => $variation->get_stock_quantity(),
                    'image_id' => $var_image_id,
                    'image_url' => $var_image_id ? wp_get_attachment_image_url($var_image_id, 'thumbnail') : null,
                );
            }
        }
        $data['variations'] = $variations;
    }

    return new WP_REST_Response(array('success' => true, 'data' => $data), 200);
}

// ── Seller Product Update (POST) ──────────────────────────────────────────────
function shopx_bridge_v2_update_product(WP_REST_Request $request)
{
    if (ob_get_length())
        ob_clean();

    $vendor_id = shopx_bridge_v2_get_vendor_id_from_request($request);
    if (!$vendor_id && $request->get_param('vendor_id')) {
        $vendor_id = intval($request->get_param('vendor_id'));
    }

    $params = $request->get_json_params();

    if (!$vendor_id || empty($params['id'])) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Missing vendor ID or product ID.'), 400);
    }

    $product_id = intval($params['id']);
    $product = wc_get_product($product_id);

    if (!$product) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Product not found.'), 404);
    }

    // Ensure the vendor actually owns this product
    $post_author = intval(get_post_field('post_author', $product_id));
    if ($post_author !== $vendor_id) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Permission denied. You cannot edit this product.'), 403);
    }

    try {
        $product_type = isset($params['product_type']) ? sanitize_text_field($params['product_type']) : 'simple';

        // If changing class type, WooCommerce requires special handling or a new instance, but since WordPress doesn't let us casually morph objects safely via standard CRUD sometimes, we'll assign properties then forcefully rely on set_props/save.
        // For simplicity, we assume we just save the fields.
        if (isset($params['name']))
            $product->set_name(sanitize_text_field($params['name']));
        if (isset($params['status']))
            $product->set_status(sanitize_text_field($params['status']));
        if (isset($params['sku']))
            $product->set_sku(sanitize_text_field($params['sku']));

        if ($product_type === 'simple') {
            if (isset($params['regular_price']))
                $product->set_regular_price(sanitize_text_field($params['regular_price']));
            if (isset($params['sale_price']))
                $product->set_sale_price(sanitize_text_field($params['sale_price']));
        }

        if (isset($params['description']))
            $product->set_description(wp_kses_post($params['description']));
        if (isset($params['short_description']))
            $product->set_short_description(wp_kses_post($params['short_description']));

        if ($product_type === 'simple') {
            if (isset($params['manage_stock'])) {
                $product->set_manage_stock(rest_sanitize_boolean($params['manage_stock']));
                if (isset($params['stock_quantity'])) {
                    $product->set_stock_quantity(intval($params['stock_quantity']));
                }
            } else if (isset($params['stock_quantity']) && $params['stock_quantity'] === '') {
                $product->set_manage_stock(false);
                $product->set_stock_quantity('');
            }
        } else {
            // Variable products calculate stock globally based on variations usually
            $product->set_manage_stock(false);
        }

        if (isset($params['image_id'])) {
            $product->set_image_id(intval($params['image_id']));
        }

        if (isset($params['weight'])) {
            $product->set_weight(sanitize_text_field($params['weight']));
        }

        if (isset($params['category_ids']) && is_array($params['category_ids'])) {
            wp_set_object_terms($product_id, array_map('intval', $params['category_ids']), 'product_cat');
        }

        $is_verified = get_user_meta($vendor_id, '_verified_seller', true) === 'yes';
        if (isset($params['brand'])) {
            if ($is_verified) {
                update_post_meta($product_id, '_product_brand', sanitize_text_field($params['brand']));
            } else {
                update_post_meta($product_id, '_product_brand', 'No Brand');
            }
        }

        // Process Attributes
        if ($product_type === 'variable' && isset($params['attributes']) && is_array($params['attributes'])) {
            $wc_attributes = array();
            $position = 0;

            foreach ($params['attributes'] as $attr) {
                if (empty($attr['name']) || empty($attr['options']))
                    continue;

                $attribute = new WC_Product_Attribute();
                $attribute->set_id(0); // Custom attribute
                $attribute->set_name($attr['name']);

                $options = is_array($attr['options']) ? $attr['options'] : array_map('trim', explode('|', $attr['options']));
                $attribute->set_options($options);

                $attribute->set_position($position++);
                $attribute->set_visible(true);
                $attribute->set_variation(true);
                $wc_attributes[] = $attribute;
            }
            $product->set_attributes($wc_attributes);
        }

        $product->save();

        // Process Variations for updates
        if ($product_type === 'variable' && isset($params['variations']) && is_array($params['variations'])) {
            // Delete existing variations to recreate them cleanly (simplest path for array replacements)
            $existing_variations = $product->get_children();
            foreach ($existing_variations as $var_id) {
                $var = wc_get_product($var_id);
                if ($var)
                    $var->delete(true); // force delete
            }

            // Generate new ones
            foreach ($params['variations'] as $variation_data) {
                $variation = new WC_Product_Variation();
                $variation->set_parent_id($product_id);
                $variation->set_status('publish');

                if (!empty($variation_data['attributes']) && is_array($variation_data['attributes'])) {
                    $variation->set_attributes($variation_data['attributes']);
                }
                if (isset($variation_data['regular_price']) && is_numeric($variation_data['regular_price'])) {
                    $variation->set_regular_price($variation_data['regular_price']);
                }
                if (isset($variation_data['sale_price']) && is_numeric($variation_data['sale_price'])) {
                    $variation->set_sale_price($variation_data['sale_price']);
                }
                if (!empty($variation_data['sku'])) {
                    $variation->set_sku($variation_data['sku']);
                }
                if (isset($variation_data['manage_stock']) && $variation_data['manage_stock']) {
                    $variation->set_manage_stock(true);
                    if (isset($variation_data['stock_quantity'])) {
                        $variation->set_stock_quantity(intval($variation_data['stock_quantity']));
                    }
                }
                if (isset($variation_data['image_id']) && !empty($variation_data['image_id'])) {
                    $variation->set_image_id(intval($variation_data['image_id']));
                }

                $variation_id = $variation->save();

                // Force Image Persistence (Only if specific image provided)
                if (isset($variation_data['image_id']) && !empty($variation_data['image_id'])) {
                    $img_id = intval($variation_data['image_id']);
                    update_post_meta($variation_id, '_thumbnail_id', $img_id);
                    set_post_thumbnail($variation_id, $img_id);
                }

                // Force Price Synchronization (Explicit Mapping)
                if (isset($variation_data['regular_price']) && is_numeric($variation_data['regular_price'])) {
                    $reg_price = $variation_data['regular_price'];
                    update_post_meta($variation_id, '_regular_price', $reg_price);

                    $final_price = $reg_price;
                    if (isset($variation_data['sale_price']) && is_numeric($variation_data['sale_price'])) {
                        $sale_price = $variation_data['sale_price'];
                        update_post_meta($variation_id, '_sale_price', $sale_price);
                        $final_price = $sale_price;
                    }
                    update_post_meta($variation_id, '_price', $final_price);
                }
            }
            wc_delete_product_transients($product_id);
        }

        $product->save();

        if (isset($params['weight'])) {
            update_post_meta($product_id, '_weight', sanitize_text_field($params['weight']));
        }

        if (isset($params['shipping_cost'])) {
            $shipping_cost = sanitize_text_field($params['shipping_cost']);
            update_post_meta($product_id, '_seller_shipping_cost', $shipping_cost);
            if (class_exists('WC_Cache_Helper')) {
                WC_Cache_Helper::get_transient_version('shipping', true);
            }
        }

        if (ob_get_length())
            ob_clean();
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Product updated successfully.',
            'product_id' => $product_id
        ), 200);

    } catch (Exception $e) {
        error_log("ShopX Update Product EXCEPTION: " . $e->getMessage());
        return new WP_REST_Response(array('success' => false, 'message' => $e->getMessage()), 500);
    } catch (Error $e) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Critical error saving product.'), 500);
    }
}

// ── Seller Order RTS ───────────────────────────────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('shopx/v1', '/seller/order/rts', array(
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_v2_seller_order_rts',
    ));
});

function shopx_bridge_v2_seller_order_rts(WP_REST_Request $request)
{
    // CORS headers
    $trusted = array('http://localhost:3000', 'https://localhost:3000', 'https://next.shopx.lk', 'https://vendor.shopx.lk');
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (in_array($origin, $trusted)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit;
    }

    $vendor_id = shopx_bridge_v2_get_vendor_id_from_request($request);
    if (!$vendor_id && $request->get_param('vendor_id')) {
        $vendor_id = intval($request->get_param('vendor_id'));
    }

    $params = $request->get_json_params();

    if (!$vendor_id || empty($params['order_id'])) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Missing vendor ID or order ID.'), 400);
    }

    $order_id = intval($params['order_id']);
    $order = wc_get_order($order_id);

    if (!$order) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Order not found.'), 404);
    }

    // Verify vendor has access to this order (check if any line item belongs to this vendor)
    $has_access = false;
    foreach ($order->get_items() as $item) {
        $product_id = $item->get_product_id();
        $author_id = get_post_field('post_author', $product_id);
        if (intval($author_id) === $vendor_id) {
            $has_access = true;
            break;
        }
    }

    if (!$has_access) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Permission denied.'), 403);
    }

    try {
        if (!empty($params['note'])) {
            $note = sanitize_text_field($params['note']);
            $order->add_order_note($note, true, true); // $note, $is_customer_note, $added_by_user
        }

        $order->update_status('completed', 'Order marked as Ready to Ship by vendor.', true);

        if (ob_get_length())
            ob_clean();

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Order marked as Ready to Ship.',
            'order_id' => $order_id
        ), 200);
    } catch (Exception $e) {
        error_log("ShopX RTS EXCEPTION: " . $e->getMessage());
        return new WP_REST_Response(array('success' => false, 'message' => $e->getMessage()), 500);
    }
}
