
async function test() {
    const url = "https://www.yellowpages.com/search?search_terms=pizza&geo_location_terms=Miami,FL";

    console.log("Fetching...", url);
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        console.log("Status:", response.status);
        console.log("Headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

        if (response.ok) {
            const text = await response.text();
            console.log("Body length:", text.length);
            console.log("Body preview:", text.substring(0, 500));
        } else {
            console.log("Response not OK");
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

test();
