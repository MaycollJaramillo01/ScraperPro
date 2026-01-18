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
