import { spawn } from "node:child_process";
import path from "node:path";

export type AngiLead = {
    name: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    rating?: number;
    reviewCount?: number;
    category?: string;
    sourceUrl?: string;
    keyword: string;
    location: string;
    source: "angi";
};

export type AngiResult = {
    leads: AngiLead[];
    requestUrl: string;
    userAgent: string;
    acceptLanguage: string;
    status: number;
    attempts: number;
    error?: string;
};

export async function scrapeAngi(input: {
    keyword: string;
    location: string;
    limit?: number;
}): Promise<AngiResult> {
    const limit = input.limit ?? 25;
    const pythonPath = "C:\\Python313\\python.exe";
    const scriptPath = path.join(process.cwd(), "lib", "scrapers", "angi_scraper.py");

    return new Promise((resolve, reject) => {
        const pyProcess = spawn(pythonPath, [
            scriptPath,
            input.keyword,
            input.location,
            "--limit",
            limit.toString(),
        ]);

        let output = "";
        let errorOutput = "";

        pyProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        pyProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        pyProcess.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Angi scraper failed with code ${code}: ${errorOutput}`));
                return;
            }

            try {
                const result = JSON.parse(output);
                if (result.error) {
                    reject(new Error(result.error));
                    return;
                }

                // Parse city and state from location
                const [city, state] = input.location.split(",").map((s) => s.trim());
                const category = input.keyword.replace(/-/g, " ");

                resolve({
                    leads: result.leads || [],
                    requestUrl: `https://www.angi.com/companylist/us/${state?.toLowerCase()}/${city?.toLowerCase().replace(/\s+/g, "-")}/${category.replace(/\s+/g, "-")}.htm`,
                    userAgent: "Python/curl-cffi (Chrome 120 impersonation)",
                    acceptLanguage: "en-US,en;q=0.9",
                    status: result.status || 200,
                    attempts: 1,
                });
            } catch (e) {
                reject(new Error(`Failed to parse Angi output: ${output}`));
            }
        });
    });
}
