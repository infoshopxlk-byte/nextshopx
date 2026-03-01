const axios = require("axios");

async function testWCFMSlug() {
    const slug = "gearup-tech";
    const baseUrl = "https://shopx.lk/wp-json/wcfmmp/v1/store-vendors";

    try {
        console.log(`Testing WCFM SLUG: ${baseUrl}?slug=${slug}`);
        const response = await axios.get(baseUrl, {
            params: {
                slug: slug
            }
        });
        console.log("WCFM Slug Match Result:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("WCFM Slug Error:", error.response?.status, error.response?.data || error.message);
    }
}

testWCFMSlug();
