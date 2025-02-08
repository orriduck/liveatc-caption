-- Initial database schema
BEGIN;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS audio_channels;
DROP TABLE IF EXISTS airports;

-- Create airports table
CREATE TABLE airports (
    icao varchar(4) primary key,
    iata varchar(3),
    name text not null,
    city text,
    state_province text,
    country text,
    continent text,
    metar text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create audio_channels table
CREATE TABLE audio_channels (
    id serial primary key,
    name text not null,                    -- e.g., "KBOS App (Final Vector)"
    airport_icao varchar(4) references airports(icao),
    feed_status boolean default true,      -- UP/DOWN status
    frequencies jsonb,                     -- Array of {facility, frequency} objects
    mp3_url text,                         -- MP3 stream URL
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    CONSTRAINT audio_channels_unique UNIQUE (airport_icao, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata);
CREATE INDEX IF NOT EXISTS idx_audio_channels_airport_icao ON audio_channels(airport_icao);
CREATE INDEX IF NOT EXISTS idx_audio_channels_feed_status ON audio_channels(feed_status);

COMMIT; 