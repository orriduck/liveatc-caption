export interface Frequency {
  facility: string;
  frequency: string;
}

export interface AudioChannel {
  name: string;
  airport_icao: string;
  feed_status: boolean;
  frequencies: Frequency[];
  mp3_url?: string;
}

export interface Airport {
  icao: string;
  name: string;
  iata?: string;
  city?: string;
  state_province?: string;
  country?: string;
  continent?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  metar?: string;
  audio_channels: AudioChannel[];
}

export interface SearchResult {
  query: string;
  results: Airport[];
  total_count: number;
} 