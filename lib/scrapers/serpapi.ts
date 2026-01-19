const SERPAPI_BASE = "https://serpapi.com/search.json";

type SerpApiCommonParams = Record<string, string | number | undefined>;

async function fetchSerpApi(params: SerpApiCommonParams) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_KEY is not configured");
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });
  searchParams.set("api_key", apiKey);

  const url = `${SERPAPI_BASE}?${searchParams.toString()}`;
  const response = await fetch(url);
  const payload = await response.json();

  return { payload, url, status: response.status };
}

export type SerpLead = {
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
  rating?: number;
  reviews?: number;
  yearsInBusiness?: number;
  googleGuaranteed?: boolean;
  licenseNumber?: string;
  keyword: string;
  location: string;
  source: string;
};

export type SerpResult = {
  leads: SerpLead[];
  status: number;
  attempts: number;
  requestUrl: string;
  error?: string;
};

function splitAddress(address?: string | null) {
  if (!address) return {};
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const city = parts.length >= 2 ? parts[parts.length - 2] : undefined;
  const regionPostal = parts.length >= 1 ? parts[parts.length - 1] : undefined;
  let region: string | undefined;
  let postalCode: string | undefined;
  if (regionPostal) {
    const rpParts = regionPostal.split(" ").filter(Boolean);
    if (rpParts.length >= 1) {
      region = rpParts[0];
    }
    if (rpParts.length >= 2) {
      postalCode = rpParts.slice(1).join(" ");
    }
  }
  return { city, region, postalCode };
}

export async function scrapeSerpGoogleMaps(input: {
  keyword: string;
  location: string;
  limit?: number;
}): Promise<SerpResult> {
  const limit = input.limit ?? 200;
  let fetched = 0;
  let page = 0;
  let attempts = 0;
  const leads: SerpLead[] = [];
  let lastUrl = "";

  while (fetched < limit) {
    const pageParams: SerpApiCommonParams = {
      engine: "google_maps",
      q: `${input.keyword} ${input.location}`,
      type: "search",
      google_domain: "google.com",
      hl: "en",
      gl: "us",
      start: page * 20, // 20 results per page
    };

    const { payload, url, status } = await fetchSerpApi(pageParams);
    attempts += 1;
    lastUrl = url;

    if (status !== 200 || payload.error) {
      return {
        leads,
        status,
        attempts,
        requestUrl: url,
        error: payload.error || "SerpApi Google Maps request failed",
      };
    }

    const results = (payload.local_results as any[]) ?? [];
    if (results.length === 0) break;

    leads.push(
      ...results.map((r) => {
        const address = r.address || r.title && r.subtitle ? `${r.title}, ${r.subtitle}` : r.full_address;
        const { city, region, postalCode } = splitAddress(address);
        return {
          name: r.title || r.name || "Unknown",
          phone: r.phone,
          website: r.website,
          street: r.address || undefined,
          city,
          region,
          postalCode,
          address: address || undefined,
          category: r.category,
          sourceUrl: r.link || r.spotlight_map_link || r.website,
          rating: r.rating,
          reviews: r.reviews,
          keyword: input.keyword,
          location: input.location,
          source: "google_maps_serpapi",
        };
      }),
    );

    fetched += results.length;
    if (results.length < 20) break;
    page += 1;
  }

  return {
    leads: leads.slice(0, limit),
    status: 200,
    attempts,
    requestUrl: lastUrl,
  };
}

export async function lookupGoogleMapsContact(input: {
  name: string;
  location: string;
  address?: string | null;
}): Promise<{
  phone?: string;
  website?: string;
  sourceUrl?: string;
  address?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
} | null> {
  const query = [input.name, input.address, input.location]
    .filter(Boolean)
    .join(" ");

  const params: SerpApiCommonParams = {
    engine: "google_maps",
    q: query,
    type: "search",
    google_domain: "google.com",
    hl: "en",
    gl: "us",
  };

  const { payload, status } = await fetchSerpApi(params);
  if (status !== 200 || payload.error) {
    return null;
  }

  const results = (payload.local_results as any[]) ?? [];
  if (results.length === 0) {
    return null;
  }

  const r = results[0];
  const address = r.address || r.full_address;
  const { city, region, postalCode } = splitAddress(address);

  return {
    phone: r.phone,
    website: r.website,
    sourceUrl: r.link || r.spotlight_map_link || r.website,
    address: address || undefined,
    street: r.address || undefined,
    city,
    region,
    postalCode,
  };
}

export async function scrapeSerpYelp(input: {
  keyword: string;
  location: string;
  limit?: number;
}): Promise<SerpResult> {
  const limit = input.limit ?? 200;
  let fetched = 0;
  let attempts = 0;
  const leads: SerpLead[] = [];
  let start = 0;
  let lastUrl = "";

  while (fetched < limit) {
    const params: SerpApiCommonParams = {
      engine: "yelp",
      find_desc: input.keyword,
      find_loc: input.location,
      start,
    };

    const { payload, url, status } = await fetchSerpApi(params);
    attempts += 1;
    lastUrl = url;

    if (status !== 200 || payload.error) {
      return {
        leads,
        status,
        attempts,
        requestUrl: url,
        error: payload.error || "SerpApi Yelp request failed",
      };
    }

    // Yelp engine returns results under organic_results
    const results =
      (payload.local_results as any[]) ??
      (payload.organic_results as any[]) ??
      [];
    if (results.length === 0) break;

    leads.push(
      ...results.map((r) => {
        const { city, region, postalCode } = splitAddress(r.address);
        return {
          name: r.title || r.name || "Unknown",
          phone: r.phone,
          website: r.website,
          street: r.address || undefined,
          city,
          region,
          postalCode,
          address: r.address || undefined,
          category: r.category,
          sourceUrl: r.link || r.share_link,
          rating: r.rating,
          reviews: r.review_count || r.reviews,
          keyword: input.keyword,
          location: input.location,
          source: "yelp_serpapi",
        };
      }),
    );

    fetched += results.length;
    if (results.length < 10) break;
    start += results.length;
  }

  return {
    leads: leads.slice(0, limit),
    status: 200,
    attempts,
    requestUrl: lastUrl,
  };
}

export async function scrapeSerpBingPlaces(input: {
  keyword: string;
  location: string;
  limit?: number;
}): Promise<SerpResult> {
  // Bing local via SerpApi is not supported; return explicit error.
  return {
    leads: [],
    status: 400,
    attempts: 1,
    requestUrl: "unsupported: bing_local",
    error: "SerpApi does not support bing_local in this plan",
  };
}

/**
 * Google Local Services API Scraper
 * Returns verified service providers (plumbers, electricians, lawyers, etc.)
 * These are Google-verified businesses with background checks
 */
export async function scrapeSerpGoogleLocalServices(input: {
  keyword: string;
  location: string;
  limit?: number;
}): Promise<SerpResult> {
  const limit = input.limit ?? 200;
  let fetched = 0;
  let attempts = 0;
  const leads: SerpLead[] = [];
  let lastUrl = "";
  let start = 0;

  while (fetched < limit) {
    const params: SerpApiCommonParams = {
      engine: "google_local_services",
      q: input.keyword,
      place_id: input.location, // Can be a place name or Google Place ID
      data_cid: undefined, // Optional: specific business CID
      hl: "en",
      gl: "us",
      start,
    };

    const { payload, url, status } = await fetchSerpApi(params);
    attempts += 1;
    lastUrl = url;

    if (status !== 200 || payload.error) {
      // If no results found, try alternative query format
      if (attempts === 1 && payload.error?.includes("No results")) {
        // Try with location in query
        const altParams: SerpApiCommonParams = {
          engine: "google_local_services",
          q: `${input.keyword} in ${input.location}`,
          hl: "en",
          gl: "us",
        };
        const altResult = await fetchSerpApi(altParams);
        attempts += 1;
        
        if (altResult.status === 200 && !altResult.payload.error) {
          const results = (altResult.payload.local_ads as any[]) ?? [];
          leads.push(...mapLocalServicesResults(results, input));
          return {
            leads: leads.slice(0, limit),
            status: 200,
            attempts,
            requestUrl: altResult.url,
          };
        }
      }
      
      return {
        leads,
        status,
        attempts,
        requestUrl: url,
        error: payload.error || "SerpApi Google Local Services request failed",
      };
    }

    // Google Local Services returns results under local_ads
    const results = (payload.local_ads as any[]) ?? [];
    if (results.length === 0) break;

    leads.push(...mapLocalServicesResults(results, input));

    fetched += results.length;
    if (results.length < 20) break;
    start += results.length;
  }

  return {
    leads: leads.slice(0, limit),
    status: 200,
    attempts,
    requestUrl: lastUrl,
  };
}

function mapLocalServicesResults(
  results: any[],
  input: { keyword: string; location: string }
): SerpLead[] {
  return results.map((r) => {
    const address = r.address || r.service_area || "";
    const { city, region, postalCode } = splitAddress(address);
    
    return {
      name: r.name || r.title || "Unknown",
      phone: r.phone,
      website: r.website,
      street: r.address || undefined,
      city,
      region,
      postalCode,
      address: address || undefined,
      category: r.category || r.service_type || r.type,
      sourceUrl: r.link || r.profile_link,
      keyword: input.keyword,
      location: input.location,
      source: "google_local_services_serpapi",
      // Additional fields specific to Local Services
      rating: r.rating,
      reviews: r.reviews,
      yearsInBusiness: r.years_in_business,
      googleGuaranteed: r.google_guaranteed || r.google_screened,
      licenseNumber: r.license_number,
    };
  });
}

/**
 * Google Jobs API Scraper
 * Returns companies that are hiring - indicates active/growing businesses
 */
export async function scrapeSerpGoogleJobs(input: {
  keyword: string;
  location: string;
  limit?: number;
}): Promise<SerpResult> {
  const limit = input.limit ?? 100;
  let attempts = 0;
  const leads: SerpLead[] = [];
  let lastUrl = "";
  let start = 0;

  while (leads.length < limit) {
    const params: SerpApiCommonParams = {
      engine: "google_jobs",
      q: input.keyword,
      location: input.location,
      hl: "en",
      gl: "us",
      start,
    };

    const { payload, url, status } = await fetchSerpApi(params);
    attempts += 1;
    lastUrl = url;

    if (status !== 200 || payload.error) {
      return {
        leads,
        status,
        attempts,
        requestUrl: url,
        error: payload.error || "SerpApi Google Jobs request failed",
      };
    }

    const results = (payload.jobs_results as any[]) ?? [];
    if (results.length === 0) break;

    // Extract unique companies from job listings
    const seenCompanies = new Set(leads.map(l => l.name.toLowerCase()));
    
    for (const job of results) {
      const companyName = job.company_name || job.employer_name;
      if (!companyName || seenCompanies.has(companyName.toLowerCase())) continue;
      
      seenCompanies.add(companyName.toLowerCase());
      
      const locationParts = (job.location || "").split(",").map((p: string) => p.trim());
      
      leads.push({
        name: companyName,
        phone: undefined, // Jobs API doesn't provide phone
        website: job.company_link || job.apply_link,
        street: undefined,
        city: locationParts[0] || undefined,
        region: locationParts[1] || undefined,
        postalCode: undefined,
        address: job.location || undefined,
        category: job.category || job.job_title, // Use job category as business category hint
        sourceUrl: job.link || job.job_link,
        keyword: input.keyword,
        location: input.location,
        source: "google_jobs_serpapi",
      });
    }

    if (results.length < 10) break;
    start += 10;
  }

  return {
    leads: leads.slice(0, limit),
    status: 200,
    attempts,
    requestUrl: lastUrl,
  };
}
