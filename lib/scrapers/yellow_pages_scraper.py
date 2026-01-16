import sys
import json
import argparse
from curl_cffi import requests
from bs4 import BeautifulSoup

# Ciudades principales con alta población latina o uso extendido de español
LATINO_HEAVY_LOCATIONS = [
    # California
    "Los Angeles, CA",
    "San Diego, CA",
    "San Jose, CA",
    "San Francisco, CA",
    "Fresno, CA",
    "Sacramento, CA",
    "Riverside, CA",
    "Bakersfield, CA",
    # Texas
    "Houston, TX",
    "San Antonio, TX",
    "Dallas, TX",
    "Austin, TX",
    "Fort Worth, TX",
    "El Paso, TX",
    "McAllen, TX",
    "Brownsville, TX",
    "Laredo, TX",
    # Florida
    "Miami, FL",
    "Orlando, FL",
    "Tampa, FL",
    "Jacksonville, FL",
    # New York / East Coast
    "New York, NY",
    "Jersey City, NJ",
    "Newark, NJ",
    # Midwest
    "Chicago, IL",
    # Southwest
    "Phoenix, AZ",
    "Tucson, AZ",
    "Albuquerque, NM",
    "Las Vegas, NV",
    "Denver, CO",
    # Southeast
    "Atlanta, GA",
    "Charlotte, NC",
    "Raleigh, NC",
    # Others con fuerte presencia latina
    "Washington, DC",
]

STATE_FALLBACK_CITY = {
    "AL": "Birmingham, AL",
    "AK": "Anchorage, AK",
    "AZ": "Phoenix, AZ",
    "AR": "Little Rock, AR",
    "CA": "Los Angeles, CA",
    "CO": "Denver, CO",
    "CT": "Bridgeport, CT",
    "DE": "Wilmington, DE",
    "FL": "Miami, FL",
    "GA": "Atlanta, GA",
    "HI": "Honolulu, HI",
    "ID": "Boise, ID",
    "IL": "Chicago, IL",
    "IN": "Indianapolis, IN",
    "IA": "Des Moines, IA",
    "KS": "Wichita, KS",
    "KY": "Louisville, KY",
    "LA": "New Orleans, LA",
    "ME": "Portland, ME",
    "MD": "Baltimore, MD",
    "MA": "Boston, MA",
    "MI": "Detroit, MI",
    "MN": "Minneapolis, MN",
    "MS": "Jackson, MS",
    "MO": "Kansas City, MO",
    "MT": "Billings, MT",
    "NE": "Omaha, NE",
    "NV": "Las Vegas, NV",
    "NH": "Manchester, NH",
    "NJ": "Newark, NJ",
    "NM": "Albuquerque, NM",
    "NY": "New York, NY",
    "NC": "Charlotte, NC",
    "ND": "Fargo, ND",
    "OH": "Columbus, OH",
    "OK": "Oklahoma City, OK",
    "OR": "Portland, OR",
    "PA": "Philadelphia, PA",
    "RI": "Providence, RI",
    "SC": "Charleston, SC",
    "SD": "Sioux Falls, SD",
    "TN": "Nashville, TN",
    "TX": "Houston, TX",
    "UT": "Salt Lake City, UT",
    "VT": "Burlington, VT",
    "VA": "Virginia Beach, VA",
    "WA": "Seattle, WA",
    "WV": "Charleston, WV",
    "WI": "Milwaukee, WI",
    "WY": "Cheyenne, WY",
    "DC": "Washington, DC",
}


def parse_state_abbr(location: str) -> str | None:
    parts = location.split(",")
    if len(parts) < 2:
        return None
    state_part = parts[1].strip()
    state = state_part.split()[0].upper() if state_part else ""
    return state if len(state) == 2 else None

def parse_locality(locality):
    if not locality:
        return {}
    parts = locality.split(",")
    city = parts[0].strip() if len(parts) > 0 else None
    state_zip = parts[1].strip() if len(parts) > 1 else ""
    sz_parts = state_zip.split()
    region = sz_parts[0] if len(sz_parts) > 0 else None
    postal_code = " ".join(sz_parts[1:]) if len(sz_parts) > 1 else None
    return {
        "city": city,
        "region": region,
        "postalCode": postal_code
    }

def scrape_location(keyword, location, limit, seen_leads):
    leads = []
    page = 1
    max_pages = 80  # Increased for up to 2000 results (usually ~30 results per page)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/"
    }

    while len(leads) < limit and page <= max_pages:
        url = f"https://www.yellowpages.com/search?search_terms={keyword}&geo_location_terms={location}&page={page}"
        
        try:
            # impersonate="chrome120" handles the TLS fingerprinting
            response = requests.get(url, headers=headers, impersonate="chrome120", timeout=30)
            
            if response.status_code != 200:
                if page == 1:
                    return {
                        "error": f"Failed to fetch Yellow Pages. Status: {response.status_code}",
                        "leads": []
                    }
                break

            soup = BeautifulSoup(response.text, "html.parser")
            results = soup.select(".search-results .result, .organic .result, [data-ypresult]")
            
            if not results:
                break

            for row in results:
                if len(leads) >= limit:
                    break
                    
                name_elem = row.select_one("a.business-name")
                if not name_elem:
                    continue
                    
                name = name_elem.get_text(strip=True)
                phone_elem = row.select_one(".phones.phone.primary, .phone")
                phone = phone_elem.get_text(strip=True) if phone_elem else None
                
                # Internal deduplication
                lead_key = f"{name.lower()}|{phone or ''}"
                if lead_key in seen_leads:
                    continue
                seen_leads.add(lead_key)

                listing_path = name_elem.get("href")
                website_elem = row.select_one("a.track-visit-website, a.website-link")
                website_path = website_elem.get("href") if website_elem else None
                
                street_elem = row.select_one(".street-address, .adr .street-address")
                street = street_elem.get_text(strip=True) if street_elem else None
                
                locality_elem = row.select_one(".locality")
                locality = locality_elem.get_text(strip=True) if locality_elem else ""
                loc_data = parse_locality(locality)
                
                category_elem = row.select_one(".categories")
                category = category_elem.get_text(strip=True) if category_elem else None

                lead = {
                    "name": name,
                    "phone": phone,
                    "website": f"https://www.yellowpages.com{website_path}" if website_path and website_path.startswith("/") else website_path,
                    "street": street,
                    "city": loc_data.get("city"),
                    "region": loc_data.get("region"),
                    "postalCode": loc_data.get("postalCode"),
                    "address": f"{street}, {locality}" if street and locality else (street or locality or None),
                    "category": category,
                    "sourceUrl": f"https://www.yellowpages.com{listing_path}" if listing_path and listing_path.startswith("/") else listing_path or url,
                    "keyword": keyword,
                    "location": location,
                    "source": "yellow_pages"
                }
                leads.append(lead)

            page += 1

        except Exception as e:
            if page == 1:
                return {"error": str(e), "leads": []}
            break

    return {
        "leads": leads,
        "status": 200,
        "count": len(leads),
        "pages_scraped": page - 1,
    }


def scrape_yellow_pages(keyword, location, limit=2000):
    """
    Si la ubicación es "us_latino" (case-insensitive), recorre un conjunto de
    ciudades de EE.UU. con alta población latina/español y agrega los leads
    hasta el límite indicado. Si no, ejecuta la búsqueda tradicional en una sola ciudad.
    """
    normalized_location = location.strip().lower()
    use_latino_locations = normalized_location in {"us_latino", "usa_latino", "all_us_latino", "usa_es"}

    if not use_latino_locations:
        seen = set()
        primary = scrape_location(keyword, location, limit, seen)

        total_pages = primary.get("pages_scraped", 0)
        leads = list(primary.get("leads", []))

        state_abbr = parse_state_abbr(location)
        fallback_loc = STATE_FALLBACK_CITY.get(state_abbr) if state_abbr else None

        if fallback_loc and fallback_loc.strip().lower() != normalized_location and len(leads) < limit:
            secondary = scrape_location(keyword, fallback_loc, limit, seen)
            leads.extend(secondary.get("leads", []))
            total_pages += secondary.get("pages_scraped", 0)

        trimmed = leads[:limit]

        return {
            "leads": trimmed,
            "status": 200 if trimmed else primary.get("status", 404),
            "count": len(trimmed),
            "pages_scraped": total_pages,
            "locations": [location] + ([fallback_loc] if fallback_loc else []),
            "mode": "single_with_state_fallback" if fallback_loc else "single",
        }

    all_leads = []
    seen_leads = set()
    total_pages = 0

    for loc in LATINO_HEAVY_LOCATIONS:
        if len(all_leads) >= limit:
            break

        result = scrape_location(keyword, loc, limit, seen_leads)

        if "leads" in result and isinstance(result["leads"], list):
            all_leads.extend(result["leads"])
        total_pages += result.get("pages_scraped", 0)

    trimmed = all_leads[:limit]

    return {
        "leads": trimmed,
        "status": 200 if trimmed else 404,
        "count": len(trimmed),
        "pages_scraped": total_pages,
        "locations": LATINO_HEAVY_LOCATIONS,
        "mode": "us_latino",
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("keyword")
    parser.add_argument("location")
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    result = scrape_yellow_pages(args.keyword, args.location, args.limit)
    print(json.dumps(result))
