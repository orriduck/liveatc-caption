import { NextResponse } from 'next/server';

const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api`
: "http://127.0.0.1:8000/api";

export async function GET(request: Request, { params }: { params: { icao: string } }) {
  const { icao } = params;
  console.log(`Contacting base url ${baseUrl}`)
  try {
    const response = await fetch(`${baseUrl}/airport/${icao}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Airport ${icao} not found` },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch airport data: ${response.statusText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching airport:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { icao: string } }) {
  const { icao } = params;
  console.log(`Contacting base url ${baseUrl}`)
  try {
    const response = await fetch(`${baseUrl}/airport/${icao}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Airport ${icao} not found on LiveATC` },
          { status: 404 }
        );
      }
      throw new Error(`Failed to update airport data: ${response.statusText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating airport:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}