import { NextResponse } from 'next/server';
import type { Airport } from '@/types/airport';

const API_BASE_URL = process.env.NEXT_PUBLIC_LIVEATC_SERVICE_URL;

export async function GET(
  request: Request,
  { params }: { params: { icao: string } }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/airport/${params.icao}`, {
      method: 'GET',
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to acquire airport and audio channels from cached data' },
        { status: response.status }
      );
    }
    const data: Airport = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: `Failed to acquire airport and audio channels from cached data, ${error}` },
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