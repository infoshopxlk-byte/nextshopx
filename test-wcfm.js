const axios = require("axios");

async function listWCFM() {
    const baseUrl = "https://shopx.lk/wp-json/wcfmmp/v1/store-vendors";

    try {
        console.log(`Listing WCFM vendors: ${baseUrl}`);
        const response = await axios.get(baseUrl);
        console.log("WCFM Vendors (subset):", JSON.stringify(response.data.slice(0, 2), null, 2));
    } catch (error) {
        console.error("WCFM List Error:", error.response?.status, error.response?.data || error.message);
    }
}

listWCFM();
