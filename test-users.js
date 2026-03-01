const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const api = new WooCommerceRestApi({
    url: "https://shopx.lk",
    consumerKey: "ck_90f13bf6de75e4c1acb74512e99647fd7f8fcbe4",
    consumerSecret: "cs_56dbffd5fc7b8f3d3cee3ec6c5645975cb30bd08",
    version: "wc/v3"
});

async function testUsers() {
    try {
        console.log("Testing wp/v2/users?search=GearUp...");
        const axios = require("axios");
        const res = await axios.get("https://shopx.lk/wp-json/wp/v2/users", {
            params: {
                search: "GearUp"
            }
        });

        console.log("Users Found:", res.data.length);
        if (res.data.length > 0) {
            console.log("User Data:", JSON.stringify(res.data[0], null, 2));
        }
    } catch (error) {
        console.error("Error:", error.response?.status, error.response?.data || error.message);
    }
}

testUsers();
