import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const api = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WORDPRESS_URL,
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET,
    version: "wc/v3"
});

export const searchProducts = async (query) => {
    try {
        const response = await api.get("products", {
            search: query,
            status: "publish",
        });
        return response.data;
    } catch (error) {
        console.error("Error searching products:", error);
        return [];
    }
};

export default api;
