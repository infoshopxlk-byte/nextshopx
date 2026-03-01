const axios = require("axios");

async function checkIndex() {
    try {
        const response = await axios.get("https://shopx.lk/wp-json/");
        const namespaces = response.data.namespaces;
        console.log("Available Namespaces:", namespaces);

        const wcfmRoutes = Object.keys(response.data.routes).filter(r => r.includes("wcfm"));
        console.log("\nWCFM Routes (sample):", wcfmRoutes.slice(0, 5));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkIndex();
