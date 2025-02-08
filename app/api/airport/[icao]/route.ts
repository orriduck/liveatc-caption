import { NextResponse } from 'next/server';
import type { Airport } from '@/types/airport';

const API_BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api`
  : `http://${process.env.NEXT_PUBLIC_LOCAL_ENDPOINT_URL}/api`

export async function GET(
  request: Request,
  { params }: { params: { icao: string } }
) {
  try {
    const url = `${API_BASE_URL}/airport/${params.icao}`;
    console.log(`Attempting to fetch from: ${url}`);
    
    if (!API_BASE_URL) {
      console.error('API_BASE_URL is not defined');
      return NextResponse.json(
        { error: 'API_BASE_URL is not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(url, {
      method: 'GET',
      // Add headers if needed
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend responded with status ${response.status}: ${errorText}`);
      return NextResponse.json(
        { 
          error: 'Failed to acquire airport data',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data: Airport = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching airport data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to acquire airport data',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 

export async function POST(
  request: Request,
  { params }: { params: { icao: string } }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/airport/${params.icao}`, {
      method: 'POST',
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to acquire airport and audio channels from LiveATC' },
        { status: response.status }
      );
    }
    const data: Airport = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to acquire airport and audio channels from LiveATC' },
      { status: 500 }
    );
  }
} 