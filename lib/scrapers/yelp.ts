export type YelpLead = {
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
  source: "yelp";
};

export type YelpResult = {
  leads: YelpLead[];
  status: number;
  attempts: number;
  requestUrl: string;
  error?: string;
};

type YelpBusiness = {
  name: string;
  phone?: string;
  display_phone?: string;
  url?: string;
  categories?: { alias: string; title: string }[];
  location?: {
    address1?: string;
    address2?: string;
    address3?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    display_address?: string[];
  };
};

export async function scrapeYelp(input: {
  keyword: string;
  location: string;
  limit?: number;
}): Promise<YelpResult> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    throw new Error("YELP_API_KEY is not configured");
  }

  const totalLimit = input.limit ?? 200;
  const perPage = 50; // Yelp Fusion max per request
  let fetched = 0;
  let attempts = 0;
  const leads: YelpLead[] = [];

  while (fetched < totalLimit) {
    const remaining = totalLimit - fetched;
    const pageLimit = Math.min(perPage, remaining);
    const searchParams = new URLSearchParams({
      term: input.keyword,
      location: input.location,
      limit: pageLimit.toString(),
      offset: fetched.toString(),
    });

    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    attempts += 1;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        leads,
        status: response.status,
        attempts,
        requestUrl: response.url,
        error: errorText || response.statusText,
      };
    }

    const payload = (await response.json()) as {
      businesses?: YelpBusiness[];
    };

    const businesses = payload.businesses ?? [];
    if (businesses.length === 0) break;

    leads.push(
      ...businesses.map((biz): YelpLead => {
        const addressParts = biz.location?.display_address ?? [];
        const fullAddress = addressParts.join(", ").trim() || undefined;
        const category = biz.categories?.map((c) => c.title).join(", ") || undefined;
        return {
          name: biz.name,
          phone: biz.display_phone || biz.phone,
          website: undefined, // Yelp API does not return external website
          street: biz.location?.address1 || undefined,
          city: biz.location?.city || undefined,
          region: biz.location?.state || undefined,
          postalCode: biz.location?.zip_code || undefined,
          address: fullAddress,
          category,
          sourceUrl: biz.url,
          keyword: input.keyword,
          location: input.location,
          source: "yelp",
        };
      }),
    );

    fetched += businesses.length;
    if (businesses.length < pageLimit) break;
  }

  return {
    leads: leads.slice(0, totalLimit),
    status: 200,
    attempts,
    requestUrl: `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(input.keyword)}&location=${encodeURIComponent(input.location)}`,
  };
}
