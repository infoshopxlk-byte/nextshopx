const fs = require('fs');
let code = fs.readFileSync('inc/seller-auth-api.php', 'utf8');

// 1. Remove all existing add_action('rest_api_init', ...) blocks
code = code.replace(/add_action\('rest_api_init', function \(\) \{\s*error_log\('[^']+'\);\s*register_rest_route\([\s\S]+?\}\);\s*\}\);/g, '');
code = code.replace(/add_action\('rest_api_init', function \(\) \{\s*register_rest_route\([\s\S]+?\}\);\s*\}\);/g, '');

// 2. We'll append the Master Block right before the first function `shopx_bridge_v2_seller_login`
const masterBlock = `add_action('rest_api_init', function () {
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

`;

code = code.replace('function shopx_bridge_v2_seller_login(WP_REST_Request $request)', masterBlock + 'function shopx_bridge_v2_seller_login(WP_REST_Request $request)');

// 3. Add the missing get_product and update_product methods to the end
const endCode = `
// ── Seller Product Fetch (GET) ────────────────────────────────────────────────
function shopx_bridge_v2_get_product(WP_REST_Request $request) {
    if (ob_get_length()) ob_clean();

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

    $data = array(
        'id'                => $product->get_id(),
        'name'              => $product->get_name(),
        'status'            => $product->get_status(),
        'sku'               => $product->get_sku(),
        'regular_price'     => $product->get_regular_price(),
        'sale_price'        => $product->get_sale_price(),
        'description'       => $product->get_description(),
        'short_description' => $product->get_short_description(),
        'manage_stock'      => $product->get_manage_stock(),
        'stock_quantity'    => $product->get_stock_quantity(),
        'image_id'          => $image_id,
        'image_url'         => $image_url,
    );

    return new WP_REST_Response(array('success' => true, 'data' => $data), 200);
}

// ── Seller Product Update (POST) ──────────────────────────────────────────────
function shopx_bridge_v2_update_product(WP_REST_Request $request) {
    if (ob_get_length()) ob_clean();

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
        if (isset($params['name']))              $product->set_name(sanitize_text_field($params['name']));
        if (isset($params['status']))            $product->set_status(sanitize_text_field($params['status']));
        if (isset($params['sku']))               $product->set_sku(sanitize_text_field($params['sku']));
        if (isset($params['regular_price']))     $product->set_regular_price(sanitize_text_field($params['regular_price']));
        if (isset($params['sale_price']))        $product->set_sale_price(sanitize_text_field($params['sale_price']));
        if (isset($params['description']))       $product->set_description(wp_kses_post($params['description']));
        if (isset($params['short_description'])) $product->set_short_description(wp_kses_post($params['short_description']));

        if (isset($params['manage_stock'])) {
            $product->set_manage_stock(rest_sanitize_boolean($params['manage_stock']));
            if (isset($params['stock_quantity'])) {
                $product->set_stock_quantity(intval($params['stock_quantity']));
            }
        } else if (isset($params['stock_quantity']) && $params['stock_quantity'] === '') {
            $product->set_manage_stock(false);
            $product->set_stock_quantity('');
        }

        if (isset($params['image_id'])) {
            $product->set_image_id(intval($params['image_id']));
        }

        $product->save();

        if (ob_get_length()) ob_clean();
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
`;

code += endCode;

fs.writeFileSync('inc/seller-auth-api.php', code, 'utf8');
console.log('Cleaned API routes successfully.');
