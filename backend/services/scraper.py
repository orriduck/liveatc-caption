import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import re

BASE_URL = "https://www.liveatc.net"


def search_channels(icao_code: str, html_content: Optional[str] = None) -> List[Dict]:
    """
    Search LiveATC for channels matching an ICAO code.
    If html_content is provided, it parses that instead of making a network request.
    """
    if html_content is None:
        url = f"{BASE_URL}/search/?icao={icao_code}"
        try:
            # Note: verify=False is used to avoid periodic macOS SSL certificate issues
            response = requests.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.liveatc.net/",
                },
                verify=False,
            )
            response.raise_for_status()
            html_content = response.text
        except requests.RequestException as e:
            print(f"Error fetching data: {e}")
            return {"airport": {}, "channels": []}

    soup = BeautifulSoup(html_content, "html.parser")
    channels = []
    airport_info = {}

    # 1. Extract Airport Info (from the top box)
    # Usually the first table with background-color:#F8F9F9
    info_table = soup.find("table", style=re.compile(r"background-color:#F8F9F9"))
    if info_table:
        cells = info_table.find_all("td")
        full_text = " ".join([c.get_text(separator=" ", strip=True) for c in cells])

        labels = [
            "ICAO:",
            "IATA:",
            "Airport:",
            "City:",
            "State/Province:",
            "Country:",
            "Continent:",
            "METAR Weather:",
            "ADS-B",
            "Flight Activity",
            "Webcam",
            "Airport Info",
        ]
        pattern = "|".join([re.escape(label) for label in labels])
        parts = re.split(f"({pattern})", full_text)

        extracted = {}
        for i in range(1, len(parts), 2):
            label = parts[i].replace(":", "").strip().lower()
            value = parts[i + 1].strip()
            # If we already have this simplified label, don't overwrite with subsequent delimiters
            if label not in extracted:
                extracted[label] = value

        airport_info = {
            "icao": extracted.get("icao"),
            "iata": extracted.get("iata") or None,
            "name": extracted.get("airport"),
            "city": extracted.get("city"),
            "region": extracted.get("state/province"),
            "country": extracted.get("country") or None,
            "metar": re.sub(r"\s+", " ", extracted.get("metar weather", "")).strip(),
        }

    # 2. Extract Channels
    # The structure in the provided HTML:
    # Each channel block starts with a <table class="body">...</table> containing the name and 'listen' links.
    # Followed immediately by a <table class="freqTable">...</table>.

    # We find all 'table.body' that seem to be channel headers.
    # Looking at the HTML, the ones with 'bgcolor="lightblue"' in the first td seem to be headers.

    tables = soup.find_all("table")

    current_channel = None

    for table in tables:
        # Check if this is a channel info table
        if "body" in table.get("class", []) and table.find("td", bgcolor="lightblue"):
            # This is likely a channel start
            # Extract Name
            name_tag = table.find("strong")
            if not name_tag:
                continue
            channel_name = name_tag.get_text(strip=True)

            # Extract Mount Point / ID
            # Look for myHTML5Popup('kbos_final','kbos')
            # or href="/play/kbos_final.pls"
            mount = None
            onclick_img = table.find("a", onclick=re.compile(r"myHTML5Popup"))
            if onclick_img:
                match = re.search(r"myHTML5Popup\('([^']+)'", onclick_img["onclick"])
                if match:
                    mount = match.group(1)

            if not mount:
                # Fallback to .pls link
                pls_link = table.find("a", href=re.compile(r"\.pls"))
                if pls_link:
                    match = re.search(r"/play/(.+)\.pls", pls_link["href"])
                    if match:
                        mount = match.group(1)

            if not mount:
                continue

            # Extract Status
            status_font = table.find("font", color=["green", "red"])
            status = status_font.get_text(strip=True) if status_font else "UNKNOWN"
            is_up = "UP" in status.upper()

            # Extract Listeners
            listeners = 0
            # Text is like: Feed Status: UP   Listeners: 4
            table_text = table.get_text()
            listener_match = re.search(r"Listeners:\s*(\d+)", table_text)
            if listener_match:
                listeners = int(listener_match.group(1))

            current_channel = {
                "name": channel_name,
                "id": mount,
                "status": status,
                "is_up": is_up,
                "listeners": listeners,
                # Direct stream via LiveATC load balancer
                "stream_url": f"https://d.liveatc.net/{mount}",
                "frequencies": [],
            }
            channels.append(current_channel)

        # Check if this is a freq table (immediately following a channel)
        elif "freqTable" in table.get("class", []) and current_channel:
            # Extract frequencies
            rows = table.find_all("tr")
            for row in rows:
                cols = row.find_all("td")
                if len(cols) >= 2:
                    facility = cols[0].get_text(strip=True)
                    freq = cols[1].get_text(strip=True)
                    if facility == "Facility" and freq == "Frequency":
                        continue  # Skip header
                    current_channel["frequencies"].append(
                        {"facility": facility, "frequency": freq}
                    )
            # Reset current channel expectation as freq table usually closes the block
            # But sometimes multiple tables follow? No, usually Body -> Freq -> Sponsor -> Body...
            # We keep current_channel active until a new one is found?
            # Actually, looking at the HTML, the structure is strictly alternating or close to it.
            # We can just append frequencies to the *latest* channel found.
            pass

    return {"airport": airport_info, "channels": channels}


if __name__ == "__main__":
    # Internal module testing
    print("Scraper module loaded. Use through search_channels(icao_code).")
