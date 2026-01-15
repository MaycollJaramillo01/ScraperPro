import { spawn } from "node:child_process";
import path from "node:path";

export type YellowPagesLead = {
  name: string;
  phone?: string;
  website?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  address?: string;
  category?: string;
  sourceUrl?: string;
  keyword: string;
  location: string;
  source: "yellow_pages";
};

export type YellowPagesResult = {
  leads: YellowPagesLead[];
  requestUrl: string;
  userAgent: string;
  acceptLanguage: string;
  status: number;
  attempts: number;
  error?: string;
};

export async function scrapeYellowPages(input: {
  keyword: string;
  location: string;
  limit?: number;
}): Promise<YellowPagesResult> {
  const limit = input.limit ?? 25;
  const pythonPath = "C:\\Python313\\python.exe";
  const scriptPath = path.join(process.cwd(), "lib", "scrapers", "yellow_pages_scraper.py");

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
        reject(new Error(`Python scraper failed with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        const result = JSON.parse(output);
        if (result.error) {
          reject(new Error(result.error));
          return;
        }

        resolve({
          leads: result.leads || [],
          requestUrl: `https://www.yellowpages.com/search?search_terms=${input.keyword}&geo_location_terms=${input.location}`,
          userAgent: "Python/curl-cffi (Chrome 120 impersonation)",
          acceptLanguage: "en-US,en;q=0.9",
          status: result.status || 200,
          attempts: 1,
        });
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${output}`));
      }
    });
  });
}
