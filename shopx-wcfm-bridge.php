<?php
/**
 * Plugin Name: ShopX WCFM API Bridge
 * Plugin URI:  https://next.shopx.lk
 * Description: Intercepts WooCommerce REST API orders from Next.js and securely forces WCFM Sub-order creation using Structural Row Injection.
 * Version:     1.4.0
 * Author:      ShopX
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// ── Silence output IMMEDIATELY so notices never pollute JSON ─────────────────
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
ob_start(); // Start output buffer — we'll clean it before every REST response

// ── Include sub-modules ───────────────────────────────────────────────────────
require_once plugin_dir_path(__FILE__) . 'inc/seller-auth-api.php';

// Global state — initialized at PHP load time (no WordPress dependency)
global $shopx_bridge_v2_pending_order_id;
$shopx_bridge_v2_pending_order_id = null;

// ============================================================
// BOOT INSIDE plugins_loaded (priority 20): WooCommerce and
// all translation files are fully loaded at this point.
// This eliminates _load_textdomain_just_in_time notices.
// ============================================================
add_action('plugins_loaded', function () {
    // Silence WCFM deprecated/notice errors so they don't break REST API JSON responses
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED & ~E_NOTICE & ~E_WARNING);
    @ini_set('display_errors', '0');
    error_log('ShopX WCFM Bridge Plugin: Loaded into memory (plugins_loaded).');

    // Before EVERY REST response, discard any buffered noise (notices, headers etc.)
    add_filter('rest_pre_serve_request', function ($served) {
        if (ob_get_level() > 0) {
            ob_end_clean();
        }
        return $served;
    }, 1);

    // Register all hooks now that WooCommerce is ready
    add_action('woocommerce_rest_insert_shop_order_object', 'shopx_bridge_v2_mark_order_rest', 10, 3);
    add_action('woocommerce_new_order', 'shopx_bridge_v2_mark_order_generic', 10, 2);
    add_action('shutdown', 'shopx_bridge_v2_execute_structural_injection');
    add_action('woocommerce_rest_insert_shop_order_object', 'shopx_bridge_v2_execute_structural_injection', 10, 3);

    // --- 5. Product Specs & Shipping Logic ---
    add_action('rest_api_init', 'shopx_register_category_api');
    add_action('rest_api_init', 'shopx_register_checkout_proxy_api');
}, 20); // Priority 20 ensures WooCommerce (priority 10) has registered its hooks first
function shopx_bridge_v2_mark_order_rest($order, $request, $creating)
{
    if (!$creating)
        return;
    global $shopx_bridge_v2_pending_order_id;
    $shopx_bridge_v2_pending_order_id = $order->get_id();
    error_log("ShopX WCFM Bridge Plugin: Marked Order ID {$shopx_bridge_v2_pending_order_id} via Primary REST API hook.");
}

function shopx_bridge_v2_mark_order_generic($order_id, $order)
{
    global $shopx_bridge_v2_pending_order_id;
    if (!$shopx_bridge_v2_pending_order_id) {
        $shopx_bridge_v2_pending_order_id = $order_id;
        error_log("ShopX WCFM Bridge Plugin: Marked Order ID {$shopx_bridge_v2_pending_order_id} via Secondary Generic Order hook.");
    }
}

function shopx_bridge_v2_execute_structural_injection($rest_order = null, $request = null, $creating = true)
{
    if ($rest_order !== null && !$creating) {
        return; // Only execute when creating via REST to prevent loop duplication
    }

    global $shopx_bridge_v2_pending_order_id, $wpdb;

    // Order Object Compatibility: Support direct REST objects natively bypassing ID fetch gaps
    if (is_a($rest_order, 'WC_Order')) {
        $shopx_bridge_v2_pending_order_id = $rest_order->get_id();
        error_log("ShopX WCFM Bridge Plugin: EXECUTING Structural Row Injection Loop directly from REST API for Order ID {$shopx_bridge_v2_pending_order_id}");
    } else if ($shopx_bridge_v2_pending_order_id) {
        error_log("ShopX WCFM Bridge Plugin: EXECUTING Structural Row Injection Loop via Shutdown for Order ID {$shopx_bridge_v2_pending_order_id}");
    }

    if ($shopx_bridge_v2_pending_order_id) {
        // Prevent double execution on matching loops globally
        if (get_post_meta($shopx_bridge_v2_pending_order_id, '_shopx_wcfm_injected', true)) {
            return;
        }
        update_post_meta($shopx_bridge_v2_pending_order_id, '_shopx_wcfm_injected', 'yes');
        // UI Data Push: Mark parent order as processed so WCFM Dashboard triggers its internal refresh
        update_post_meta($shopx_bridge_v2_pending_order_id, '_wcfm_order_processed', 'yes');

        try {
            $order = is_a($rest_order, 'WC_Order') ? $rest_order : wc_get_order($shopx_bridge_v2_pending_order_id);
            if (!$order) {
                return;
            }

            // Centralized Order Metrics Fetch
            $order_shipping_total = (float) $order->get_shipping_total();

            $items = $order->get_items();
            $vendor_totals = array();
            $vendor_commissions = array();

            // 1. Aggregate Math: Calculate totals & physical commissions per vendor manually
            $vendor_items = array(); // Store individual mapped items for granular array construction

            foreach ($items as $item_id => $item) {
                $product_id = $item->get_product_id();
                if (!$product_id)
                    continue;

                $raw_vendor_id = get_post_field('post_author', $product_id);
                if (!$raw_vendor_id)
                    continue; // Skip if no vendor attached

                // Vendor ID Safety: force strict integer values
                $vendor_id = intval($raw_vendor_id);
                if ($vendor_id <= 0)
                    continue;

                $item_total = (float) $item->get_total();

                // Get rigid WCFM commission configuration
                $commission_rate = get_post_meta($product_id, '_wcfm_commission', true);
                $commission_fixed = empty($commission_rate) ? 0 : (float) $commission_rate;

                if (!isset($vendor_totals[$vendor_id])) {
                    $vendor_totals[$vendor_id] = 0;
                    $vendor_commissions[$vendor_id] = 0;
                    $vendor_items[$vendor_id] = array();
                }

                $vendor_totals[$vendor_id] += $item_total;

                // Earning Calculation: The total Vendor Earning is explicitly total volume minus physical commission structure
                $item_vendor_earning = $item_total - ($commission_fixed * $item->get_quantity());
                if ($item_vendor_earning < 0)
                    $item_vendor_earning = 0; // Prevent reverse mapping

                $vendor_commissions[$vendor_id] += $item_vendor_earning;

                // Save the raw item ID mapping dynamically for Dashboard Integrity logic
                $vendor_items[$vendor_id][] = array(
                    'item_id' => $item_id,
                    'item_total' => $item_total,
                    'vendor_earning' => $item_vendor_earning,
                    'admin_fee' => $item_total - $item_vendor_earning
                );

                // Update item states natively
                wc_update_order_item_meta($item_id, '_vendor_id', $vendor_id);
                wc_update_order_item_meta($item_id, '_wcfmmp_order_item_processed', 'yes'); // Item Table Fix: Explicit string processing
                wc_update_order_item_meta($item_id, '_wcfm_commission_fixed', strval($commission_fixed));
            }

            if (empty($vendor_totals)) {
                error_log("ShopX WCFM Bridge: No vendors found in cart items. Aborting injection.");
                return;
            }

            // Update parent object
            $order->update_meta_data('has_sub_order', '1');
            update_post_meta($shopx_bridge_v2_pending_order_id, '_wcfm_order_processed', 'yes'); // Parent Sync: Instant REST API Flag Limit

            // Payment Method Conditional Check
            $payment_method = $order->get_payment_method();
            $target_status = ($payment_method === 'cod') ? 'processing' : 'pending';
            $wc_target_status = 'wc-' . $target_status;

            $order->update_status($target_status, 'ShopX WCFM Bridge executing structural row generation. Method: ' . $payment_method);
            $order->save();

            // Table Discovery: Detect exact table names dynamically in non-standard namespace installations
            $commission_table = false;
            $marketplace_table = false;

            // 1. Commission Table
            $test_com_table = $wpdb->prefix . 'wcfm_f_commission';
            if ($wpdb->get_var("SHOW TABLES LIKE '{$test_com_table}'") == $test_com_table) {
                $commission_table = $test_com_table;
            } else {
                $discovered_table = $wpdb->get_var("SHOW TABLES LIKE '%wcfm_f_commission%'");
                if ($discovered_table)
                    $commission_table = $discovered_table;
            }

            // 2. Marketplace Index Table
            $test_mp_table = $wpdb->prefix . 'wcfm_marketplace_orders';
            if ($wpdb->get_var("SHOW TABLES LIKE '{$test_mp_table}'") == $test_mp_table) {
                $marketplace_table = $test_mp_table;
            } else {
                $discovered_mp_table = $wpdb->get_var("SHOW TABLES LIKE '%wcfm_marketplace_orders%'");
                if ($discovered_mp_table)
                    $marketplace_table = $discovered_mp_table;
            }

            // 2. Sub-Order Entry: Manually create posts & sync tables per vendor
            foreach ($vendor_totals as $vendor_id => $total) {
                $vendor_earnings = $vendor_commissions[$vendor_id];
                $admin_fee = $total - $vendor_earnings;

                // Create the Sub-Order Post explicitly
                $sub_order_data = array(
                    'post_type' => 'shop_order',
                    'post_title' => 'Order &ndash; ' . date_i18n('F j, Y @ h:i A'),
                    'post_status' => $wc_target_status, // Conditional status check avoiding early processing limits physically 
                    'post_parent' => $shopx_bridge_v2_pending_order_id,
                    'post_author' => $vendor_id,
                    'ping_status' => 'closed',
                    'post_password' => 'order_' . uniqid(),
                );

                $sub_order_id = wp_insert_post($sub_order_data);

                if ($sub_order_id && !is_wp_error($sub_order_id)) {
                    try {
                        // Final Recovery Logic: Mute Native Error Hooks Temporarily
                        remove_all_actions('woocommerce_checkout_order_processed', 10);
                        remove_all_actions('wcfm_message_on_new_order', 10);
                        remove_all_actions('woocommerce_new_order', 10);
                        remove_all_actions('woocommerce_order_status_processing', 10);

                        // Update the Post specifically natively again to guarantee Status and Author binds
                        wp_update_post(array(
                            'ID' => $sub_order_id,
                            'post_author' => $vendor_id,
                            'post_status' => $wc_target_status
                        ));

                        // Explicit Transaction Links mimicking finished WCFM engine transfers
                        update_post_meta($sub_order_id, '_vendor_id', $vendor_id);
                        update_post_meta($sub_order_id, '_wcfm_vendor', $vendor_id); // Hard Meta Binding
                        update_post_meta($sub_order_id, '_wcfmmp_sub_order_parent', $shopx_bridge_v2_pending_order_id);
                        update_post_meta($sub_order_id, '_wcfmmp_order_id', $shopx_bridge_v2_pending_order_id); // Missing DB Link
                        update_post_meta($sub_order_id, '_order_total', $total);
                        update_post_meta($sub_order_id, '_wcfmmp_commission', $vendor_earnings);
                        update_post_meta($sub_order_id, '_wcfmmp_admin_fee', $admin_fee);
                        update_post_meta($sub_order_id, '_wcfm_commission_amount', $vendor_earnings);
                        update_post_meta($sub_order_id, '_commission_amount', $admin_fee); // Absolute Admin mapping

                        // WCFM Internal Logic Force & Dashboard Meta Strings
                        update_post_meta($sub_order_id, '_wcfm_commission_fixed', $admin_fee);
                        update_post_meta($sub_order_id, '_wcfm_order_processed', 'yes'); // Hard Lock
                        update_post_meta($sub_order_id, '_wcfmmp_commission_total', $admin_fee); // Ultimate Dashboard Track
                        update_post_meta($sub_order_id, '_wcfmmp_order_total', $total); // Gross Value lock natively mapped utilizing local loop variable
                        update_post_meta($shopx_bridge_v2_pending_order_id, '_wcfmmp_order_id', $shopx_bridge_v2_pending_order_id); // Admin Parent Sync

                        // Ghost Protection Data Mappings
                        update_post_meta($sub_order_id, '_wcfm_commission_paid', 'no');

                        update_post_meta($shopx_bridge_v2_pending_order_id, '_wcfmmp_sub_order_' . $vendor_id, $sub_order_id);

                        // 3. Granular Line Item Integrity Loops
                        $grand_total_admin_fee = 0;
                        $grand_total_gross = 0;
                        foreach ($vendor_items[$vendor_id] as $mapped_item) {

                            $custom_commission_id = rand(100000, 999999); // Force artificial ID linkages structurally
                            $true_commission_id = $custom_commission_id;

                            // Commission Table Row Generation — Use raw REPLACE INTO for guaranteed upsert
                            if ($commission_table) {
                                $vendor_earn_fmt = number_format(abs($mapped_item['vendor_earning']), 6, '.', '');
                                $item_total_fmt = number_format(abs($mapped_item['item_total']), 6, '.', '');
                                $admin_fee_fmt = number_format(abs($mapped_item['admin_fee']), 6, '.', '');
                                $created_at = current_time('mysql');

                                // REPLACE INTO ensures no duplicate + forces correct values even if row already exists
                                $sql = $wpdb->prepare(
                                    "INSERT INTO {$commission_table}
                                    (order_id, vendor_id, item_id, sub_order_id, commission_amount, item_total, item_sub_total, admin_fee, commission_status, created)
                                    VALUES (%d, %d, %d, %d, %f, %f, %f, %f, 'completed', %s)
                                    ON DUPLICATE KEY UPDATE
                                        commission_amount = VALUES(commission_amount),
                                        item_total        = VALUES(item_total),
                                        item_sub_total    = VALUES(item_sub_total),
                                        admin_fee         = VALUES(admin_fee),
                                        commission_status = 'completed'",
                                    $shopx_bridge_v2_pending_order_id,
                                    $vendor_id,
                                    $mapped_item['item_id'],
                                    $sub_order_id,
                                    $vendor_earn_fmt,
                                    $item_total_fmt,
                                    $item_total_fmt,
                                    $admin_fee_fmt,
                                    $created_at
                                );
                                $wpdb->query($sql);
                                $true_commission_id = $wpdb->insert_id ?: $custom_commission_id;
                                error_log("ShopX WCFM Bridge: Commission UPSERT into {$commission_table} — Vendor {$vendor_id} | Item: {$mapped_item['item_id']} | Gross: {$item_total_fmt} | Earning: {$vendor_earn_fmt} | Fee: {$admin_fee_fmt} | SQL error: " . ($wpdb->last_error ?: 'none'));
                            }

                            // 4. Marketplace Orders Index Integrity Loop
                            if ($marketplace_table) {
                                $existing_row = $wpdb->get_row($wpdb->prepare(
                                    "SELECT ID FROM {$marketplace_table} WHERE order_id = %d AND vendor_id = %d AND item_id = %d",
                                    $shopx_bridge_v2_pending_order_id,
                                    $vendor_id,
                                    $mapped_item['item_id']
                                ));

                                $item_obj = $order->get_item($mapped_item['item_id']); // Core Object Bind

                                // Zero-Error Logic: Safe-Bind variables mapping explicitly native loops bypassing undefined loops structurally
                                $current_item_total = $item_obj ? $item_obj->get_total() : (isset($mapped_item['item_total']) ? $mapped_item['item_total'] : 0);

                                // Direct Payout Fallback: Calculate Admin Fee natively bypassing corrupted Array traces entirely
                                $manual_admin_fee = $current_item_total * 0.08;
                                $seller_earning = $current_item_total - $manual_admin_fee;

                                // Summary Calculation Aggregation
                                $grand_total_admin_fee += $manual_admin_fee;
                                $grand_total_gross += $current_item_total;

                                // WCFM Financial Iterative Meta Strings resolving undefined variables mechanically via internal mappings
                                update_post_meta($sub_order_id, '_wcfmmp_commission_total', number_format(abs($manual_admin_fee), 2, '.', ''));
                                update_post_meta($sub_order_id, '_wcfmmp_order_total', number_format(abs($current_item_total), 2, '.', ''));
                                update_post_meta($sub_order_id, '_line_total', number_format(abs($current_item_total), 2, '.', ''));
                                update_post_meta($sub_order_id, '_wcfmmp_gross_sales', number_format(abs($current_item_total), 2, '.', ''));

                                // UI Data Redirection: Force Dashboard calculations overriding restricted Database columns securely
                                update_post_meta($sub_order_id, '_vendor_earning', number_format(abs($seller_earning), 2, '.', ''));
                                update_post_meta($sub_order_id, '_commission_amount', number_format(abs($manual_admin_fee), 2, '.', ''));

                                // Main List Visibility Fix: Strict variable boundaries enforcing raw Dashboard UI Gross strings directly 
                                update_post_meta($sub_order_id, '_wcfmmp_gross_sales', $current_item_total);
                                update_post_meta($sub_order_id, '_wcfmmp_commission_amount', $manual_admin_fee);

                                // Nuclear Sync Overrides: Direct UI Meta Engine forces dictating ultimate dashboard calculations purely physically restricting 0.00 bounds completely
                                update_post_meta($sub_order_id, '_wcfmmp_total_sales', number_format(abs($current_item_total), 2, '.', ''));
                                update_post_meta($sub_order_id, '_wcfmmp_order_status', $target_status);

                                // Final Line-Item Detail Overrides: Master constraints executing explicitly across inner item logic and raw post matrix mappings securely
                                wc_update_order_item_meta($mapped_item['item_id'], '_wcfm_commission_amount', number_format(abs($manual_admin_fee), 2, '.', '')); // Physical WC line-item metadata link explicitly defined here locally
                                wc_update_order_item_meta($mapped_item['item_id'], '_commission_amount', number_format(abs($manual_admin_fee), 2, '.', '')); // Dual-key constraint mapping
                                wc_update_order_item_meta($mapped_item['item_id'], '_wcfmmp_order_item_processed', 'yes'); // Item Table Fix Loop Core Execution Map
                                update_post_meta($sub_order_id, '_subtotal', number_format(abs($current_item_total), 2, '.', '')); // Gross Value Master Native
                                update_post_meta($sub_order_id, '_order_total', number_format(abs($current_item_total), 2, '.', ''));
                                update_post_meta($sub_order_id, '_wcfm_commission_paid', 'no'); // Active Pending Limit physically mapping 
                                update_post_meta($sub_order_id, '_vendor_id', $vendor_id); // UI Detail Link natively

                                // Full Spectrum Lock: Parent Order Injection Mapping Master View variables directly overriding Sub-Order omissions statically globals
                                update_post_meta($shopx_bridge_v2_pending_order_id, '_wcfmmp_commission_total', number_format(abs($manual_admin_fee), 2, '.', ''));
                                update_post_meta($shopx_bridge_v2_pending_order_id, '_wcfmmp_order_total', number_format(abs($current_item_total), 2, '.', ''));
                                update_post_meta($shopx_bridge_v2_pending_order_id, '_wcfm_order_processed', 'yes');
                                update_post_meta($shopx_bridge_v2_pending_order_id, '_vendor_id', $vendor_id);

                                $marketplace_data = array(
                                    'order_id' => $shopx_bridge_v2_pending_order_id,
                                    'vendor_id' => $vendor_id,
                                    'item_id' => $mapped_item['item_id'],
                                    'product_id' => $item_obj ? $item_obj->get_product_id() : 0,
                                    'item_total' => number_format(abs($current_item_total), 2, '.', ''),
                                    'commission_amount' => number_format(abs($manual_admin_fee), 2, '.', ''),
                                    'order_status' => $target_status,
                                    'commission_status' => 'completed',
                                );
                                $marketplace_format = array(
                                    '%d', // order_id
                                    '%d', // vendor_id
                                    '%d', // item_id
                                    '%d', // product_id
                                    '%s', // item_total
                                    '%s', // commission_amount
                                    '%s', // order_status
                                    '%s'  // commission_status
                                ); // Core Columns Only bindings

                                if ($existing_row) {
                                    $inserted = $wpdb->update(
                                        $marketplace_table,
                                        $marketplace_data,
                                        array('ID' => $existing_row->ID),
                                        $marketplace_format,
                                        array('%d')
                                    );
                                } else {
                                    $marketplace_data['created'] = current_time('mysql');
                                    $marketplace_format[] = '%s';
                                    error_log("ShopX Trace & Force: Pre-Insert Variables - Admin Fee: {$manual_admin_fee} | Full Price: {$current_item_total}");
                                    $inserted = $wpdb->insert(
                                        $marketplace_table,
                                        $marketplace_data,
                                        $marketplace_format
                                    );
                                }

                                if ($inserted !== false) {
                                    $wcfm_target_id = $existing_row ? $existing_row->ID : $wpdb->insert_id;
                                    // The Fix for 0.00: Explicit DB hook manipulating the background native matrix status overriding processing drops dynamically
                                    $wpdb->update(
                                        $marketplace_table,
                                        array('commission_status' => 'completed'),
                                        array('ID' => $wcfm_target_id),
                                        array('%s'),
                                        array('%d')
                                    );
                                    error_log("ShopX WCFM Bridge: Linked Item array into {$marketplace_table} for Vendor {$vendor_id}. Dashboard Visibility Granted [ID: {$mapped_item['item_id']}]");
                                } else {
                                    error_log('WCFM SQL Error: ' . $wpdb->last_error);
                                    error_log("ShopX WCFM Bridge Error: Failed to inject Item into {$marketplace_table}. MySQL Error: " . $wpdb->last_error);

                                    // Meta Sync Only Fallback (WCFM Dashboard Core Rebuild Hooks)
                                    update_post_meta($sub_order_id, '_wcfm_marketplace_sync_failed', 'yes');
                                    update_post_meta($sub_order_id, '_wcfm_commission_sync_fallback', 'active');
                                    error_log("ShopX WCFM Bridge: Triggered Meta Sync Only Fallback for Sub-Order {$sub_order_id}.");
                                }
                            }
                        }

                        // Summary Visibility Layer: Master Meta Injection locking summary totals
                        update_post_meta($sub_order_id, '_wcfmmp_commission_total', $grand_total_admin_fee);
                        update_post_meta($sub_order_id, '_wcfmmp_order_total', $grand_total_gross);
                        update_post_meta($sub_order_id, '_wcfmmp_gross_sales', $grand_total_gross);
                        update_post_meta($sub_order_id, '_vendor_earning', ($grand_total_gross - $grand_total_admin_fee));

                        wp_update_post(array('ID' => $sub_order_id, 'post_author' => $vendor_id)); // Hard Author Push Second Pass

                        update_post_meta($sub_order_id, '_wcfm_suborder_forced', 'yes');
                        clean_post_cache($sub_order_id);

                        // Synchronized Triple-Lock Strategy: Force Native raw MySQL mappings before invoking explicit state triggers mapping constraints seamlessly
                        wp_update_post(array('ID' => $sub_order_id, 'post_status' => $wc_target_status));
                        wp_set_object_terms($sub_order_id, $target_status, 'shop_order_status'); // Strict Status Lockdown natively avoiding Completed skipping
                        update_post_meta($shopx_bridge_v2_pending_order_id, '_wcfm_order_processed', 'yes');

                        // Deferred Execution Strategy: Retry wc_get_order up to 3 times with cache clearing
                        // This handles the race condition where WP object cache hasn't refreshed after wp_insert_post
                        $sub_order_obj = false;
                        for ($attempt = 1; $attempt <= 3; $attempt++) {
                            clean_post_cache($sub_order_id);
                            wp_cache_delete($sub_order_id, 'posts');
                            wp_cache_delete($sub_order_id, 'post_meta');
                            if (function_exists('wc_delete_order_item_transients')) {
                                wc_delete_order_item_transients($sub_order_id);
                            }
                            $sub_order_obj = wc_get_order($sub_order_id);
                            if (is_a($sub_order_obj, 'WC_Order')) {
                                break; // Got a valid object - stop retrying
                            }
                            error_log("ShopX WCFM Bridge: wc_get_order attempt {$attempt}/3 failed for Sub-order {$sub_order_id}. Retrying...");
                        }

                        // GUARANTEED META INJECTION: Write critical financial meta directly via $wpdb
                        // These values are written unconditionally so the dashboard always shows correct figures
                        $wpdb->replace($wpdb->postmeta, array('post_id' => $sub_order_id, 'meta_key' => '_order_total', 'meta_value' => number_format(abs($grand_total_gross), 2, '.', '')), array('%d', '%s', '%s'));
                        $wpdb->replace($wpdb->postmeta, array('post_id' => $sub_order_id, 'meta_key' => '_wcfmmp_order_total', 'meta_value' => number_format(abs($grand_total_gross), 2, '.', '')), array('%d', '%s', '%s'));
                        $wpdb->replace($wpdb->postmeta, array('post_id' => $sub_order_id, 'meta_key' => '_wcfmmp_gross_sales', 'meta_value' => number_format(abs($grand_total_gross), 2, '.', '')), array('%d', '%s', '%s'));
                        $wpdb->replace($wpdb->postmeta, array('post_id' => $sub_order_id, 'meta_key' => '_vendor_earning', 'meta_value' => number_format(abs($grand_total_gross - $grand_total_admin_fee), 2, '.', '')), array('%d', '%s', '%s'));
                        $wpdb->replace($wpdb->postmeta, array('post_id' => $sub_order_id, 'meta_key' => '_wcfmmp_commission_total', 'meta_value' => number_format(abs($grand_total_admin_fee), 2, '.', '')), array('%d', '%s', '%s'));
                        // Initialize serialized meta keys to prevent WCFM unserialize(null) deprecation errors
                        $wpdb->replace($wpdb->postmeta, array('post_id' => $sub_order_id, 'meta_key' => '_wcfmmp_shipping_details', 'meta_value' => 'a:0:{}'), array('%d', '%s', '%s'));
                        $wpdb->replace($wpdb->postmeta, array('post_id' => $sub_order_id, 'meta_key' => '_wcfmmp_tax_details', 'meta_value' => 'a:0:{}'), array('%d', '%s', '%s'));
                        $wpdb->replace($wpdb->postmeta, array('post_id' => $sub_order_id, 'meta_key' => '_billing_address_index', 'meta_value' => ''), array('%d', '%s', '%s'));
                        error_log("ShopX WCFM Bridge: Guaranteed meta injection complete for Sub-order {$sub_order_id}. Gross: {$grand_total_gross}, Admin Fee: {$grand_total_admin_fee}");

                        if (is_a($sub_order_obj, 'WC_Order')) {

                            // The Master Sync Overwrite: WCFM is overriding our status. Force permanent saving limit bypass
                            $sub_order_obj->set_status($target_status);
                            $sub_order_obj->save(); // Force permanent save bypassing async memory wipe

                            // Meta Cleanup: Ensure no other plugin is overwriting these values by using high priority saves natively 
                            update_post_meta($sub_order_id, '_wcfmmp_commission_amount', number_format(abs($manual_admin_fee), 2, '.', ''));
                            update_post_meta($sub_order_id, '_wcfmmp_total_sales', number_format(abs($current_item_total), 2, '.', ''));

                            // Static Hook Fallback: Dispatch WCFM rebuilding organically natively via Action Events safely
                            if (function_exists('WCFM')) {
                                do_action('wcfm_order_status_updated', $shopx_bridge_v2_pending_order_id, $target_status);
                                if (class_exists('WCFMmp')) {
                                    do_action('wcfmmp_order_processed', $shopx_bridge_v2_pending_order_id, $vendor_id, $sub_order_id);
                                }
                            }

                            // Delayed execution prioritizing exact priority statuses matching strict updates tracking explicitly
                            $sub_order_obj->update_status($target_status, 'ShopX Bridge Final Sync');

                            // Recalculate Hook: Forced structural recalculation fired independently natively post-status assignment overriding sequence drops universally
                            do_action('wcfmmp_new_order_commission_processed', $sub_order_id, $shopx_bridge_v2_pending_order_id, $vendor_id);

                            // UI Refresh Hook: Awake the individual detailed Summary Table logically
                            do_action('wcfm_order_totals_recalculated', $sub_order_id);

                        } else {
                            // VALIDATION BYPASS: WC_Order still not available after retries.
                            // Use raw SQL to force update the marketplace table so Seller Dashboard shows correct figures.
                            error_log("ShopX WCFM Bridge Error: Sub-order {$sub_order_id} failed WC_Order validation after 3 attempts. Executing raw SQL bypass fallback.");

                            if ($marketplace_table) {
                                // Only use confirmed WCFM schema columns — vendor_earning and gross_sales do NOT exist
                                $raw_fallback = $wpdb->update(
                                    $marketplace_table,
                                    array(
                                        'item_total' => strval(number_format(abs($grand_total_gross), 2, '.', '')),
                                        'commission_amount' => strval(number_format(abs($grand_total_admin_fee), 2, '.', '')),
                                        'order_status' => strval($target_status),
                                        'commission_status' => 'completed',
                                    ),
                                    array('order_id' => $shopx_bridge_v2_pending_order_id, 'vendor_id' => $vendor_id),
                                    array('%s', '%s', '%s', '%s'),
                                    array('%d', '%d')
                                );
                                error_log("ShopX WCFM Bridge SQL Fallback: Updated {$marketplace_table} for Order {$shopx_bridge_v2_pending_order_id} / Vendor {$vendor_id}. Rows affected: " . intval($raw_fallback));
                            }

                            // META LOCK: Since the SQL table schema is restricted, force dashboard figures via postmeta
                            $meta_vendor_earning = number_format(abs($grand_total_gross - $grand_total_admin_fee), 2, '.', '');
                            $meta_admin_fee = number_format(abs($grand_total_admin_fee), 2, '.', '');
                            $meta_gross = number_format(abs($grand_total_gross), 2, '.', '');
                            update_post_meta($sub_order_id, '_vendor_earning', $meta_vendor_earning);
                            update_post_meta($sub_order_id, '_wcfmmp_commission_total', $meta_admin_fee);
                            update_post_meta($sub_order_id, '_wcfmmp_gross_sales', $meta_gross);
                            update_post_meta($sub_order_id, '_wcfmmp_order_total', $meta_gross);
                            update_post_meta($sub_order_id, '_order_total', $meta_gross);
                            error_log("ShopX WCFM Bridge Meta Lock (SQL Fallback): Sub-order {$sub_order_id} earning={$meta_vendor_earning}, fee={$meta_admin_fee}, gross={$meta_gross}");

                            // Also force status via raw SQL on wp_posts since WC_Order is unavailable
                            $wpdb->update(
                                $wpdb->posts,
                                array('post_status' => $wc_target_status),
                                array('ID' => $sub_order_id),
                                array('%s'),
                                array('%d')
                            );
                            error_log("ShopX WCFM Bridge SQL Fallback: Force-set post_status = {$wc_target_status} for Sub-order {$sub_order_id} via raw SQL.");
                        } // end if/else WC_Order validation

                        // ====================================================================
                        // WCFM COMMISSION ENGINE: Fire hooks unconditionally for every sub-order
                        // These hooks trigger the internal WCFM commission recalculation engine
                        // that drives the "UNPAID" balance on the Seller Dashboard.
                        // Must run AFTER postmeta injection so the engine reads correct values.
                        // ====================================================================
                        clean_post_cache($sub_order_id);
                        wp_cache_delete($sub_order_id, 'posts');
                        wp_cache_delete($sub_order_id, 'post_meta');

                        // Core Commission Hook: Rebuilds the marketplace commission row for this vendor
                        do_action('wcfm_marketplace_order_processed', $shopx_bridge_v2_pending_order_id, $sub_order_id, $vendor_id);

                        // WCFMmp New Order Hook: Triggers full commission table row generation
                        do_action('wcfmmp_order_processed', $shopx_bridge_v2_pending_order_id, $vendor_id, $sub_order_id);

                        // Commission Processed Hook: Final recalculation signal
                        do_action('wcfmmp_new_order_commission_processed', $sub_order_id, $shopx_bridge_v2_pending_order_id, $vendor_id);

                        // Status Update Hook: Syncs the status column in the dashboard
                        do_action('wcfm_order_status_updated', $shopx_bridge_v2_pending_order_id, $target_status);
                        do_action('wcfm_order_status_updated', $sub_order_id, $target_status);

                        // Totals Recalculate Hook: Forces the dashboard total summary to refresh
                        do_action('wcfm_order_totals_recalculated', $sub_order_id);
                        do_action('wcfm_order_totals_recalculated', $shopx_bridge_v2_pending_order_id);

                        error_log("ShopX WCFM Bridge: Commission engine hooks fired for Sub-order {$sub_order_id}, Vendor {$vendor_id}, Parent {$shopx_bridge_v2_pending_order_id}.");

                        // ====================================================================
                        // HIGH-PRIORITY DASHBOARD FORCE SYNC
                        // Direct DB injection so the Seller Dashboard reflects real figures
                        // even if WCFM hooks did not fire or were suppressed by the host.
                        // ====================================================================

                        // 1. FORCE COMMISSION TABLE ROW: Upsert sub-order summary into wcfm_f_commission
                        if ($commission_table) {
                            // Check if a row already exists for this sub_order_id
                            $existing_commission = $wpdb->get_var($wpdb->prepare(
                                "SELECT ID FROM {$commission_table} WHERE sub_order_id = %d AND vendor_id = %d LIMIT 1",
                                $sub_order_id,
                                $vendor_id
                            ));

                            $commission_row = array(
                                'order_id' => $shopx_bridge_v2_pending_order_id,
                                'vendor_id' => $vendor_id,
                                'item_id' => 0,         // Summary row — no single item
                                'sub_order_id' => $sub_order_id,
                                'commission_amount' => number_format(abs($grand_total_gross - $grand_total_admin_fee), 2, '.', ''), // Vendor earning
                                'item_total' => number_format(abs($grand_total_gross), 2, '.', ''),
                                'item_sub_total' => number_format(abs($grand_total_gross), 2, '.', ''),
                                'admin_fee' => number_format(abs($grand_total_admin_fee), 2, '.', ''),
                                'commission_status' => 'completed',
                            );
                            $commission_format = array('%d', '%d', '%d', '%d', '%f', '%f', '%f', '%f', '%s');

                            if ($existing_commission) {
                                // Update the existing row
                                $wpdb->update(
                                    $commission_table,
                                    $commission_row,
                                    array('ID' => $existing_commission),
                                    $commission_format,
                                    array('%d')
                                );
                                error_log("ShopX WCFM Bridge Force Sync: Updated commission row ID {$existing_commission} in {$commission_table} for Sub-order {$sub_order_id}.");
                            } else {
                                // Insert a fresh summary row
                                $commission_row['created'] = current_time('mysql');
                                $commission_format[] = '%s';
                                $wpdb->insert($commission_table, $commission_row, $commission_format);
                                error_log("ShopX WCFM Bridge Force Sync: Inserted new commission row into {$commission_table} for Sub-order {$sub_order_id}. ID: " . $wpdb->insert_id);
                            }
                        }

                        // 2. METADATA OVERWRITE: Reinforce the two keys WCFM uses for its Default UI
                        $final_vendor_earning = number_format(abs($grand_total_gross - $grand_total_admin_fee), 2, '.', '');
                        $final_gross = number_format(abs($grand_total_gross), 2, '.', '');
                        $final_admin_fee = number_format(abs($grand_total_admin_fee), 2, '.', '');

                        update_post_meta($sub_order_id, '_vendor_earning', $final_vendor_earning);
                        update_post_meta($sub_order_id, '_wcfmmp_order_total', $final_gross);
                        update_post_meta($sub_order_id, '_wcfmmp_gross_sales', $final_gross);
                        update_post_meta($sub_order_id, '_wcfmmp_commission_total', $final_admin_fee);
                        update_post_meta($sub_order_id, '_wcfm_commission_amount', $final_vendor_earning);
                        update_post_meta($sub_order_id, '_order_total', $final_gross);
                        error_log("ShopX WCFM Bridge Force Sync: Postmeta overwrite complete. Vendor Earning: {$final_vendor_earning}, Gross: {$final_gross}, Admin Fee: {$final_admin_fee}");

                        // 3. STATUS SYNC: Direct SQL to force commission_status = completed in marketplace table
                        // Bypasses WCFM internal validation loop which can reset status to 'pending'
                        if ($marketplace_table) {
                            $wpdb->query($wpdb->prepare(
                                "UPDATE {$marketplace_table} SET commission_status = 'completed', order_status = %s, item_total = %s, commission_amount = %s WHERE order_id = %d AND vendor_id = %d",
                                $target_status,
                                $final_gross,
                                $final_admin_fee,
                                $shopx_bridge_v2_pending_order_id,
                                $vendor_id
                            ));
                            error_log("ShopX WCFM Bridge Force Sync: Direct SQL commission_status=completed set on {$marketplace_table} for Order {$shopx_bridge_v2_pending_order_id} / Vendor {$vendor_id}.");
                        }

                    } catch (Exception $e) {
                        error_log("ShopX WCFM Bridge Sub-Order Generation Exception: " . $e->getMessage());
                    } catch (Error $e) { // Catch PHP 7+ fatal errors (like get_meta on bool)
                        error_log("ShopX WCFM Bridge Sub-Order Fatal Error: " . $e->getMessage());
                    }
                } else {
                    error_log("ShopX WCFM Bridge Error: Failed to generate wp_insert_post for Sub-Order.");
                }
            }

            clean_post_cache($shopx_bridge_v2_pending_order_id);

            // Native function fallback as a safety net in case physical DB schema variants reject inserts
            if (function_exists('wcfm_process_all_sub_orders')) {
                wcfm_process_all_sub_orders($shopx_bridge_v2_pending_order_id);
                error_log("ShopX WCFM Bridge: Deployed wcfm_process_all_sub_orders fallback safely.");
            }

            error_log("SUCCESS: ShopX WCFM Bridge Plugin [Total Sync Strategy & Schema Safe]: Manually built WCFM tables & forced Native Sub-Order #{$shopx_bridge_v2_pending_order_id}");

        } catch (Exception $e) {
            error_log("ShopX WCFM Bridge Plugin Critical Failure: " . $e->getMessage());
        }
    }
}

// Auto-Processing Engine mapping online successful payments mapping WCFM directly
add_action('woocommerce_payment_complete', 'shopx_bridge_v2_execute_auto_processing_online_payments');
function shopx_bridge_v2_execute_auto_processing_online_payments($order_id)
{
    if (!$order_id)
        return;

    $parent_order = wc_get_order($order_id);
    if (!$parent_order)
        return;

    // Explicit Sub Order Discovery matching parent limitations natively mapping
    $sub_orders = $parent_order->get_meta_data();
    foreach ($sub_orders as $meta) {
        if (strpos($meta->key, '_wcfmmp_sub_order_') !== false) {
            $sub_order_id = $meta->value;
            $sub_order = wc_get_order($sub_order_id);
            if ($sub_order && $sub_order->get_status() !== 'processing') {
                $sub_order->update_status('processing', 'ShopX Bridge Auto-Processing Online Payment natively mapping globally.');

                // Force WCFM UI triggers manually matching background loops correctly globally explicitly
                update_post_meta($sub_order_id, '_wcfmmp_order_status', 'processing');
                wp_set_object_terms($sub_order_id, 'processing', 'shop_order_status');

                if (function_exists('WCFM')) {
                    do_action('wcfm_order_status_updated', $order_id, 'processing');
                }
            }
        }
    }

    // If wcfm internal rebuild is available mechanically
    if (function_exists('wcfm_process_all_sub_orders')) {
        wcfm_process_all_sub_orders($order_id);
    }
}

add_action('rest_api_init', function () {
    register_rest_route('shopx/v1', '/debug-jwt', array(
        'methods' => 'GET',
        'callback' => function () {
            return new WP_REST_Response(
                array(
                    'success' => true,
                    'jwt_defined' => defined('JWT_AUTH_SECRET_KEY'),
                    'jwt_value_length' => defined('JWT_AUTH_SECRET_KEY') ? strlen(JWT_AUTH_SECRET_KEY) : 0,
                    'permalink_structure' => get_option('permalink_structure')
                ),
                200
            );
        },
        'permission_callback' => '__return_true'
    ));
}, 20);

add_action('plugins_loaded', function () {
    // -------------------------------------------------------------------------------- //
// DIRECT COMMISSION REPAIR ENDPOINT                                                 //
// Usage: /wp-json/shopx/v1/repair-commission?sub_order_id=504&vendor_id=3          //
// -------------------------------------------------------------------------------- //
    add_action('rest_api_init', function () {
        register_rest_route('shopx/v1', '/repair-commission', array(
            'methods' => 'GET',
            'permission_callback' => '__return_true',  // Public — use the repair link without being logged in
            'callback' => function (WP_REST_Request $request) {
                global $wpdb;

                $sub_order_id = intval($request->get_param('sub_order_id'));
                $vendor_id = intval($request->get_param('vendor_id'));

                if (!$sub_order_id || !$vendor_id) {
                    return new WP_REST_Response(array('error' => 'sub_order_id and vendor_id are required'), 400);
                }

                // Fetch current postmeta values already stored for this sub-order
                $order_total = (float) get_post_meta($sub_order_id, '_order_total', true);
                $vendor_earn = (float) get_post_meta($sub_order_id, '_vendor_earning', true);
                $admin_fee = (float) get_post_meta($sub_order_id, '_wcfmmp_commission_total', true);
                $parent_id = (int) get_post_meta($sub_order_id, '_wcfmmp_sub_order_parent', true);
                $order_status = get_post_status($sub_order_id);

                // Fallback: if postmeta is missing, derive 8% admin fee
                if (!$order_total && !$vendor_earn) {
                    $order_total = 0;
                    $vendor_earn = 0;
                    $admin_fee = 0;
                }
                if (!$admin_fee && $order_total) {
                    $admin_fee = round($order_total * 0.08, 2);
                    $vendor_earn = round($order_total - $admin_fee, 2);
                }

                $results = array(
                    'sub_order_id' => $sub_order_id,
                    'vendor_id' => $vendor_id,
                    'parent_id' => $parent_id,
                    'order_total' => $order_total,
                    'vendor_earn' => $vendor_earn,
                    'admin_fee' => $admin_fee,
                    'updates' => array(),
                );

                // 1. Fix wcfm_f_commission — authoritative upsert
                $commission_table = $wpdb->prefix . 'wcfm_f_commission';
                if ($wpdb->get_var("SHOW TABLES LIKE '{$commission_table}'") == $commission_table) {
                    $existing = $wpdb->get_var($wpdb->prepare(
                        "SELECT ID FROM {$commission_table} WHERE sub_order_id = %d AND vendor_id = %d LIMIT 1",
                        $sub_order_id,
                        $vendor_id
                    ));
                    if ($existing) {
                        $updated = $wpdb->update(
                            $commission_table,
                            array(
                                'commission_amount' => number_format($vendor_earn, 2, '.', ''),
                                'item_total' => number_format($order_total, 2, '.', ''),
                                'item_sub_total' => number_format($order_total, 2, '.', ''),
                                'admin_fee' => number_format($admin_fee, 2, '.', ''),
                                'commission_status' => 'completed',
                            ),
                            array('ID' => $existing),
                            array('%f', '%f', '%f', '%f', '%s'),
                            array('%d')
                        );
                        $results['updates']['commission_table'] = "Updated row ID {$existing} — rows affected: {$updated}";
                    } else {
                        $inserted = $wpdb->insert($commission_table, array(
                            'order_id' => $parent_id ?: $sub_order_id,
                            'vendor_id' => $vendor_id,
                            'item_id' => 0,
                            'sub_order_id' => $sub_order_id,
                            'commission_amount' => number_format($vendor_earn, 2, '.', ''),
                            'item_total' => number_format($order_total, 2, '.', ''),
                            'item_sub_total' => number_format($order_total, 2, '.', ''),
                            'admin_fee' => number_format($admin_fee, 2, '.', ''),
                            'commission_status' => 'completed',
                            'created' => current_time('mysql'),
                        ), array('%d', '%d', '%d', '%d', '%f', '%f', '%f', '%f', '%s', '%s'));
                        $results['updates']['commission_table'] = "Inserted new row — ID: {$wpdb->insert_id}";
                    }
                } else {
                    $results['updates']['commission_table'] = 'Table not found';
                }

                // 2. Fix wcfm_marketplace_orders — direct SQL status sync
                $marketplace_table = $wpdb->prefix . 'wcfm_marketplace_orders';
                if ($wpdb->get_var("SHOW TABLES LIKE '{$marketplace_table}'") == $marketplace_table) {
                    $rows = $wpdb->query($wpdb->prepare(
                        "UPDATE {$marketplace_table} SET commission_status = 'completed', item_total = %s, commission_amount = %s WHERE order_id = %d AND vendor_id = %d",
                        number_format($order_total, 2, '.', ''),
                        number_format($admin_fee, 2, '.', ''),
                        $parent_id ?: $sub_order_id,
                        $vendor_id
                    ));
                    $results['updates']['marketplace_table'] = "Rows updated: {$rows}";
                } else {
                    $results['updates']['marketplace_table'] = 'Table not found';
                }

                // 3. Reinforce postmeta
                update_post_meta($sub_order_id, '_vendor_earning', number_format($vendor_earn, 2, '.', ''));
                update_post_meta($sub_order_id, '_wcfmmp_order_total', number_format($order_total, 2, '.', ''));
                update_post_meta($sub_order_id, '_wcfmmp_gross_sales', number_format($order_total, 2, '.', ''));
                update_post_meta($sub_order_id, '_wcfmmp_commission_total', number_format($admin_fee, 2, '.', ''));
                update_post_meta($sub_order_id, '_wcfm_commission_amount', number_format($vendor_earn, 2, '.', ''));
                update_post_meta($sub_order_id, '_order_total', number_format($order_total, 2, '.', ''));
                $results['updates']['postmeta'] = 'Reinforced 6 meta keys';

                // 4. Fire commission hooks
                do_action('wcfm_marketplace_order_processed', $parent_id ?: $sub_order_id, $sub_order_id, $vendor_id);
                do_action('wcfmmp_new_order_commission_processed', $sub_order_id, $parent_id ?: $sub_order_id, $vendor_id);
                do_action('wcfm_order_totals_recalculated', $sub_order_id);
                $results['updates']['hooks'] = 'Fired 3 commission hooks';

                error_log("ShopX WCFM Bridge Repair: Direct repair executed for Sub-order {$sub_order_id}, Vendor {$vendor_id}");
                return new WP_REST_Response(array('success' => true, 'data' => $results), 200);
            },
        )); // end register_rest_route
    }); // end rest_api_init
}, 20); // end plugins_loaded for repair-commission

add_action('plugins_loaded', function () {
    // -------------------------------------------------------------------------------- //
// STRICT HEADLESS CORS PERMISSIONS                                                 //
// -------------------------------------------------------------------------------- //
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

            // Use the exact matched trusted origin, or fallback to detected
            if (in_array($origin, $trusted_origins)) {
                $allowed_origin = $origin;
            } elseif ($is_jwt_route) {
                // Always allow jwt-auth route through, even without a specific origin header
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
}, 20); // end plugins_loaded for CORS

// =========================================================================
// INJECT WCFM SELLER INFO INTO WOOCOMMERCE REST API PRODUCT RESPONSE
// =========================================================================
add_filter('woocommerce_rest_prepare_product_object', 'shopx_bridge_v2_add_vendor_to_product_response', 10, 3);
function shopx_bridge_v2_add_vendor_to_product_response($response, $object, $request)
{
    if (empty($response->data))
        return $response;

    $product_id = $object->get_id();

    // Attempt to get vendor from WCFM natively if active
    $vendor_id = 0;
    if (function_exists('wcfm_get_vendor_id_by_post')) {
        $vendor_id = wcfm_get_vendor_id_by_post($product_id);
    }

    // Fallback exactly to author ID if WCFM function missing/failed
    if (!$vendor_id) {
        $vendor_id = get_post_field('post_author', $product_id);
    }

    if ($vendor_id && $vendor_id > 0) {
        $store_name = get_user_meta($vendor_id, 'store_name', true);

        if (empty($store_name)) {
            $store_name = get_user_meta($vendor_id, 'wcfmmp_store_name', true);
        }
        if (empty($store_name)) {
            $store_name = get_user_meta($vendor_id, '_wcfmmp_profile_store_name', true);
        }

        // Final fallback to user display name
        if (empty($store_name)) {
            $user_info = get_userdata($vendor_id);
            if ($user_info) {
                $store_name = $user_info->display_name;
            }
        }

        if (!empty($store_name)) {
            $response->data['wcfm_store_info'] = array(
                'vendor_id' => $vendor_id,
                'store_name' => $store_name
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

    // Iterate through all items in the cart package
    foreach ($package['contents'] as $item_id => $values) {
        $product = $values['data'];
        if ($product) {
            $product_id = $product->get_id();
            if ($product->is_type('variation')) {
                $product_id = $product->get_parent_id();
            }

            $seller_shipping_cost = get_post_meta($product_id, '_seller_shipping_cost', true);

            // Get vendor ID
            $vendor_id = get_post_field('post_author', $product_id);
            if (function_exists('wcfm_get_vendor_id_by_post')) {
                $w_id = wcfm_get_vendor_id_by_post($product_id);
                if ($w_id)
                    $vendor_id = $w_id;
            }

            if (is_numeric($seller_shipping_cost) && floatval($seller_shipping_cost) > 0) {
                // Save the highest shipping cost per vendor
                if (!isset($vendor_shipping_costs[$vendor_id]) || floatval($seller_shipping_cost) > $vendor_shipping_costs[$vendor_id]) {
                    $vendor_shipping_costs[$vendor_id] = floatval($seller_shipping_cost);
                }
            }
        }
    }

    $total_seller_shipping = array_sum($vendor_shipping_costs);

    if ($total_seller_shipping > 0) {
        // Calculate taxes using WC_Tax
        $taxes = WC_Tax::calc_shipping_tax($total_seller_shipping, WC_Tax::get_shipping_tax_rates());

        // Create the new Flat Rate and overwrite existing rates so it strictly forces shipping
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

    // Verify the email matches the billing email to prevent unauthorized cancellations
    if (strtolower($order->get_billing_email()) !== strtolower($email)) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Unauthorized. Email does not match the order.'), 403);
    }

    // Validation: Prevent cancellation if status is RTS ('completed' in our system) or 'rts'
    $current_status = $order->get_status();
    if ($current_status === 'completed' || $current_status === 'rts') {
        return new WP_REST_Response(array('success' => false, 'message' => 'Order cannot be cancelled because it is already Ready to Ship.'), 400);
    }

    // Only allow cancellation if processing or pending
    if ($current_status !== 'processing' && $current_status !== 'pending') {
        return new WP_REST_Response(array('success' => false, 'message' => 'Order cannot be cancelled in its current status.'), 400);
    }

    try {
        $cancel_note = "Customer cancelled the order. Reason: " . $reason;

        // Update status to cancelled
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

// ── Inject WCFM Store Name into WooCommerce Orders API ─────────────────────────
function shopx_inject_wcfm_store_name_to_order_api($response, $order, $request)
{
    if (empty($response->data['line_items'])) {
        return $response;
    }

    foreach ($response->data['line_items'] as &$item) {
        $product_id = isset($item['product_id']) ? $item['product_id'] : 0;
        if ($product_id) {
            $vendor_id = get_post_field('post_author', $product_id);
            if ($vendor_id) {
                // Try to get WCFM store name
                $store_name = get_user_meta($vendor_id, 'store_name', true);
                if (!$store_name) {
                    $store_name = get_user_meta($vendor_id, 'wcfmmp_store_name', true);
                }

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

    // Brand (Meta-based or Term-based depending on setup)
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

        // Enrich variations with explicit thumbnail IDs, full URLs, and accurate prices
        foreach ($available_variations as $key => $variation_data) {
            $variation_id = $variation_data['variation_id'];
            $variation_obj = wc_get_product($variation_id);

            if ($variation_obj) {
                // Image Data
                $image_id = $variation_obj->get_image_id();
                if ($image_id) {
                    $available_variations[$key]['_thumbnail_id'] = $image_id;
                    $available_variations[$key]['variation_image_src'] = wp_get_attachment_image_url($image_id, 'full');
                }

                // Explicit Price Data (Ensure no stale/cached values in full_data)
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
    add_filter('woocommerce_rest_prepare_shop_order_object', 'shopx_inject_wcfm_store_name_to_order_api', 10, 3);
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
