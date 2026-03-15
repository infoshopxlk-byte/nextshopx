<?php
/**
 * Plugin Name: ShopX WooCommerce Bridge
 * Plugin URI:  https://next.shopx.lk
 * Description: Bridge plugin connecting the Next.js frontend to WooCommerce. Handles CORS, seller auth, product/order API enrichment, and checkout helpers.
 * Version:     2.0.0
 * Author:      ShopX
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// ── Silence output IMMEDIATELY so notices never pollute JSON ─────────────────
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
ob_start(); // Start output buffer — we'll clean it before every REST response


/**
 * ── CHECKOUT META HANDLER ────────────────────────────────────────────────────
 * Explicitly catch and save the _seller_id when a new order is created via
 * the WooCommerce checkout process (or REST API if it triggers this hook).
 */
add_action( 'woocommerce_checkout_update_order_meta', 'shopx_save_seller_id_to_order', 10, 2 );
function shopx_save_seller_id_to_order( $order_id, $data ) {
    if ( isset( $_POST['_seller_id'] ) ) {
        update_post_meta( $order_id, '_seller_id', sanitize_text_field( $_POST['_seller_id'] ) );
    } elseif ( isset( $_GET['_seller_id'] ) ) {
        update_post_meta( $order_id, '_seller_id', sanitize_text_field( $_GET['_seller_id'] ) );
    }
}

// REST API Support for Meta Data
add_action( 'woocommerce_rest_insert_shop_order_object', 'shopx_rest_save_seller_id', 10, 3 );
function shopx_rest_save_seller_id( $order, $request, $creating ) {
    $meta_data = $request->get_param( 'meta_data' );
    if ( is_array( $meta_data ) ) {
        foreach ( $meta_data as $meta ) {
            if ( isset( $meta['key'] ) && '_seller_id' === $meta['key'] ) {
                $order->update_meta_data( '_seller_id', $meta['value'] );
                $order->save();
                break;
            }
        }
    }
}

// ============================================================
// BOOT INSIDE plugins_loaded (priority 20): WooCommerce and
// all translation files are fully loaded at this point.
// ============================================================
add_action('plugins_loaded', function () {
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED & ~E_NOTICE & ~E_WARNING);
    @ini_set('display_errors', '0');
    error_log('ShopX Bridge Plugin: Loaded into memory (plugins_loaded).');

    // Before EVERY REST response, discard any buffered noise (notices, headers etc.)
    add_filter('rest_pre_serve_request', function ($served) {
        if (ob_get_level() > 0) {
            ob_end_clean();
        }
        return $served;
    }, 1);

    // Register API endpoints
    add_action('rest_api_init', 'shopx_register_category_api');
    add_action('rest_api_init', 'shopx_register_checkout_proxy_api');
}, 20);

// =========================================================================
// STRICT HEADLESS CORS PERMISSIONS
// =========================================================================
add_action('plugins_loaded', function () {
    add_action('rest_api_init', function () {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', function ($value) {
            $trusted_origins = array(
                'http://localhost:3000',
                'https://localhost:3000',
                'https://next.shopx.lk',
                'https://vendor.shopx.lk',
            );

            $origin = get_http_origin();
            $request_uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
            $is_jwt_route = strpos($request_uri, '/jwt-auth/v1/') !== false;

            if (in_array($origin, $trusted_origins)) {
                $allowed_origin = $origin;
            } elseif ($is_jwt_route) {
                $allowed_origin = $origin ? $origin : '*';
            } else {
                $allowed_origin = $origin;
            }

            if ($allowed_origin) {
                header('Access-Control-Allow-Origin: ' . $allowed_origin);
                header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE');
                header('Access-Control-Allow-Credentials: true');
                header('Access-Control-Allow-Headers: Authorization, X-WP-Nonce, Content-Type, X-Requested-With');

                if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
                    status_header(200);
                    exit;
                }
            }
            return $value;
        });
    }, 15);
}, 20);

// =========================================================================
// INJECT SELLER INFO INTO WOOCOMMERCE REST API PRODUCT RESPONSE
// =========================================================================
add_filter('woocommerce_rest_prepare_product_object', 'shopx_bridge_add_vendor_to_product_response', 10, 3);
function shopx_bridge_add_vendor_to_product_response($response, $object, $request)
{
    if (empty($response->data))
        return $response;

    $product_id = $object->get_id();

    // Get vendor from post author field
    $vendor_id = get_post_field('post_author', $product_id);

    if ($vendor_id && $vendor_id > 0) {
        $store_name = get_user_meta($vendor_id, 'store_name', true);

        // Final fallback to user display name
        if (empty($store_name)) {
            $user_info = get_userdata($vendor_id);
            if ($user_info) {
                $store_name = $user_info->display_name;
            }
        }

        if (!empty($store_name)) {
            $response->data['wcfm_store_info'] = array(
                'vendor_id' => intval($vendor_id),
                'store_name' => $store_name
            );
            $response->data['store'] = array(
                'vendor_id' => intval($vendor_id),
                'shop_name' => $store_name
            );
        }
    }

    return $response;
}

// =========================================================================
// INJECT SELLER SHIPPING COST INTO WOOCOMMERCE CHECKOUT RATES
// =========================================================================
add_filter('woocommerce_package_rates', 'shopx_bridge_apply_seller_shipping_costs', 10, 2);
function shopx_bridge_apply_seller_shipping_costs($rates, $package)
{
    $vendor_shipping_costs = array();

    foreach ($package['contents'] as $item_id => $values) {
        $product = $values['data'];
        if ($product) {
            $product_id = $product->get_id();
            if ($product->is_type('variation')) {
                $product_id = $product->get_parent_id();
            }

            $seller_shipping_cost = get_post_meta($product_id, '_seller_shipping_cost', true);
            $vendor_id = get_post_field('post_author', $product_id);

            if (is_numeric($seller_shipping_cost) && floatval($seller_shipping_cost) > 0) {
                if (!isset($vendor_shipping_costs[$vendor_id]) || floatval($seller_shipping_cost) > $vendor_shipping_costs[$vendor_id]) {
                    $vendor_shipping_costs[$vendor_id] = floatval($seller_shipping_cost);
                }
            }
        }
    }

    $total_seller_shipping = array_sum($vendor_shipping_costs);

    if ($total_seller_shipping > 0) {
        $taxes = WC_Tax::calc_shipping_tax($total_seller_shipping, WC_Tax::get_shipping_tax_rates());

        $rates = array();
        $rates['flat_rate:seller_shipping'] = new WC_Shipping_Rate(
            'flat_rate:seller_shipping',
            'Flat Rate',
            $total_seller_shipping,
            $taxes,
            'flat_rate'
        );
    }

    error_log("ShopX Shipping Checkout: Added total seller shipping = " . $total_seller_shipping);

    return $rates;
}

// =========================================================================
// CUSTOMER ORDER CANCELLATION ENDPOINT
// =========================================================================
add_action('rest_api_init', function () {
    register_rest_route('shopx/v1', '/customer/order/cancel', array(
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => 'shopx_bridge_customer_cancel_order',
    ));
});

function shopx_bridge_customer_cancel_order(WP_REST_Request $request)
{
    // CORS headers
    $trusted = array('http://localhost:3000', 'https://localhost:3000', 'https://next.shopx.lk');
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

    $params = $request->get_json_params();
    $order_id = isset($params['order_id']) ? intval($params['order_id']) : 0;
    $email = isset($params['email']) ? sanitize_email($params['email']) : '';
    $reason = isset($params['reason']) ? sanitize_text_field($params['reason']) : 'No reason provided';

    if (!$order_id || empty($email)) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Missing order ID or email.'), 400);
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Order not found.'), 404);
    }

    if (strtolower($order->get_billing_email()) !== strtolower($email)) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Unauthorized. Email does not match the order.'), 403);
    }

    $current_status = $order->get_status();
    if ($current_status === 'completed' || $current_status === 'rts') {
        return new WP_REST_Response(array('success' => false, 'message' => 'Order cannot be cancelled because it is already Ready to Ship.'), 400);
    }

    if ($current_status !== 'processing' && $current_status !== 'pending') {
        return new WP_REST_Response(array('success' => false, 'message' => 'Order cannot be cancelled in its current status.'), 400);
    }

    try {
        $cancel_note = "Customer cancelled the order. Reason: " . $reason;
        $order->update_status('cancelled', $cancel_note, true);

        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Order cancelled successfully.',
            'order_id' => $order_id
        ), 200);

    } catch (Exception $e) {
        error_log("ShopX Cancel Order Exception: " . $e->getMessage());
        return new WP_REST_Response(array('success' => false, 'message' => 'An error occurred while cancelling the order.'), 500);
    }
}

// ── Inject Store Name into WooCommerce Orders API ───────────────────────────
function shopx_inject_store_name_to_order_api($response, $order, $request)
{
    if (empty($response->data['line_items'])) {
        return $response;
    }

    foreach ($response->data['line_items'] as &$item) {
        $product_id = isset($item['product_id']) ? $item['product_id'] : 0;
        if ($product_id) {
            $vendor_id = get_post_field('post_author', $product_id);
            if ($vendor_id) {
                $store_name = get_user_meta($vendor_id, 'store_name', true);

                $item['wcfm_store_info'] = array(
                    'vendor_id' => $vendor_id,
                    'store_name' => $store_name ? $store_name : 'ShopX Vendor'
                );
            }
        }
    }
    return $response;
}

// ── Inject Full Variation Data into WooCommerce Product API ────────────────────
function shopx_enrich_product_json($response, $product, $request) {
    $data = $response->get_data();
    $product_id = $product->get_id();

    // Weight
    $data['weight'] = $product->get_weight();

    // Brand
    $brand = get_post_meta($product_id, '_product_brand', true);
    $data['brand'] = $brand ? $brand : 'No Brand';

    // Store Info
    $vendor_id = get_post_field('post_author', $product_id);
    if ($vendor_id) {
        $data['vendor_id'] = $vendor_id;
        $data['vendor_verified'] = get_user_meta($vendor_id, '_verified_seller', true) === 'yes';
    }

    // Categories
    $data['category_ids'] = $product->get_category_ids();

    $response->set_data($data);
    return $response;
}

function shopx_inject_variations_full_data($response, $product, $request)
{
    if ($product->get_type() === 'variable') {
        $available_variations = $product->get_available_variations();

        foreach ($available_variations as $key => $variation_data) {
            $variation_id = $variation_data['variation_id'];
            $variation_obj = wc_get_product($variation_id);

            if ($variation_obj) {
                $image_id = $variation_obj->get_image_id();
                if ($image_id) {
                    $available_variations[$key]['_thumbnail_id'] = $image_id;
                    $available_variations[$key]['variation_image_src'] = wp_get_attachment_image_url($image_id, 'full');
                }

                $available_variations[$key]['display_price'] = $variation_obj->get_price();
                $available_variations[$key]['display_regular_price'] = $variation_obj->get_regular_price();
                $available_variations[$key]['regular_price'] = $variation_obj->get_regular_price();
                $available_variations[$key]['sale_price'] = $variation_obj->get_sale_price();
                $available_variations[$key]['price'] = $variation_obj->get_price();
            }
        }

        $response->data['variations_full_data'] = $available_variations;
    }
    return $response;
}

add_action('plugins_loaded', function() {
    add_filter('woocommerce_rest_prepare_shop_order_object', 'shopx_inject_store_name_to_order_api', 10, 3);
    add_filter('woocommerce_rest_prepare_product_object', 'shopx_inject_variations_full_data', 10, 3);
    add_filter('woocommerce_rest_prepare_product_object', 'shopx_enrich_product_json', 10, 3);
});

// --- CATEGORY API ---
add_action('rest_api_init', 'shopx_register_category_api');
function shopx_register_category_api() {
    register_rest_route('shopx/v1', '/categories', [
        'methods' => 'GET',
        'callback' => 'shopx_get_all_categories',
        'permission_callback' => '__return_true',
    ]);
}

function shopx_get_all_categories() {
    $categories = get_terms([
        'taxonomy' => 'product_cat',
        'hide_empty' => false,
    ]);

    $data = [];
    foreach ($categories as $cat) {
        $data[] = [
            'id' => $cat->term_id,
            'name' => $cat->name,
            'slug' => $cat->slug,
            'count' => $cat->count
        ];
    }

    return new WP_REST_Response($data, 200);
}

// --- CHECKOUT PROXY (Weight-based Shipping) ---
add_action('rest_api_init', 'shopx_register_checkout_proxy_api');
function shopx_register_checkout_proxy_api() {
    register_rest_route('shopx/v1', '/checkout/proxy', [
        'methods' => 'POST',
        'callback' => 'shopx_checkout_proxy_handler',
        'permission_callback' => '__return_true',
    ]);
}

function shopx_checkout_proxy_handler(WP_REST_Request $request) {
    $order_id = $request->get_param('order_id');
    if (!$order_id) {
        return new WP_REST_Response(['success' => false, 'message' => 'Order ID is required'], 400);
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        return new WP_REST_Response(['success' => false, 'message' => 'Order not found'], 404);
    }

    // Dynamic Weight-based Calculation
    $total_weight = 0;
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        if ($product) {
            $item_weight = (float)$product->get_weight();
            $total_weight += ($item_weight * $item->get_quantity());
        }
    }

    $shipping_total = 0;
    if ($total_weight > 0) {
        $base_cost = 400;
        $extra_kg = ceil($total_weight) - 1;
        $shipping_total = $base_cost + (max(0, $extra_kg) * 100);
    }

    return new WP_REST_Response([
        'success' => true,
        'data' => [
            'order_id' => $order->get_id(),
            'total' => $order->get_total(),
            'shipping_total' => $shipping_total,
            'weight' => $total_weight,
            'currency' => $order->get_currency(),
            'status' => $order->get_status(),
        ]
    ], 200);
}

/**
 * Force grant payment capability to anyone with a valid order key.
 * Required for the Next.js checkout redirect to WooCommerce order-pay page.
 */
add_filter( 'user_has_cap', function( $allcaps, $caps, $args ) {
    if ( isset( $args[0] ) && 'pay_for_order' === $args[0] ) {
        if ( isset( $_GET['key'] ) || isset( $_GET['pay_for_order'] ) ) {
            $allcaps[$caps[0]] = true;
        }
    }
    return $allcaps;
}, 999, 3 );
add_filter( 'woocommerce_order_pay_is_protected', '__return_false', 999 );

// =========================================================================
// PLUGIN ACTIVATION: Create custom ShopX database tables
// =========================================================================
register_activation_hook( __FILE__, 'shopx_bridge_create_tables' );

function shopx_bridge_create_tables() {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    // ── Table 1: Vendor Earnings ──────────────────────────────────────────
    // Tracks per-order, per-product earnings for each vendor.
    $table_earnings = $wpdb->prefix . 'shopx_vendor_earnings';

    $sql_earnings = "CREATE TABLE {$table_earnings} (
        id            BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        order_id      BIGINT(20) UNSIGNED NOT NULL,
        vendor_id     BIGINT(20) UNSIGNED NOT NULL,
        product_id    BIGINT(20) UNSIGNED NOT NULL,
        gross_amount  DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
        net_amount    DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
        status        VARCHAR(50)         NOT NULL DEFAULT 'pending',
        created_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY order_id   (order_id),
        KEY vendor_id  (vendor_id)
    ) {$charset_collate};";

    dbDelta( $sql_earnings );

    // ── Table 2: Payout Requests ──────────────────────────────────────────
    // Tracks vendor withdrawal/payout requests.
    $table_payouts = $wpdb->prefix . 'shopx_payout_requests';

    $sql_payouts = "CREATE TABLE {$table_payouts} (
        id           BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        vendor_id    BIGINT(20) UNSIGNED NOT NULL,
        amount       DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
        status       VARCHAR(50)         NOT NULL DEFAULT 'pending',
        requested_at DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paid_at      DATETIME                         DEFAULT NULL,
        PRIMARY KEY  (id),
        KEY vendor_id (vendor_id),
        KEY status    (status)
    ) {$charset_collate};";

    dbDelta( $sql_payouts );

    error_log( 'ShopX Bridge: Custom tables created/verified on activation.' );
}

// =========================================================================
// VENDOR EARNINGS: Record per-item earnings when an order is completed
// =========================================================================
add_action( 'woocommerce_order_status_completed', 'shopx_bridge_record_vendor_earnings', 10, 1 );

function shopx_bridge_record_vendor_earnings( $order_id ) {
    global $wpdb;

    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        error_log( "ShopX Earnings: Could not load order {$order_id}." );
        return;
    }

    $earnings_table = $wpdb->prefix . 'shopx_vendor_earnings';

    foreach ( $order->get_items() as $item_id => $item ) {
        $product_id = $item->get_product_id();
        if ( ! $product_id ) {
            continue;
        }

        // Resolve vendor from product post_author
        $vendor_id = (int) get_post_field( 'post_author', $product_id );
        if ( $vendor_id <= 0 ) {
            error_log( "ShopX Earnings: No vendor found for product {$product_id} on order {$order_id}. Skipping." );
            continue;
        }

        // ── Duplicate guard ───────────────────────────────────────────────
        // Skip if a row already exists for this order + vendor + product
        // combination to prevent double-insertion on status toggling.
        $existing = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$earnings_table}
             WHERE order_id = %d AND vendor_id = %d AND product_id = %d
             LIMIT 1",
            $order_id,
            $vendor_id,
            $product_id
        ) );

        if ( $existing ) {
            error_log( "ShopX Earnings: Row already exists (id={$existing}) for order {$order_id} / vendor {$vendor_id} / product {$product_id}. Skipping." );
            continue;
        }

        // ── Earnings calculation ──────────────────────────────────────────
        // gross_amount = line total (qty × price, after discounts, excl. tax)
        $gross_amount = (float) $item->get_total();

        // net_amount = (gross × 92%) − LKR 30 flat processing fee, min 0
        $net_amount = max( 0, round( ( $gross_amount * 0.92 ) - 30, 2 ) );

        // ── Insert earnings row ───────────────────────────────────────────
        $inserted = $wpdb->insert(
            $earnings_table,
            array(
                'order_id'     => $order_id,
                'vendor_id'    => $vendor_id,
                'product_id'   => $product_id,
                'gross_amount' => number_format( $gross_amount, 2, '.', '' ),
                'net_amount'   => number_format( $net_amount,   2, '.', '' ),
                'status'       => 'completed',
                'created_at'   => current_time( 'mysql' ),
            ),
            array( '%d', '%d', '%d', '%s', '%s', '%s', '%s' )
        );

        if ( $inserted ) {
            error_log( "ShopX Earnings: Recorded for order {$order_id} / vendor {$vendor_id} / product {$product_id} — gross: {$gross_amount}, net: {$net_amount}." );
        } else {
            error_log( "ShopX Earnings: Insert failed for order {$order_id} / vendor {$vendor_id} / product {$product_id}. MySQL error: " . $wpdb->last_error );
        }
    }
}

// =========================================================================
// SELLER STATS ENDPOINT: GET /shopx/v1/seller/stats
// =========================================================================
// =========================================================================
// SELLER ENDPOINTS: STATS, STATS-SUMMARY, TRANSACTIONS
// =========================================================================
add_action( 'rest_api_init', function () {
    // Endpoint 1: For Dashboard (/stats)
    register_rest_route( 'shopx/v1', '/seller/stats', [
        'methods' => 'GET',
        'callback' => 'shopx_bridge_seller_stats',
        'permission_callback' => '__return_true',
    ]);

    // Endpoint 2: For Earnings Page (/stats-summary)
    register_rest_route( 'shopx/v1', '/seller/stats-summary', [
        'methods' => 'GET',
        'callback' => 'shopx_bridge_seller_stats', // එකම ෆන්ක්ෂන් එක පාවිච්චි කරන්න
        'permission_callback' => '__return_true',
    ]);

    // Endpoint 3: For Transactions (/transactions)
    register_rest_route( 'shopx/v1', '/seller/transactions', [
        'methods' => 'GET',
        'callback' => function() { return wp_send_json_success([]); }, // දැනට හිස්ව ලබා දෙන්න
        'permission_callback' => '__return_true',
    ]);

    // Endpoint 4: For Products Page (/products)
    register_rest_route( 'shopx/v1', '/seller/products', [
        'methods' => 'GET',
        'callback' => 'shopx_bridge_get_seller_products',
        'permission_callback' => '__return_true',
    ]);
} );

/**
 * SELLER PRODUCTS: GET /shopx/v1/seller/products
 */
function shopx_bridge_get_seller_products( WP_REST_Request $request ) {
    $seller_id = get_current_user_id();
    if ( ! $seller_id ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'Unauthorized' ), 401 );
    }

    $per_page = $request->get_param( 'per_page' ) ? (int) $request->get_param( 'per_page' ) : 10;
    $paged    = $request->get_param( 'page' ) ? (int) $request->get_param( 'page' ) : 1;

    $args = array(
        'post_type'      => 'product',
        'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
        'posts_per_page' => $per_page,
        'paged'          => $paged,
        'author'         => $seller_id,
        'orderby'        => 'date',
        'order'          => 'DESC'
    );

    $query = new WP_Query( $args );
    $products = array();

    if ( $query->have_posts() ) {
        while ( $query->have_posts() ) {
            $query->the_post();
            $product = wc_get_product( get_the_ID() );
            if ( ! $product ) continue;

            $categories = array();
            $terms = get_the_terms( get_the_ID(), 'product_cat' );
            if ( $terms && ! is_wp_error( $terms ) ) {
                foreach ( $terms as $term ) {
                    $categories[] = array( 'id' => $term->term_id, 'name' => $term->name );
                }
            }

            $products[] = array(
                'id'            => $product->get_id(),
                'name'          => $product->get_name(),
                'status'        => $product->get_status(),
                'price'         => (float) $product->get_price(),
                'regular_price' => (float) $product->get_regular_price(),
                'sale_price'    => $product->get_sale_price() ? (float) $product->get_sale_price() : null,
                'stock_status'  => $product->get_stock_status(),
                'categories'    => $categories,
                'permalink'     => get_permalink(),
                'date_created'  => $product->get_date_created() ? $product->get_date_created()->date( 'Y-m-d H:i:s' ) : '',
            );
        }
    }
    wp_reset_postdata();

    return new WP_REST_Response( array(
        'success'  => true,
        'products' => $products,
        'total'    => (int) $query->found_posts,
        'pages'    => (int) $query->max_num_pages,
    ), 200 );
}

function shopx_bridge_seller_stats( WP_REST_Request $request ) {
    $seller_id = get_current_user_id();
    if ( ! $seller_id ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'Unauthorized' ), 401 );
    }

    $args = array(
        'limit'      => -1,
        'status'     => array( 'processing', 'completed' ),
        'meta_query' => array(
            array(
                'key'     => '_seller_id',
                'value'   => $seller_id,
                'compare' => '='
            )
        )
    );

    $orders = wc_get_orders( $args );
    
    $gross_sales    = 0;
    $total_earnings = 0;
    $platform_fees  = 0;
    $order_count    = count( $orders );

    foreach ( $orders as $order ) {
        $total = (float) $order->get_total();
        $gross_sales += $total;
        
        // Fee Logic: 8% + 30 flat
        $fee = ( $total * 0.08 ) + 30;
        $net = max( 0, $total - $fee );
        
        $platform_fees  += $fee;
        $total_earnings += $net;
    }

    return new WP_REST_Response( array(
        'success' => true,
        'data'    => array(
            'net_earnings'    => round( $total_earnings, 2 ),
            'total_earnings'  => round( $total_earnings, 2 ),
            'gross_sales'     => round( $gross_sales, 2 ),
            'platform_fees'   => round( $platform_fees, 2 ),
            'balance'         => round( $total_earnings, 2 ),
            'order_count'     => $order_count,
            'total_orders'    => $order_count,
        )
    ), 200 );
}

// Endpoints handled in unified block above.

// =========================================================================
// SELLER ORDERS ENDPOINT: GET /shopx/v1/seller/orders
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/orders', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true', // Auth handled manually below
        'callback'            => 'shopx_bridge_seller_orders',
    ) );
} );

function shopx_bridge_seller_orders( WP_REST_Request $request ) {
    // ── Authentication ────────────────────────────────────────────────────
    $vendor_id = get_current_user_id();
    if ( ! $vendor_id ) {
        error_log("ShopX Bridge: Unauthorized request to /seller/orders (No authenticated user).");
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    error_log("ShopX Bridge: Seller User ID: " . $vendor_id);

    // ── Debug: Order #1421 Meta ───────────────────────────────────────────
    if ( wc_get_order( 1421 ) ) {
        error_log('Order Meta for #1421: ' . print_r( get_post_meta( 1421 ), true ) );
    }

    // ── Step 1: Fetch Orders via CUSTOM _seller_id ───────────────────────
    $args = array(
        'limit'      => 100,
        'status'     => array( 'wc-pending', 'wc-processing', 'wc-on-hold', 'wc-completed', 'wc-cancelled', 'wc-refunded', 'wc-rts' ),
        'orderby'    => 'date',
        'order'      => 'DESC',
        'meta_query' => array(
            array(
                'key'     => '_seller_id',
                'value'   => $vendor_id,
                'compare' => '='
            )
        )
    );

    $orders = wc_get_orders( $args );
    error_log( "ShopX Bridge: Found " . count( $orders ) . " orders via meta_query for vendor " . $vendor_id );

    // ── Step 2: Build the response ────────────────────────────────────────
    $result = array();

    foreach ( $orders as $order ) {
        $result[] = array(
            'id'            => (int) $order->get_id(),
            'status'        => $order->get_status(),
            'total'         => $order->get_total(),
            'date_created'  => $order->get_date_created() ? $order->get_date_created()->date( 'Y-m-d H:i:s' ) : null,
            'customer_name' => trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ),
            'billing'       => array(
                'first_name' => $order->get_billing_first_name(),
                'last_name'  => $order->get_billing_last_name(),
                'address_1'  => $order->get_billing_address_1(),
                'address_2'  => $order->get_billing_address_2(),
                'city'       => $order->get_billing_city(),
                'email'      => $order->get_billing_email(),
                'phone'      => $order->get_billing_phone(),
            ),
            'shipping'      => array(
                'first_name' => $order->get_shipping_first_name(),
                'last_name'  => $order->get_shipping_last_name(),
                'address_1'  => $order->get_shipping_address_1(),
                'address_2'  => $order->get_shipping_address_2(),
                'city'       => $order->get_shipping_city(),
            ),
            'line_items'    => array_map( function( $item ) {
                return array(
                    'name'     => $item->get_name(),
                    'quantity' => $item->get_quantity(),
                    'total'    => $item->get_total(),
                    'sku'      => $item->get_product() ? $item->get_product()->get_sku() : '',
                );
            }, array_values( $order->get_items() ) ),
            'shipping_total' => $order->get_shipping_total(),
        );
    }

    // Sorting by date just in case, though wc_get_orders handles it
    return new WP_REST_Response( $result, 200 );
}

add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/admin/vendors', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true', 
        'callback'            => 'shopx_bridge_admin_get_vendors',
    ) );
    
    register_rest_route( 'shopx/v1', '/admin/vendor-verify', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'shopx_bridge_admin_vendor_verify',
    ) );
} );

function shopx_bridge_admin_get_vendors( WP_REST_Request $request ) {
    if ( ! current_user_can( 'administrator' ) ) {
        $user_id = get_current_user_id();
        if (!$user_id || !user_can($user_id, 'administrator')) {
            return new WP_REST_Response( array( 'success' => false, 'message' => 'Unauthorized. Admin access required.' ), 403 );
        }
    }

    $args = array(
        'role'    => 'seller',
        'orderby' => 'user_registered',
        'order'   => 'DESC',
    );

    $users = get_users( $args );
    $vendors = array();

    foreach ( $users as $user ) {
        $store_name = get_user_meta( $user->ID, 'store_name', true );
        $status     = get_user_meta( $user->ID, 'vendor_status', true ) ?: 'active';
        
        $vendors[] = array(
            'id'            => $user->ID,
            'email'         => $user->user_email,
            'display_name'  => $user->display_name,
            'store_name'    => $store_name ? $store_name : $user->display_name,
            'registered'    => $user->user_registered,
            'status'        => $status,
            'kyc'           => array(
                'business_type'  => get_user_meta( $user->ID, 'business_type', true ),
                'nic_number'     => get_user_meta( $user->ID, 'nic_number', true ),
                'bank_details'   => get_user_meta( $user->ID, 'bank_details', true ),
                'phone'          => get_user_meta( $user->ID, 'billing_phone', true ),
                'address'        => get_user_meta( $user->ID, 'store_address', true ),
                'documents'      => array(
                    'nic_front'      => get_user_meta( $user->ID, 'nic_front_url', true ),
                    'nic_back'       => get_user_meta( $user->ID, 'nic_back_url', true ),
                    'br_document'    => get_user_meta( $user->ID, 'br_document_url', true ),
                    'bank_statement' => get_user_meta( $user->ID, 'bank_statement_url', true ),
                ),
                'rejection_history' => get_user_meta( $user->ID, 'rejection_history', true ) ?: array()
            )
        );
    }

    return new WP_REST_Response( array( 'success' => true, 'vendors' => $vendors ), 200 );
}

function shopx_bridge_admin_vendor_verify( WP_REST_Request $request ) {
    if ( ! current_user_can( 'administrator' ) ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'Unauthorized.' ), 403 );
    }

    $params    = $request->get_json_params();
    $vendor_id = isset( $params['vendor_id'] ) ? intval( $params['vendor_id'] ) : 0;
    $action    = isset( $params['action'] )    ? sanitize_text_field( $params['action'] ) : ''; // approve | reject
    $reason    = isset( $params['reason'] )    ? sanitize_textarea_field( $params['reason'] ) : '';

    if ( ! $vendor_id || ! in_array( $action, array( 'approve', 'reject' ) ) ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'Invalid parameters.' ), 400 );
    }

    if ( $action === 'approve' ) {
        update_user_meta( $vendor_id, 'vendor_status', 'active' );
    } else {
        update_user_meta( $vendor_id, 'vendor_status', 'rejected' );
        $history = get_user_meta( $vendor_id, 'rejection_history', true ) ?: array();
        $history[] = array(
            'reason' => $reason,
            'date'   => current_time( 'mysql' )
        );
        update_user_meta( $vendor_id, 'rejection_history', $history );
        update_user_meta( $vendor_id, 'rejection_reason', $reason ); // Latest reason for quick access
    }

    return new WP_REST_Response( array( 'success' => true, 'message' => "Vendor " . ucfirst($action) . "ed successfully." ), 200 );
}

// =========================================================================
// SELLER ROLE: Register a custom 'seller' WordPress role on init
// =========================================================================
add_action( 'rest_api_init', 'shopx_bridge_register_user_meta' );

function shopx_bridge_register_user_meta() {
    // පසුව මෙහි අවශ්ය meta fields register කළ හැක.
    // දැනට මෙය හිස්ව තැබීමෙන් crash එක නතර වේ.
}

/**
 * Expose custom meta in Standard WooCommerce REST API
 */
add_filter( 'woocommerce_rest_prepare_product_object', function( $response, $object, $request ) {
    if ( ! isset( $response->data ) ) return $response;
    
    $product_id = method_exists( $object, 'get_id' ) ? $object->get_id() : 0;
    if ( $product_id ) {
        $response->data['youtube_link'] = get_post_meta( $product_id, '_youtube_link', true ) ?: '';
    }
    return $response;
}, 10, 3 );

add_action( 'init', 'shopx_bridge_register_seller_role' );

function shopx_bridge_register_seller_role() {
    // get_role() returns null if the role doesn't exist yet — safe guard against duplicates
    if ( null === get_role( 'seller' ) ) {
        add_role(
            'seller',
            __( 'Seller', 'shopx' ),
            array(
                'read'         => true,  // Access WP admin (read-only)
                'upload_files' => true,  // Allow media uploads for product images
            )
        );
        error_log( 'ShopX Bridge: "seller" role created.' );
    }
}

// =========================================================================
// SELLER REGISTRATION ENDPOINT: POST /shopx/v1/seller/register
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/register', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'shopx_bridge_seller_register',
    ) );
} );

function shopx_bridge_seller_register( WP_REST_Request $request ) {
    // ── Handle both JSON and Multipart (for files) ───────────────────────
    $params = $request->get_params(); // Get all params (JSON or POST)

    // ── Input sanitization ────────────────────────────────────────────────
    $email        = isset( $params['email'] )        ? sanitize_email( $params['email'] )               : '';
    $username     = isset( $params['username'] )     ? sanitize_user( $params['username'], true )        : '';
    $password     = isset( $params['password'] )     ? $params['password']                               : '';
    $store_name   = isset( $params['store_name'] )   ? sanitize_text_field( $params['store_name'] )     : '';
    $first_name   = isset( $params['first_name'] )   ? sanitize_text_field( $params['first_name'] )     : '';
    $last_name    = isset( $params['last_name'] )    ? sanitize_text_field( $params['last_name'] )      : '';
    $phone        = isset( $params['phone'] )        ? sanitize_text_field( $params['phone'] )          : '';
    $description  = isset( $params['description'] )  ? sanitize_textarea_field( $params['description'] ) : '';
    $address      = isset( $params['address'] )      ? sanitize_text_field( $params['address'] )        : '';
    $biz_type     = isset( $params['business_type'] ) ? sanitize_text_field( $params['business_type'] )  : 'individual';
    $nic_number   = isset( $params['nic_number'] )    ? sanitize_text_field( $params['nic_number'] )     : '';
    $bank_details = isset( $params['bank_details'] )  ? sanitize_textarea_field( $params['bank_details'] ) : '';

    // ── Required field validation ─────────────────────────────────────────
    if ( empty( $email ) || ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'A valid email address is required.' ), 400 );
    }
    if ( empty( $username ) ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'A username is required.' ), 400 );
    }
    // Check if this is a re-submission or new creation
    $existing_user_id = email_exists( $email );
    $is_resubmission = false;
    
    if ( $existing_user_id ) {
        $status = get_user_meta( $existing_user_id, 'vendor_status', true );
        if ( $status === 'rejected' ) {
            $is_resubmission = true;
            $user_id = $existing_user_id;
        } else {
            return new WP_REST_Response( array( 'success' => false, 'message' => 'An account with this email already exists.' ), 409 );
        }
    } else {
        if ( username_exists( $username ) ) {
            return new WP_REST_Response( array( 'success' => false, 'message' => 'This username is already taken.' ), 409 );
        }
        if ( strlen( $password ) < 8 ) {
            return new WP_REST_Response( array( 'success' => false, 'message' => 'Password must be at least 8 characters.' ), 400 );
        }
    }

    if ( empty( $store_name ) ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'A store name is required.' ), 400 );
    }

    // ── Create or Update the WordPress user ───────────────────────────────
    if ( ! $is_resubmission ) {
        $user_id = wp_create_user( $username, $password, $email );
        if ( is_wp_error( $user_id ) ) {
            return new WP_REST_Response( array( 'success' => false, 'message' => $user_id->get_error_message() ), 500 );
        }
        $user = new WP_User( $user_id );
        $user->set_role( 'seller' );
    }

    // ── Save/Update details ───────────────────────────────────────────────
    wp_update_user( array(
        'ID'           => $user_id,
        'first_name'   => $first_name,
        'last_name'    => $last_name,
        'display_name' => trim( $first_name . ' ' . $last_name ) ?: $username,
    ) );

    update_user_meta( $user_id, 'store_name',         $store_name );
    update_user_meta( $user_id, 'billing_phone',      $phone );
    update_user_meta( $user_id, 'store_description',  $description );
    update_user_meta( $user_id, 'store_address',      $address );
    update_user_meta( $user_id, 'business_type',      $biz_type );
    update_user_meta( $user_id, 'nic_number',        $nic_number );
    update_user_meta( $user_id, 'bank_details',      $bank_details );
    update_user_meta( $user_id, 'vendor_status',      'pending' );

    // ── Handle File Uploads ───────────────────────────────────────────────
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    $files_to_upload = array(
        'nic_front'      => 'nic_front_url',
        'nic_back'       => 'nic_back_url',
        'br_document'    => 'br_document_url',
        'bank_statement' => 'bank_statement_url',
    );

    foreach ( $files_to_upload as $file_key => $meta_key ) {
        if ( ! empty( $_FILES[ $file_key ] ) ) {
            $upload = wp_handle_upload( $_FILES[ $file_key ], array( 'test_form' => false ) );
            if ( ! isset( $upload['error'] ) ) {
                update_user_meta( $user_id, $meta_key, $upload['url'] );
                // Store attachment ID for library visibility if needed
                $file_path = $upload['file'];
                $file_type = wp_check_filetype( basename( $file_path ), null );
                $attachment = array(
                    'post_mime_type' => $file_type['type'],
                    'post_title'     => preg_replace( '/\.[^.]+$/', '', basename( $file_path ) ),
                    'post_content'   => '',
                    'post_status'    => 'inherit',
                    'post_author'    => $user_id,
                );
                $attach_id = wp_insert_attachment( $attachment, $file_path );
                update_user_meta( $user_id, $meta_key . '_id', $attach_id );
            }
        }
    }

    error_log( "ShopX Bridge: " . ( $is_resubmission ? 'Resubmission' : 'New' ) . " seller registered — user_id={$user_id}, store={$store_name}." );

    return new WP_REST_Response(
        array(
            'success' => true,
            'message' => $is_resubmission ? 'Application resubmitted successfully.' : 'Seller account created successfully.',
            'user_id' => $user_id,
        ),
        201
    );
}

// =========================================================================
// SELLER LOGIN ENDPOINT: POST /shopx/v1/seller/login
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/login', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'shopx_bridge_seller_login',
    ) );
} );

function shopx_bridge_seller_login( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $username = isset( $params['username'] ) ? sanitize_user( $params['username'] ) : '';
    $password = isset( $params['password'] ) ? $params['password']                  : '';

    if ( empty( $username ) || empty( $password ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Username and password are required.' ),
            400
        );
    }

    // ── Step 1: Authenticate ──────────────────────────────────────────────
    $user = wp_authenticate( $username, $password );

    if ( is_wp_error( $user ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Invalid credentials.' ),
            403
        );
    }

    // ── Step 2: Role check ────────────────────────────────────────────────
    $allowed_roles = array( 'seller', 'administrator' );
    $user_roles    = (array) $user->roles;

    if ( empty( array_intersect( $user_roles, $allowed_roles ) ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied for this account type.' ),
            403
        );
    }

    // ── Step 3: Collect user payload ──────────────────────────────────────
    $store_name = get_user_meta( $user->ID, 'store_name', true );

    $user_payload = array(
        'success'      => true,
        'user_id'      => $user->ID,
        'display_name' => $user->display_name,
        'email'        => $user->user_email,
        'store_name'   => $store_name ?: '',
        'roles'        => $user_roles,
    );

    // ── Step 4: Generate JWT token ────────────────────────────────────────
    // Strategy 1: Use firebase/php-jwt directly (loaded by the JWT Auth plugin)
    // The JWT Auth plugin registers its secret as JWT_AUTH_SECRET_KEY in wp-config.php.
    $token = null;

    if ( defined( 'JWT_AUTH_SECRET_KEY' ) && class_exists( '\Firebase\JWT\JWT' ) ) {
        $issued_at  = time();
        $not_before = $issued_at;
        $expire     = $issued_at + ( DAY_IN_SECONDS * 7 ); // 7-day token

        $token_data = array(
            'iss'  => get_bloginfo( 'url' ),
            'iat'  => $issued_at,
            'nbf'  => $not_before,
            'exp'  => $expire,
            'data' => array(
                'user' => array(
                    'id' => $user->ID,
                ),
            ),
        );

        // The JWT Auth plugin uses HS256 — match it exactly so tokens are interchangeable
        $token = \Firebase\JWT\JWT::encode( $token_data, JWT_AUTH_SECRET_KEY, 'HS256' );
        error_log( "ShopX Login: JWT generated via Firebase\\JWT\\JWT for user {$user->ID}." );
    }

    // Strategy 2: Fallback — call the JWT Auth plugin's REST endpoint internally
    // via a server-side HTTP request so the plugin handles token generation itself.
    if ( ! $token && defined( 'JWT_AUTH_SECRET_KEY' ) ) {
        $jwt_endpoint = rest_url( 'jwt-auth/v1/token' );
        $jwt_response = wp_remote_post( $jwt_endpoint, array(
            'body'    => json_encode( array(
                'username' => $username,
                'password' => $password,
            ) ),
            'headers' => array( 'Content-Type' => 'application/json' ),
            'timeout' => 10,
        ) );

        if ( ! is_wp_error( $jwt_response ) ) {
            $jwt_body = json_decode( wp_remote_retrieve_body( $jwt_response ), true );
            if ( isset( $jwt_body['token'] ) ) {
                $token = $jwt_body['token'];
                error_log( "ShopX Login: JWT obtained via internal wp_remote_post for user {$user->ID}." );
            }
        }
    }

    // Strategy 3: No JWT plugin/secret available — return user data only.
    // The frontend can call /jwt-auth/v1/token directly with the same credentials.
    if ( $token ) {
        $user_payload['token'] = $token;
    } else {
        $user_payload['token']   = null;
        $user_payload['warning'] = 'JWT token could not be generated. Ensure the JWT Auth plugin is active and JWT_AUTH_SECRET_KEY is set in wp-config.php.';
        error_log( "ShopX Login: JWT generation skipped for user {$user->ID} — JWT_AUTH_SECRET_KEY not defined or Firebase\\JWT\\JWT class unavailable." );
    }

    return new WP_REST_Response( $user_payload, 200 );
}

// =========================================================================
// PAYOUT REQUEST ENDPOINT: POST /shopx/v1/seller/payout-request
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/payout-request', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // Auth handled manually below
        'callback'            => 'shopx_bridge_seller_payout_request',
    ) );
} );

function shopx_bridge_seller_payout_request( WP_REST_Request $request ) {
    // ── Authentication ────────────────────────────────────────────────────
    $vendor_id = get_current_user_id();
    if ( ! $vendor_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    // ── Role check: seller or administrator only ───────────────────────────
    $user          = new WP_User( $vendor_id );
    $allowed_roles = array( 'seller', 'administrator' );
    if ( empty( array_intersect( (array) $user->roles, $allowed_roles ) ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied for this account type.' ),
            403
        );
    }

    // ── Input validation ──────────────────────────────────────────────────
    $params = $request->get_json_params();
    $amount = isset( $params['amount'] ) ? floatval( $params['amount'] ) : 0;

    if ( $amount <= 0 ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Payout amount must be greater than zero.' ),
            400
        );
    }

    global $wpdb;
    $earnings_table = $wpdb->prefix . 'shopx_vendor_earnings';
    $payouts_table  = $wpdb->prefix . 'shopx_payout_requests';

    // ── Balance check: sum of net_amount where status = 'pending' ─────────
    $pending_balance = (float) $wpdb->get_var( $wpdb->prepare(
        "SELECT COALESCE( SUM( net_amount ), 0 )
         FROM {$earnings_table}
         WHERE vendor_id = %d AND status = 'pending'",
        $vendor_id
    ) );

    if ( $amount > $pending_balance ) {
        return new WP_REST_Response(
            array(
                'success'         => false,
                'message'         => 'Insufficient balance. Your pending balance is ' . number_format( $pending_balance, 2 ) . '.',
                'pending_balance' => $pending_balance,
            ),
            400
        );
    }

    // ── Insert payout request ─────────────────────────────────────────────
    $inserted = $wpdb->insert(
        $payouts_table,
        array(
            'vendor_id'    => $vendor_id,
            'amount'       => number_format( $amount, 2, '.', '' ),
            'status'       => 'pending',
            'requested_at' => current_time( 'mysql' ),
        ),
        array( '%d', '%s', '%s', '%s' )
    );

    if ( ! $inserted ) {
        error_log( "ShopX Payout: DB insert failed for vendor {$vendor_id}. Error: " . $wpdb->last_error );
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Failed to submit payout request. Please try again.' ),
            500
        );
    }

    $request_id = $wpdb->insert_id;
    error_log( "ShopX Payout: New request ID={$request_id} for vendor {$vendor_id}, amount={$amount}." );

    return new WP_REST_Response(
        array(
            'success'    => true,
            'message'    => 'Payout request submitted successfully.',
            'request_id' => $request_id,
            'vendor_id'  => $vendor_id,
            'amount'     => $amount,
            'status'     => 'pending',
        ),
        201
    );
}

// =========================================================================
// SELLER: CREATE PRODUCT — POST /shopx/v1/seller/products
// Bypasses JWT auth issues: uses WordPress session via get_current_user_id().
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/products', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // Auth handled manually below
        'callback'            => 'shopx_bridge_seller_create_product',
    ) );
} );

function shopx_bridge_seller_create_product( WP_REST_Request $request ) {
    // ── Authentication ────────────────────────────────────────────────────
    $vendor_id = get_current_user_id();
    if ( ! $vendor_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    // ── Role check ────────────────────────────────────────────────────────
    $user          = new WP_User( $vendor_id );
    $allowed_roles = array( 'seller', 'administrator' );
    if ( empty( array_intersect( (array) $user->roles, $allowed_roles ) ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied for this account type.' ),
            403
        );
    }

    // ── Input sanitization ────────────────────────────────────────────────
    $params       = $request->get_json_params();
    $title        = isset( $params['title'] )        ? sanitize_text_field( $params['title'] )        : '';
    $price        = isset( $params['price'] )        ? floatval( $params['price'] )                   : 0;
    $description  = isset( $params['description'] )  ? wp_kses_post( $params['description'] )         : '';
    $category_ids = isset( $params['category_ids'] ) ? array_map( 'intval', (array) $params['category_ids'] ) : array();
    $youtube_link = isset( $params['youtube_link'] ) ? sanitize_text_field( $params['youtube_link'] )   : '';

    if ( empty( $title ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Product title is required.' ),
            400
        );
    }
    if ( $price <= 0 ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Product price must be greater than zero.' ),
            400
        );
    }

    // ── Create WooCommerce product post ───────────────────────────────────
    $product_id = wp_insert_post( array(
        'post_title'   => $title,
        'post_content' => $description,
        'post_status'  => 'publish',
        'post_type'    => 'product',
        'post_author'  => $vendor_id, // Vendor ownership — used by all seller endpoints
    ), true );

    if ( is_wp_error( $product_id ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => $product_id->get_error_message() ),
            500
        );
    }

    // ── Set pricing meta ──────────────────────────────────────────────────
    $price_str = number_format( $price, 2, '.', '' );
    update_post_meta( $product_id, '_regular_price', $price_str );
    update_post_meta( $product_id, '_price',         $price_str ); // Required for WC catalog queries
    update_post_meta( $product_id, '_sale_price',    '' );
    update_post_meta( $product_id, '_manage_stock',  'no' );
    update_post_meta( $product_id, '_stock_status',  'instock' );
    update_post_meta( $product_id, '_visibility',    'visible' );

    // ── Assign product type: 'simple' ─────────────────────────────────────
    wp_set_object_terms( $product_id, 'simple', 'product_type' );

    // ── Assign categories ─────────────────────────────────────────────────
    if ( ! empty( $category_ids ) ) {
        wp_set_object_terms( $product_id, $category_ids, 'product_cat' );
    }

    // ── Save YouTube Link ─────────────────────────────────────────────────
    update_post_meta( $product_id, '_youtube_link', $youtube_link );

    // ── Clear WC transients so product appears in catalog immediately ─────
    if ( function_exists( 'wc_delete_product_transients' ) ) {
        wc_delete_product_transients( $product_id );
    }

    error_log( "ShopX Products: Created product ID={$product_id} by vendor {$vendor_id}, price={$price_str}." );

    return new WP_REST_Response(
        array(
            'success'      => true,
            'message'      => 'Product created successfully.',
            'product_id'   => $product_id,
            'title'        => $title,
            'price'        => $price,
            'vendor_id'    => $vendor_id,
            'category_ids' => $category_ids,
            'edit_url'     => admin_url( "post.php?post={$product_id}&action=edit" ),
        ),
        201
    );
}

// =========================================================================
// SELLER: LIST OWN PRODUCTS — GET /shopx/v1/seller/products
// Uses WP_Query filtered by post_author — completely bypasses the
// WooCommerce REST woocommerce_rest_cannot_view permission check.
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/products', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true', // Auth handled manually below
        'callback'            => 'shopx_bridge_seller_list_products',
    ) );
} );

function shopx_bridge_seller_list_products( WP_REST_Request $request ) {
    // ── Authentication ────────────────────────────────────────────────────
    $vendor_id = get_current_user_id();
    if ( ! $vendor_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    // ── Role check ────────────────────────────────────────────────────────
    $user          = new WP_User( $vendor_id );
    $allowed_roles = array( 'seller', 'administrator' );
    if ( empty( array_intersect( (array) $user->roles, $allowed_roles ) ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied for this account type.' ),
            403
        );
    }

    // ── Query: products authored by this vendor only ───────────────────────
    // Using WP_Query directly (not WC REST) so the standard
    // woocommerce_rest_cannot_view capability check is never invoked.
    $paged = max( 1, (int) $request->get_param( 'page' ) );
    $limit = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 20 ) ) );

    $query = new WP_Query( array(
        'post_type'      => 'product',
        'post_status'    => array( 'publish', 'draft', 'pending' ),
        'author'         => $vendor_id,   // ← Key: filter by vendor ownership
        'posts_per_page' => $limit,
        'paged'          => $paged,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => false,
    ) );

    $products = array();

    foreach ( $query->posts as $post ) {
        $regular_price = get_post_meta( $post->ID, '_regular_price', true );
        $sale_price    = get_post_meta( $post->ID, '_sale_price',    true );
        $stock_status  = get_post_meta( $post->ID, '_stock_status',  true );

        // Gather assigned category names
        $cats       = get_the_terms( $post->ID, 'product_cat' );
        $categories = array();
        if ( $cats && ! is_wp_error( $cats ) ) {
            foreach ( $cats as $cat ) {
                if ( 'product_type' !== $cat->taxonomy ) {
                    $categories[] = array( 'id' => $cat->term_id, 'name' => $cat->name );
                }
            }
        }

        // Gather images: featured + gallery
        $images        = array();
        $thumbnail_id  = get_post_thumbnail_id( $post->ID );
        if ( $thumbnail_id ) {
            $src = wp_get_attachment_image_url( $thumbnail_id, 'full' );
            if ( $src ) {
                $images[] = array( 'id' => (int) $thumbnail_id, 'src' => $src );
            }
        }
        $gallery_ids = array_filter( array_map( 'intval',
            explode( ',', get_post_meta( $post->ID, '_product_image_gallery', true ) )
        ) );
        foreach ( $gallery_ids as $gid ) {
            $gsrc = wp_get_attachment_image_url( $gid, 'full' );
            if ( $gsrc ) {
                $images[] = array( 'id' => $gid, 'src' => $gsrc );
            }
        }

        $products[] = array(
            'id'            => $post->ID,
            'name'          => $post->post_title,
            'status'        => $post->post_status,
            'price'         => $sale_price !== '' ? (float) $sale_price : (float) $regular_price,
            'regular_price' => (float) $regular_price,
            'sale_price'    => $sale_price !== '' ? (float) $sale_price : null,
            'stock_status'  => $stock_status ?: 'instock',
            'categories'    => $categories,
            'images'        => $images,
            'permalink'     => get_permalink( $post->ID ),
            'youtube_link'  => get_post_meta( $post->ID, '_youtube_link', true ) ?: '',
            'date_created'  => $post->post_date,
        );
    }

    return new WP_REST_Response(
        array(
            'success'     => true,
            'vendor_id'   => $vendor_id,
            'total'       => (int) $query->found_posts,
            'page'        => $paged,
            'per_page'    => $limit,
            'total_pages' => (int) $query->max_num_pages,
            'products'    => $products,
        ),
        200
    );
}

// =========================================================================
// SELLER: UPDATE PRODUCT — PUT /shopx/v1/seller/product/update
// Verifies post_author ownership — no WooCommerce permission layer involved.
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/product/update', array(
        'methods'             => 'POST, PUT', // Accept both; Next.js sends POST
        'permission_callback' => '__return_true',
        'callback'            => 'shopx_bridge_seller_update_product',
    ) );
} );

function shopx_bridge_seller_update_product( WP_REST_Request $request ) {
    // ── Auth ──────────────────────────────────────────────────────────────
    $vendor_id = get_current_user_id();
    if ( ! $vendor_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    $user          = new WP_User( $vendor_id );
    $allowed_roles = array( 'seller', 'administrator' );
    if ( empty( array_intersect( (array) $user->roles, $allowed_roles ) ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied for this account type.' ),
            403
        );
    }

    // ── Input ─────────────────────────────────────────────────────────────
    $params      = $request->get_json_params();
    $product_id  = isset( $params['id'] )          ? (int) $params['id']                               : 0;
    $title       = isset( $params['title'] )        ? sanitize_text_field( $params['title'] )           : null;
    $price       = isset( $params['price'] )        ? floatval( $params['price'] )                      : null;
    $description = isset( $params['description'] )  ? wp_kses_post( $params['description'] )            : null;
    $cat_ids      = isset( $params['category_ids'] ) ? array_map( 'intval', (array) $params['category_ids'] ) : null;
    $image_ids    = isset( $params['image_ids'] )    ? array_map( 'intval', (array) $params['image_ids'] )   : null;
    $youtube_link = isset( $params['youtube_link'] ) ? sanitize_text_field( $params['youtube_link'] )   : null;

    if ( ! $product_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Product ID is required.' ),
            400
        );
    }

    // ── Ownership check ───────────────────────────────────────────────────
    $post = get_post( $product_id );
    if ( ! $post || 'product' !== $post->post_type ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Product not found.' ),
            404
        );
    }

    // Administrators can edit any product; sellers only their own
    if ( ! in_array( 'administrator', (array) $user->roles, true ) ) {
        if ( (int) $post->post_author !== $vendor_id ) {
            return new WP_REST_Response(
                array( 'success' => false, 'message' => 'You do not have permission to edit this product.' ),
                403
            );
        }
    }

    // ── Update post fields ────────────────────────────────────────────────
    $update_args = array( 'ID' => $product_id );
    if ( null !== $title )       $update_args['post_title']   = $title;
    if ( null !== $description ) $update_args['post_content'] = $description;

    if ( count( $update_args ) > 1 ) {
        $result = wp_update_post( $update_args, true );
        if ( is_wp_error( $result ) ) {
            return new WP_REST_Response(
                array( 'success' => false, 'message' => $result->get_error_message() ),
                500
            );
        }
    }

    // ── Pricing meta ─────────────────────────────────────────────────────
    if ( null !== $price ) {
        $price_str = number_format( $price, 2, '.', '' );
        update_post_meta( $product_id, '_regular_price', $price_str );
        update_post_meta( $product_id, '_price',         $price_str );
    }

    // ── Categories ───────────────────────────────────────────────────────
    if ( null !== $cat_ids ) {
        wp_set_object_terms( $product_id, $cat_ids, 'product_cat' );
    }

    // ── Images ───────────────────────────────────────────────────────────
    if ( ! empty( $image_ids ) ) {
        // First ID becomes the featured (thumbnail) image
        set_post_thumbnail( $product_id, $image_ids[0] );

        // Remaining IDs become the product gallery
        $gallery = array_slice( $image_ids, 1 );
        update_post_meta( $product_id, '_product_image_gallery', implode( ',', $gallery ) );
    }

    // ── Update YouTube Link ───────────────────────────────────────────────
    if ( null !== $youtube_link ) {
        update_post_meta( $product_id, '_youtube_link', $youtube_link );
    }

    // ── Clear WC transients ───────────────────────────────────────────────
    if ( function_exists( 'wc_delete_product_transients' ) ) {
        wc_delete_product_transients( $product_id );
    }

    error_log( "ShopX Products: Updated product ID={$product_id} by vendor {$vendor_id}." );

    return new WP_REST_Response(
        array(
            'success'    => true,
            'message'    => 'Product updated successfully.',
            'product_id' => $product_id,
        ),
        200
    );
}

// =========================================================================
// SELLER: MEDIA UPLOAD — POST /shopx/v1/seller/media/upload
// Accepts multipart/form-data with a 'file' field.
// Returns attachment_id + url for use with PUT /seller/product/update.
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/media/upload', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // Auth handled manually below
        'callback'            => 'shopx_bridge_seller_media_upload',
    ) );
} );

function shopx_bridge_seller_media_upload( WP_REST_Request $request ) {
    // ── Auth ──────────────────────────────────────────────────────────────
    $vendor_id = get_current_user_id();
    if ( ! $vendor_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    $user          = new WP_User( $vendor_id );
    $allowed_roles = array( 'seller', 'administrator' );
    if ( empty( array_intersect( (array) $user->roles, $allowed_roles ) ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied for this account type.' ),
            403
        );
    }

    // ── File presence check ───────────────────────────────────────────────
    if ( empty( $_FILES['file'] ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'No file uploaded. Send the image as multipart/form-data with the key "file".' ),
            400
        );
    }

    // ── MIME type whitelist ───────────────────────────────────────────────
    $allowed_mimes = array(
        'jpg|jpeg|jpe' => 'image/jpeg',
        'gif'          => 'image/gif',
        'png'          => 'image/png',
        'webp'         => 'image/webp',
    );

    // ── Load WordPress upload utilities ───────────────────────────────────
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    // ── Handle upload via WordPress (validates, moves to /uploads/) ───────
    $upload_overrides = array(
        'test_form' => false,         // Allow REST uploads (no nonce form check)
        'mimes'     => $allowed_mimes,
    );

    $uploaded = wp_handle_upload( $_FILES['file'], $upload_overrides );

    if ( isset( $uploaded['error'] ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => $uploaded['error'] ),
            422
        );
    }

    // ── Create attachment post ────────────────────────────────────────────
    $file_path = $uploaded['file'];
    $file_url  = $uploaded['url'];
    $file_type = wp_check_filetype( basename( $file_path ), null );

    $attachment_data = array(
        'post_mime_type' => $file_type['type'],
        'post_title'     => preg_replace( '/\.[^.]+$/', '', basename( $file_path ) ),
        'post_content'   => '',
        'post_status'    => 'inherit',
        'post_author'    => $vendor_id,
    );

    $attachment_id = wp_insert_attachment( $attachment_data, $file_path );

    if ( is_wp_error( $attachment_id ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => $attachment_id->get_error_message() ),
            500
        );
    }

    // Generate image sizes (thumbnail, medium, large…)
    $metadata = wp_generate_attachment_metadata( $attachment_id, $file_path );
    wp_update_attachment_metadata( $attachment_id, $metadata );

    error_log( "ShopX Media: Uploaded attachment ID={$attachment_id} by vendor {$vendor_id}, url={$file_url}." );

    return new WP_REST_Response(
        array(
            'success'       => true,
            'attachment_id' => $attachment_id,
            'url'           => $file_url,
        ),
        201
    );
}

// =========================================================================
// SELLER: GET SINGLE PRODUCT — GET /shopx/v1/seller/product?id=<product_id>
// Returns all fields needed by the Edit Product page.
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/seller/product', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => 'shopx_bridge_seller_get_product',
    ) );
    
    // Route 2: /seller/products/{id} (for simpler proxy calls)
    register_rest_route( 'shopx/v1', '/seller/products/(?P<id>\d+)', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => 'shopx_bridge_seller_get_product',
    ) );
} );

function shopx_bridge_seller_get_product( WP_REST_Request $request ) {
    // ── Auth ──────────────────────────────────────────────────────────────
    $vendor_id = get_current_user_id();
    if ( ! $vendor_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    $user          = new WP_User( $vendor_id );
    $allowed_roles = array( 'seller', 'administrator' );
    if ( empty( array_intersect( (array) $user->roles, $allowed_roles ) ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied for this account type.' ),
            403
        );
    }

    // ── Input ─────────────────────────────────────────────────────────────
    // Support both /seller/product?id=123 AND /seller/products/123
    $product_id = (int) $request->get_param( 'id' );
    if ( ! $product_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Product ID (id) is required.' ),
            400
        );
    }

    // ── Fetch & ownership check ───────────────────────────────────────────
    $post = get_post( $product_id );
    if ( ! $post || 'product' !== $post->post_type ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Product not found.' ),
            404
        );
    }

    if ( ! in_array( 'administrator', (array) $user->roles, true ) ) {
        if ( (int) $post->post_author !== $vendor_id ) {
            return new WP_REST_Response(
                array( 'success' => false, 'message' => 'You do not have permission to view this product.' ),
                403
            );
        }
    }

    // ── Pricing ───────────────────────────────────────────────────────────
    $regular_price = get_post_meta( $product_id, '_regular_price', true );
    $sale_price    = get_post_meta( $product_id, '_sale_price',    true );
    $stock_status  = get_post_meta( $product_id, '_stock_status',  true );

    // ── Categories (return both id and name) ──────────────────────────────
    $cat_terms  = get_the_terms( $product_id, 'product_cat' );
    $categories = array();
    $cat_ids    = array();
    if ( $cat_terms && ! is_wp_error( $cat_terms ) ) {
        foreach ( $cat_terms as $term ) {
            if ( 'product_type' !== $term->taxonomy ) {
                $categories[] = array( 'id' => (int) $term->term_id, 'name' => $term->name );
                $cat_ids[]    = (int) $term->term_id;
            }
        }
    }

    // ── Images: featured + gallery ────────────────────────────────────────
    $images       = array();
    $thumbnail_id = get_post_thumbnail_id( $product_id );
    if ( $thumbnail_id ) {
        $src = wp_get_attachment_image_url( $thumbnail_id, 'full' );
        if ( $src ) {
            $images[] = array( 'id' => (int) $thumbnail_id, 'src' => $src );
        }
    }
    $gallery_ids = array_filter( array_map( 'intval',
        explode( ',', get_post_meta( $product_id, '_product_image_gallery', true ) )
    ) );
    foreach ( $gallery_ids as $gid ) {
        $gsrc = wp_get_attachment_image_url( $gid, 'full' );
        if ( $gsrc ) {
            $images[] = array( 'id' => $gid, 'src' => $gsrc );
        }
    }

    return new WP_REST_Response(
        array(
            'success' => true,
            'product' => array(
                'id'            => $post->ID,
                'title'         => $post->post_title,
                'description'   => $post->post_content,
                'status'        => $post->post_status,
                'price'         => $regular_price !== '' ? (float) $regular_price : null,
                'regular_price' => $regular_price !== '' ? (float) $regular_price : null,
                'sale_price'    => $sale_price    !== '' ? (float) $sale_price    : null,
                'stock_status'  => $stock_status ?: 'instock',
                'categories'    => $categories,
                'category_ids'  => $cat_ids,
                'images'        => $images,
                'youtube_link'  => get_post_meta( $product_id, '_youtube_link', true ) ?: '',
                'permalink'     => get_permalink( $product_id ),
                'date_created'  => $post->post_date,
            ),
        ),
        200
    );
}
// =========================================================================
// ADMIN: LIST PENDING PAYOUTS — GET /shopx/v1/admin/payouts
// Returns all payout requests with 'pending' status.
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/admin/payouts', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true', // Auth handled manually below
        'callback'            => 'shopx_bridge_admin_get_payouts',
    ) );
} );

function shopx_bridge_admin_get_payouts( WP_REST_Request $request ) {
    // ── Auth ──────────────────────────────────────────────────────────────
    $admin_id = get_current_user_id();
    if ( ! $admin_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    $user = new WP_User( $admin_id );
    if ( ! in_array( 'administrator', (array) $user->roles ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied. Administrator only.' ),
            403
        );
    }

    global $wpdb;
    $payouts_table = $wpdb->prefix . 'shopx_payout_requests';

    // ── Fetch all pending payouts ─────────────────────────────────────────
    $payouts = $wpdb->get_results(
        "SELECT * FROM {$payouts_table} WHERE status = 'pending' ORDER BY requested_at DESC"
    );

    $result = array();
    foreach ( $payouts as $p ) {
        $store_name = get_user_meta( $p->vendor_id, 'store_name', true );
        if ( empty( $store_name ) ) {
            $vendor = get_userdata( $p->vendor_id );
            $store_name = $vendor ? $vendor->display_name : 'Unknown Vendor';
        }

        $result[] = array(
            'id'           => (int) $p->id,
            'vendor_id'    => (int) $p->vendor_id,
            'store_name'   => $store_name,
            'amount'       => (float) $p->amount,
            'status'       => $p->status,
            'requested_at' => $p->requested_at,
        );
    }

    return new WP_REST_Response(
        array(
            'success' => true,
            'payouts' => $result,
        ),
        200
    );
}

// =========================================================================
// ADMIN: APPROVE PAYOUT — POST /shopx/v1/admin/payout-approve
// Updates status to 'completed' and sets paid_at.
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/admin/payout-approve', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // Auth handled manually below
        'callback'            => 'shopx_bridge_admin_approve_payout',
    ) );
} );

function shopx_bridge_admin_approve_payout( WP_REST_Request $request ) {
    // ── Auth ──────────────────────────────────────────────────────────────
    $admin_id = get_current_user_id();
    if ( ! $admin_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Unauthorized. You must be logged in.' ),
            401
        );
    }

    $user = new WP_User( $admin_id );
    if ( ! in_array( 'administrator', (array) $user->roles ) ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Access denied. Administrator only.' ),
            403
        );
    }

    $params     = $request->get_json_params();
    $request_id = isset( $params['request_id'] ) ? (int) $params['request_id'] : 0;

    if ( ! $request_id ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Request ID is required.' ),
            400
        );
    }

    global $wpdb;
    $payouts_table = $wpdb->prefix . 'shopx_payout_requests';

    // ── Check if request exists and is pending ────────────────────────────
    $payout = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$payouts_table} WHERE id = %d",
        $request_id
    ) );

    if ( ! $payout ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Payout request not found.' ),
            404
        );
    }

    if ( $payout->status !== 'pending' ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Only pending payouts can be approved.' ),
            400
        );
    }

    // ── Update payout status ──────────────────────────────────────────────
    $updated = $wpdb->update(
        $payouts_table,
        array(
            'status'  => 'completed',
            'paid_at' => current_time( 'mysql' ),
        ),
        array( 'id' => $request_id ),
        array( '%s', '%s' ),
        array( '%d' )
    );

    if ( false === $updated ) {
        return new WP_REST_Response(
            array( 'success' => false, 'message' => 'Failed to update payout request.' ),
            500
        );
    }

    error_log( "ShopX Payout: Request ID={$request_id} approved by admin {$admin_id}." );

    return new WP_REST_Response(
        array(
            'success'    => true,
            'message'    => 'Payout request approved and marked as completed.',
            'request_id' => $request_id,
        ),
        200
    );
}

// =========================================================================
// COD ORDER AUTO-FIX: Automatically set COD orders to 'processing'
// =========================================================================
add_action( 'woocommerce_thankyou', 'shopx_bridge_auto_process_cod_orders', 10, 1 );
function shopx_bridge_auto_process_cod_orders( $order_id ) {
    if ( ! $order_id ) {
        return;
    }

    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return;
    }

    if ( $order->get_payment_method() === 'cod' ) {
        if ( in_array( $order->get_status(), array( 'pending', 'pending-payment' ) ) ) {
            $order->update_status( 'processing', 'COD order automatically set to processing for seller visibility.', true );
            error_log( "ShopX COD Fix: Order {$order_id} automatically set to processing via thankyou hook." );
        }
    }
}

// =========================================================================
// JWT AUTH HELPER: Ensure get_current_user_id() works with Bearer tokens
// =========================================================================
add_filter( 'determine_current_user', function( $user_id ) {
    if ( $user_id ) {
        return $user_id;
    }

    $header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : ( isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '' );
    
    if ( ! empty( $header ) && preg_match( '/Bearer\s+(.*)$/i', $header, $matches ) ) {
        $token = $matches[1];
        
        if ( defined( 'JWT_AUTH_SECRET_KEY' ) && class_exists( '\Firebase\JWT\JWT' ) ) {
            try {
                // Compatibility for both old and new firebase/php-jwt versions
                if ( method_exists( '\Firebase\JWT\JWT', 'decode' ) ) {
                    // Try new way (php-jwt 6.x+)
                    if ( class_exists( '\Firebase\JWT\Key' ) ) {
                        $decoded = \Firebase\JWT\JWT::decode( $token, new \Firebase\JWT\Key( JWT_AUTH_SECRET_KEY, 'HS256' ) );
                    } else {
                        // Older way (php-jwt 5.x)
                        $decoded = \Firebase\JWT\JWT::decode( $token, JWT_AUTH_SECRET_KEY, array( 'HS256' ) );
                    }
                    
                    if ( isset( $decoded->data->user->id ) ) {
                        return $decoded->data->user->id;
                    }
                }
            } catch ( \Exception $e ) {
                error_log( 'ShopX JWT Auth Filter Error: ' . $e->getMessage() );
            }
        }
    }
    
    return $user_id;
}, 20 );

// 1. Define the Column Header
add_filter( 'manage_edit-shop_order_columns', 'shopx_set_custom_edit_order_columns' );
function shopx_set_custom_edit_order_columns($columns) {
    $columns['seller_column'] = 'Seller'; // Slug එක 'seller_column' ලෙස වෙනස් කළා
    return $columns;
}

// 2. Populate the Column Data
add_action( 'manage_shop_order_posts_custom_column' , 'shopx_custom_order_column', 20, 2 );
function shopx_custom_order_column( $column, $post_id ) {
    if ( 'seller_column' === $column ) {
        // Try getting meta from the order object directly for better compatibility
        $order = wc_get_order( $post_id );
        $seller_id = $order ? $order->get_meta( '_seller_id' ) : ''; 

        if ( ! empty( $seller_id ) ) {
            $user = get_userdata( $seller_id );
            if ( $user ) {
                echo '<strong>' . esc_html( $user->display_name ) . '</strong><br><small>ID: ' . esc_html( $seller_id ) . '</small>';
            } else {
                echo 'User ID: ' . esc_html( $seller_id );
            }
        } else {
            echo '<span style="color:#999;">No Seller</span>';
        }
    }
}

// =========================================================================
// PUBLIC: GET VENDOR DETAILS BY SLUG — GET /shopx/v1/vendors/{slug}
// =========================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'shopx/v1', '/store-details/(?P<slug>.+)', array(
        'methods'  => 'GET',
        'callback' => 'shopx_bridge_get_store_details_by_slug',
        'permission_callback' => '__return_true'
    ) );

    register_rest_route( 'shopx/v1', '/vendor-products/(?P<id>\d+)', array(
        'methods'  => 'GET',
        'callback' => 'shopx_bridge_get_products_by_vendor',
        'permission_callback' => '__return_true'
    ) );
} );

function shopx_bridge_get_store_details_by_slug( $request ) {
    $slug = sanitize_text_field( $request['slug'] );
    
    // 1. Search for ANY user matching the slug
    $user = get_user_by( 'login', $slug ) ?: get_user_by( 'slug', $slug );

    // 2. If user NOT found, list all existing users for debugging
    if ( ! $user ) {
        $all_users = get_users( array( 
            'fields' => array( 'user_login', 'user_nicename' ), 
            'number' => 20 
        ) );
        return new WP_Error( 'not_found', 'USER_NOT_FOUND_IN_DB', array( 
            'status'          => 404, 
            'searched_for'    => $slug,
            'available_users' => $all_users 
        ) );
    }

    $user_id = $user->ID;

    // 3. Construct a generic store response
    $store_logo = get_user_meta( $user_id, 'store_logo', true );
    $store_banner = get_user_meta( $user_id, 'store_banner', true );

    return array(
        'id'          => $user_id,
        'store_name'  => get_user_meta( $user_id, 'nickname', true ) ?: $user->display_name,
        'description' => get_user_meta( $user_id, 'description', true ) ?: 'No description available',
        'logo'        => is_numeric( $store_logo ) ? wp_get_attachment_url( $store_logo ) : $store_logo,
        'banner'      => is_numeric( $store_banner ) ? wp_get_attachment_url( $store_banner ) : $store_banner,
        'email'       => $user->user_email,
        'roles'       => (array) $user->roles,
        'registered'  => $user->user_registered
    );
}

// =========================================================================
// NATIVE STORE BRANDING: Add Fields to WP User Profile
// =========================================================================
add_action( 'show_user_profile', 'shopx_extra_user_profile_fields' );
add_action( 'edit_user_profile', 'shopx_extra_user_profile_fields' );

function shopx_extra_user_profile_fields( $user ) { ?>
    <h3>ShopX Store Details</h3>
    <table class="form-table">
        <tr>
            <th><label for="store_logo">Store Logo (Attachment ID or URL)</label></th>
            <td>
                <input type="text" name="store_logo" id="store_logo" value="<?php echo esc_attr( get_the_author_meta( 'store_logo', $user->ID ) ); ?>" class="regular-text" /><br />
                <span class="description">Enter the Image URL or Attachment ID for the logo.</span>
            </td>
        </tr>
        <tr>
            <th><label for="store_banner">Store Banner (Attachment ID or URL)</label></th>
            <td>
                <input type="text" name="store_banner" id="store_banner" value="<?php echo esc_attr( get_the_author_meta( 'store_banner', $user->ID ) ); ?>" class="regular-text" /><br />
                <span class="description">Enter the Image URL or Attachment ID for the banner.</span>
            </td>
        </tr>
    </table>
<?php }

add_action( 'personal_options_update', 'shopx_save_extra_user_profile_fields' );
add_action( 'edit_user_profile_update', 'shopx_save_extra_user_profile_fields' );

function shopx_save_extra_user_profile_fields( $user_id ) {
    if ( ! current_user_can( 'edit_user', $user_id ) ) {
        return false;
    }
    update_user_meta( $user_id, 'store_logo', sanitize_text_field( $_POST['store_logo'] ) );
    update_user_meta( $user_id, 'store_banner', sanitize_text_field( $_POST['store_banner'] ) );
}

// =========================================================================
// PUBLIC: GET PRODUCTS BY VENDOR ID — GET /shopx/v1/vendor-products/{id}
// =========================================================================
function shopx_bridge_get_products_by_vendor( $request ) {
    $vendor_id = (int) $request['id'];
    $args = array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => 12,
        'author'         => $vendor_id
    );
    
    $query = new WP_Query( $args );
    $products = array();

    if ( $query->have_posts() ) {
        while ( $query->have_posts() ) {
            $query->the_post();
            $product = wc_get_product( get_the_ID() );
            $products[] = array(
                'id'    => get_the_ID(),
                'name'  => get_the_title(),
                'price' => $product->get_price(),
                'image' => wp_get_attachment_url( $product->get_image_id() ),
                'slug'  => $product->get_slug()
            );
        }
    }
    wp_reset_postdata();
    return $products;
}

// =========================================================================
// GLOBAL FIX: Inject Vendor Slug into Product API
// =================================== ======================================
add_filter( 'woocommerce_rest_prepare_product_object', 'shopx_inject_vendor_slug_to_api', 10, 3 );

function shopx_inject_vendor_slug_to_api( $response, $product, $request ) {
    $author_id = get_post_field( 'post_author', $product->get_id() );
    $user_data = get_userdata( $author_id );

    if ( $user_data ) {
        // Inject the actual working slug (user_nicename)
        $response->data['vendor_slug'] = $user_data->user_nicename;
    }

    return $response;
}
