<?php
// Load WordPress
require_once('wp-load.php');

if (!function_exists('wc_delete_product_transients')) {
    echo "WooCommerce not active.\n";
    exit;
}

// Get all variable products
$args = array(
    'post_type' => 'product',
    'posts_per_page' => -1,
    'tax_query' => array(
        array(
            'taxonomy' => 'product_type',
            'field' => 'slug',
            'terms' => 'variable',
        ),
    ),
);

$products = get_posts($args);

echo "Found " . count($products) . " variable products.\n";

foreach ($products as $p) {
    echo "Clearing transients for product ID: " . $p->ID . " (" . $p->post_title . ")\n";
    wc_delete_product_transients($p->ID);
}

echo "Done.\n";
