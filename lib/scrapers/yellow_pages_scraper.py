import sys
import json
import argparse
from curl_cffi import requests
from bs4 import BeautifulSoup

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

def scrape_yellow_pages(keyword, location, limit=2000):
    leads = []
    seen_leads = set() # For deduplication
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
        "pages_scraped": page - 1
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("keyword")
    parser.add_argument("location")
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    result = scrape_yellow_pages(args.keyword, args.location, args.limit)
    print(json.dumps(result))
