import httpx
from bs4 import BeautifulSoup
from typing import Optional, List, Dict
from .models import Airport, AudioChannel
import re

class LiveATCClient:
    BASE_URL = "https://www.liveatc.net"
    
    async def search_airport(self, icao: str) -> Optional[Airport]:
        """Search for airport information by ICAO code."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/search/", params={"icao": icao})
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Extract airport info from the first table
            airport_table = soup.find('table')
            if not airport_table:
                return None
                
            # Parse airport details
            airport_text = airport_table.get_text()
            airport_info = {
                "icao": icao,
                "iata": None,
                "name": None,
                "city": None,
                "country": None,
                "audio_channels": []
            }
            
            # Extract IATA and airport name
            iata_match = re.search(r"IATA:\s*(\w+)", airport_text)
            if iata_match:
                airport_info["iata"] = iata_match.group(1)
                
            name_match = re.search(r"Airport:\s*(.+?)(?=City:|$)", airport_text)
            if name_match:
                airport_info["name"] = name_match.group(1).strip()
                
            city_match = re.search(r"City:\s*(.+?)(?=State|Province|Country|$)", airport_text)
            if city_match:
                airport_info["city"] = city_match.group(1).strip()
                
            country_match = re.search(r"Country:\s*(.+?)(?=Continent|$)", airport_text)
            if country_match:
                airport_info["country"] = country_match.group(1).strip()
            
            # Extract audio channels
            channel_tables = soup.find_all('table', {'class': None})[1:]  # Skip the first table
            for table in channel_tables:
                facility_rows = table.find_all('tr')
                if not facility_rows:
                    continue
                    
                for row in facility_rows:
                    cols = row.find_all('td')
                    if len(cols) >= 2:
                        name = cols[0].get_text().strip()
                        frequency = cols[1].get_text().strip()
                        
                        # Find the associated play link
                        play_link = table.find('a', href=lambda x: x and 'play' in x)
                        url = f"{self.BASE_URL}{play_link['href']}" if play_link else None
                        
                        if name and url:
                            airport_info["audio_channels"].append(
                                AudioChannel(
                                    name=name,
                                    frequency=frequency.strip('*'),
                                    url=url
                                )
                            )
            
            return Airport(**airport_info) 