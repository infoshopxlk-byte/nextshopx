const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const api = new WooCommerceRestApi({
    url: "https://shopx.lk",
    consumerKey: "ck_90f13bf6de75e4c1acb74512e99647fd7f8fcbe4",
    consumerSecret: "cs_56dbffd5fc7b8f3d3cee3ec6c5645975cb30bd08",
    version: "wc/v3"
});

async function debug() {
    try {
        console.log("Searching for 'Jedel'...");
        const response = await api.get("products", {
            search: "Jedel",
            per_page: 1
        });

        if (response.data.length > 0) {
            console.log("\n--- Full Product JSON (Sample) ---");
            console.log(JSON.stringify(response.data[0], null, 2));
        }
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

debug();
