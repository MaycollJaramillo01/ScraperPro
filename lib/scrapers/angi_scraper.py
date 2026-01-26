import sys
import json
import argparse
import os
import random
import time
import re
from curl_cffi import requests
from bs4 import BeautifulSoup

# Ciudades principales con alta población latina o uso extendido de español
LATINO_HEAVY_LOCATIONS = [
    # California
    "Los Angeles, CA",
    "San Diego, CA",
    "San Jose, CA",
    "San Francisco, CA",
    "Oakland, CA",
    "Fresno, CA",
    "Sacramento, CA",
    "Riverside, CA",
    "Bakersfield, CA",
    "Santa Ana, CA",
    "Anaheim, CA",
    "Long Beach, CA",
    "Stockton, CA",
    "Chula Vista, CA",
    "Modesto, CA",
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
    "Corpus Christi, TX",
    "San Jose, TX",
    "Irving, TX",
    "Arlington, TX",
    "Plano, TX",
    "Garland, TX",
    "Grand Prairie, TX",
    "Amarillo, TX",
    "Lubbock, TX",
    "Pasadena, TX",
    "Mesquite, TX",
    # Florida
    "Miami, FL",
    "Hialeah, FL",
    "Homestead, FL",
    "Fort Lauderdale, FL",
    "West Palm Beach, FL",
    "Orlando, FL",
    "Tampa, FL",
    "Jacksonville, FL",
    "Kissimmee, FL",
    # New York / East Coast
    "New York, NY",
    "Queens, NY",
    "Bronx, NY",
    "Brooklyn, NY",
    "Jersey City, NJ",
    "Newark, NJ",
    "Paterson, NJ",
    "Elizabeth, NJ",
    "Union City, NJ",
    "Trenton, NJ",
    # Midwest
    "Chicago, IL",
    "Aurora, IL",
    "Cicero, IL",
    "Waukegan, IL",
    # Southwest
    "Phoenix, AZ",
    "Tucson, AZ",
    "Mesa, AZ",
    "Glendale, AZ",
    "Albuquerque, NM",
    "Las Cruces, NM",
    "Las Vegas, NV",
    "Henderson, NV",
    "Reno, NV",
    "Denver, CO",
    # Southeast
    "Atlanta, GA",
    "Doral, FL",
    "Cape Coral, FL",
    "Charlotte, NC",
    "Raleigh, NC",
    # Others con fuerte presencia latina
    "Washington, DC",
    "San Juan, PR",
    "Ponce, PR",
    "Bayamon, PR",
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

# Mapping of common service keywords to Angi category slugs
KEYWORD_TO_CATEGORY = {
    "plumber": "plumbing",
    "plumbers": "plumbing",
    "plumbing": "plumbing",
    "electrician": "electrical",
    "electricians": "electrical",
    "electrical": "electrical",
    "hvac": "heating-and-cooling",
    "heating": "heating-and-cooling",
    "cooling": "heating-and-cooling",
    "air conditioning": "heating-and-cooling",
    "roofing": "roofing",
    "roofer": "roofing",
    "roofers": "roofing",
    "landscaping": "landscaping",
    "landscaper": "landscaping",
    "lawn care": "lawn-care",
    "lawn": "lawn-care",
    "painting": "painting",
    "painter": "painting",
    "painters": "painting",
    "cleaning": "house-cleaning",
    "house cleaning": "house-cleaning",
    "maid": "house-cleaning",
    "flooring": "flooring",
    "floor": "flooring",
    "carpet": "flooring",
    "remodeling": "remodeling",
    "renovation": "remodeling",
    "contractor": "general-contractor",
    "general contractor": "general-contractor",
    "handyman": "handyman-services",
    "pest control": "pest-control",
    "exterminator": "pest-control",
    "garage door": "garage-doors",
    "fencing": "fencing",
    "fence": "fencing",
    "tree service": "tree-services",
    "tree removal": "tree-services",
    "windows": "windows",
    "window": "windows",
    "siding": "siding",
    "gutters": "gutters",
    "gutter": "gutters",
    "concrete": "concrete",
    "driveway": "concrete",
    "deck": "decks-and-porches",
    "patio": "decks-and-porches",
    "pool": "swimming-pools",
    "swimming pool": "swimming-pools",
    "appliance repair": "appliance-repair",
    "appliance": "appliance-repair",
    "locksmith": "locksmith",
    "moving": "moving",
    "movers": "moving",
    "storage": "moving",
}


def parse_state_abbr(location: str) -> str | None:
    parts = location.split(",")
    if len(parts) < 2:
        return None
    state_part = parts[1].strip()
    state = state_part.split()[0].upper() if state_part else ""
    return state if len(state) == 2 else None


def parse_city_state(location: str) -> tuple[str, str]:
    """Parse location string into city and state abbreviation."""
    parts = location.split(",")
    city = parts[0].strip().lower().replace(" ", "-") if parts else ""
    state = ""
    if len(parts) >= 2:
        state_part = parts[1].strip()
        state = state_part.split()[0].lower() if state_part else ""
    return city, state


def keyword_to_category(keyword: str) -> str:
    """Convert a keyword to an Angi category slug."""
    normalized = keyword.strip().lower()
    if normalized in KEYWORD_TO_CATEGORY:
        return KEYWORD_TO_CATEGORY[normalized]
    # Try partial matching
    for key, category in KEYWORD_TO_CATEGORY.items():
        if key in normalized or normalized in key:
            return category
    # Fallback: slugify the keyword
    return re.sub(r'[^a-z0-9]+', '-', normalized).strip('-')


def load_user_agents():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    ua_path = os.path.join(base_dir, "user_agents.txt")
    try:
        with open(ua_path, "r", encoding="utf-8") as handle:
            agents = [line.strip() for line in handle if line.strip()]
            return agents if agents else []
    except Exception:
        return []


def build_headers(user_agent: str):
    return {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }


def extract_rating(element) -> tuple[float | None, int | None]:
    """Extract rating value and review count from a business card element."""
    rating = None
    review_count = None
    
    # Try to find rating from aria-label
    rating_elem = element.select_one('[aria-label*="Rating"]')
    if rating_elem:
        aria_label = rating_elem.get("aria-label", "")
        match = re.search(r'Rating:\s*([\d.]+)', aria_label)
        if match:
            try:
                rating = float(match.group(1))
            except ValueError:
                pass
    
    # Alternative: Look for rating display class
    if rating is None:
        rating_display = element.select_one('[class*="RatingDisplay"], [class*="rating"]')
        if rating_display:
            rating_text = rating_display.get_text(strip=True)
            match = re.search(r'([\d.]+)', rating_text)
            if match:
                try:
                    rating = float(match.group(1))
                except ValueError:
                    pass
    
    # Extract review count
    review_elem = element.select_one('[class*="review"], [class*="Review"]')
    if review_elem:
        review_text = review_elem.get_text(strip=True)
        match = re.search(r'\((\d+)\)', review_text)
        if match:
            try:
                review_count = int(match.group(1))
            except ValueError:
                pass
    
    return rating, review_count


def scrape_location(keyword, location, limit, seen_leads):
    leads = []
    page = 1
    max_pages = 100  # Angi can have many pages of results

    user_agents = load_user_agents()
    fallback_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    session = requests.Session()

    city, state = parse_city_state(location)
    category = keyword_to_category(keyword)
    
    base_url = f"https://www.angi.com/companylist/us/{state}/{city}/{category}.htm"
    
    while len(leads) < limit and page <= max_pages:
        url = base_url if page == 1 else f"{base_url}?page={page}"
        
        try:
            response = None
            for attempt in range(3):
                user_agent = random.choice(user_agents) if user_agents else fallback_ua
                headers = build_headers(user_agent)
                
                # Warm up session for cookies
                session.get(
                    "https://www.angi.com/",
                    headers=headers,
                    impersonate="chrome120",
                    timeout=20,
                )
                
                response = session.get(
                    url,
                    headers=headers,
                    impersonate="chrome120",
                    timeout=30,
                )
                if response.status_code != 403:
                    break
                time.sleep(1 + attempt * 2)
            
            if response.status_code != 200:
                if page == 1:
                    return {
                        "error": f"Failed to fetch Angi. Status: {response.status_code}",
                        "leads": []
                    }
                break

            soup = BeautifulSoup(response.text, "html.parser")
            
            # Multiple selector strategies for business cards
            results = soup.select(
                '[class*="BusinessProfileCard"], '
                '[class*="ProCard"], '
                '[class*="business-card"], '
                '[data-testid*="business"], '
                '[class*="SearchResult"], '
                'article[class*="pro-card"]'
            )
            
            if not results:
                # Try finding any card-like structures with business links
                results = soup.select('div[class*="card"] a[href*="/companylist/"]')
                if results:
                    # Get parent containers
                    results = [r.find_parent('div', class_=True) for r in results if r.find_parent('div', class_=True)]
                    results = [r for r in results if r]  # Filter None values
            
            if not results:
                break

            for row in results:
                if len(leads) >= limit:
                    break
                
                # Extract business name
                name_elem = row.select_one(
                    'h3, h2, '
                    '[class*="business-name"], '
                    '[class*="BusinessName"], '
                    '[class*="ProName"], '
                    'a[class*="profile-target"] span'
                )
                if not name_elem:
                    # Try the link text itself
                    name_elem = row.select_one('a[href*="/companylist/"]')
                
                if not name_elem:
                    continue
                    
                name = name_elem.get_text(strip=True)
                if not name or len(name) < 2:
                    continue
                
                # Internal deduplication by name
                lead_key = name.lower()
                if lead_key in seen_leads:
                    continue
                seen_leads.add(lead_key)
                
                # Extract profile URL
                profile_link = row.select_one(
                    'a[class*="profile-target"], '
                    'a[class*="BusinessProfileCard"], '
                    'a[href*="-reviews-"]'
                )
                profile_url = None
                if profile_link:
                    href = profile_link.get("href", "")
                    if href.startswith("/"):
                        profile_url = f"https://www.angi.com{href}"
                    elif href.startswith("http"):
                        profile_url = href
                
                # Extract rating and reviews
                rating, review_count = extract_rating(row)
                
                # Extract address if available
                address_elem = row.select_one(
                    '[class*="address"], '
                    '[class*="Address"], '
                    '[class*="location"], '
                    '[class*="Location"]'
                )
                address = address_elem.get_text(strip=True) if address_elem else None
                
                # Extract services/categories if available
                services_elem = row.select_one(
                    '[class*="services"], '
                    '[class*="Services"], '
                    '[class*="category"], '
                    '[class*="Category"]'
                )
                services = services_elem.get_text(strip=True) if services_elem else None
                
                # Note: Phone numbers on Angi are typically only available on individual
                # profile pages and require clicking to reveal. We set phone to None here
                # and it would need a secondary scrape to get phone numbers.
                
                lead = {
                    "name": name,
                    "phone": None,  # Requires profile page scrape
                    "website": None,  # Requires profile page scrape
                    "address": address,
                    "city": city.replace("-", " ").title(),
                    "region": state.upper(),
                    "postalCode": None,
                    "rating": rating,
                    "reviewCount": review_count,
                    "category": services or category.replace("-", " ").title(),
                    "sourceUrl": profile_url or url,
                    "keyword": keyword,
                    "location": location,
                    "source": "angi"
                }
                leads.append(lead)

            page += 1
            # Respectful delay between pages
            time.sleep(random.uniform(1.5, 3.0))

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


def scrape_angi(keyword, location, limit=2000):
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
    parser = argparse.ArgumentParser(description="Angi.com Business Scraper")
    parser.add_argument("keyword", help="Service keyword to search (e.g., 'plumber', 'electrician')")
    parser.add_argument("location", help="Location to search (e.g., 'Houston, TX' or 'us_latino' for all latino-heavy cities)")
    parser.add_argument("--limit", type=int, default=25, help="Maximum number of leads to return")
    args = parser.parse_args()

    result = scrape_angi(args.keyword, args.location, args.limit)
    print(json.dumps(result, indent=2))
