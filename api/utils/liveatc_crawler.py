import os
import httpx
from bs4 import BeautifulSoup
from typing import Optional, List
import re
from api.constants import LIVEATC_BASE_URL
from api.models.airport import Airport
from api.models.audio_channel import AudioChannel, Frequency

class LiveATCCrawler:

    BASE_URL = LIVEATC_BASE_URL
    
    async def search_airport(self, icao: str) -> Optional[Airport]:
        """Search for airport information by ICAO code."""
        self.current_icao = icao.upper()
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/search/", params={"icao": icao})
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Find the main airport info table
            airport_table = soup.find('table', {'class': 'body'})
            if not airport_table:
                print("No airport table found")
                return None

            # Extract airport details
            airport_info = self._parse_airport_info(airport_table)
            if not airport_info:
                print("No airport info parsed")
                return None

            # Find all station tables and frequency tables
            stations = soup.find_all('table', class_='body', border='0')
            freq_tables = soup.find_all('table', class_='freqTable', colspan='2')
            
            print(f"Found {len(stations)} stations and {len(freq_tables)} frequency tables")
            
            # Extract audio channels
            channels = []
            for station, freq_table in zip(stations, freq_tables):
                channel = self._parse_station(station, freq_table)
                if channel:
                    channels.append(channel)
                    print(f"Added channel: {channel.name}")

            print(f"Found total {len(channels)} channels")
            
            return Airport(
                icao=icao.upper(),
                name=airport_info.get('name', ''),
                iata=airport_info.get('iata'),
                city=airport_info.get('city', ''),
                state_province=airport_info.get('state_province'),
                country=airport_info.get('country', ''),
                continent=airport_info.get('continent'),
                metar=airport_info.get('metar'),
                audio_channels=channels
            )

    def _parse_station(self, station, freq_table) -> Optional[AudioChannel]:
        """Parse feed information from a station table and its frequency table."""
        try:
            # Get feed name from the strong tag
            title_tag = station.find('strong')
            if not title_tag:
                return None
            
            feed_name = title_tag.text.strip()
            print(f"Processing feed: {feed_name}")
            
            # Get feed status
            status_font = station.find('font')
            feed_status = status_font and status_font.text.strip() == 'UP'
            
            # Find MP3 URL from .pls link
            mp3_url = None
            pls_link = station.find('a', href=lambda x: x and x.endswith('.pls'))
            if pls_link:
                mp3_url = f"{self.BASE_URL}{pls_link['href']}"
            
            # Parse frequencies from the frequency table
            frequencies = []
            if freq_table:
                rows = freq_table.find_all('tr')[1:]  # Skip header row
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 2:
                        facility = cols[0].text.strip()
                        freq = cols[1].text.strip()
                        # Clean up the frequency text
                        freq = freq.replace('*', '').replace('b', '').strip()
                        frequencies.append(Frequency(
                            facility=facility,
                            frequency=freq
                        ))
                        print(f"Found frequency: {facility} - {freq}")
            
            # Create channel if we have valid data
            if feed_name and (frequencies or mp3_url):
                channel = AudioChannel(
                    name=feed_name,
                    airport_icao=self.current_icao,
                    feed_status=feed_status,
                    frequencies=frequencies,
                    mp3_url=mp3_url
                )
                
                return channel
            else:
                print(f"Skipping channel {feed_name} - insufficient data")
                return None
            
        except Exception as e:
            print(f"Error parsing station: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _parse_airport_info(self, table) -> dict:
        """Parse detailed airport information from the main table."""
        info = {}
        try:
            text = table.get_text(separator=' ', strip=True)
            
            # Extract ICAO and IATA codes
            header_match = re.search(r"ICAO:\s*(\w+)\s*IATA:\s*(\w+)\s*Airport:\s*(.+?)(?=City:|$)", text)
            if header_match:
                info['icao'] = header_match.group(1).strip()
                info['iata'] = header_match.group(2).strip()
                info['name'] = header_match.group(3).strip()
            
            # Extract city and state/province
            location_match = re.search(r"City:\s*(.+?)\s*State/Province:\s*(.+?)\s*Country:", text)
            if location_match:
                info['city'] = location_match.group(1).strip()
                info['state_province'] = location_match.group(2).strip()
            
            # Extract country and continent
            region_match = re.search(r"Country:\s*(.+?)\s*Continent:\s*(.+?)\s*(?=METAR|$)", text)
            if region_match:
                info['country'] = region_match.group(1).strip()
                info['continent'] = region_match.group(2).strip()
            
            # Extract and clean METAR with a more lenient pattern
            metar_match = re.search(r"METAR Weather:\s*(.+?)(?=\$|Click|$)", text)
            if metar_match:
                metar = metar_match.group(1).strip()
                # Clean up the METAR text
                metar = re.sub(r'\s+Click.*$', '', metar)
                metar = metar.split(info['icao'])[1].strip()
                # Only set METAR if it's not empty after cleaning
                if metar and not metar.isspace():
                    info['metar'] = metar
            
            return info
        except Exception as e:
            print(f"Error parsing airport info: {e}")
            import traceback
            traceback.print_exc()
            return {}

    async def get_stream_url(self, channel_url: str) -> Optional[str]:
        """Get the actual stream URL from a channel page."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(channel_url)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'lxml')
                
                # Find the audio player source
                audio_src = soup.find('audio', {'id': 'audio'})
                if audio_src and 'src' in audio_src.attrs:
                    return audio_src['src']
                
                # Alternative: look for embedded player URL
                embed_url = soup.find('iframe', src=lambda x: x and 'player' in x)
                if embed_url:
                    return embed_url['src']
                
                return None
        except Exception as e:
            print(f"Error getting stream URL: {e}")
            return None 