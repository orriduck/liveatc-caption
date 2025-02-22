import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const enforceUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    // Get audio stream URL from query parameters
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // First fetch the .pls file content
    const plsResponse = await fetch(url, {
      headers: {
        'User-Agent': enforceUserAgent,
      }
    });

    if (!plsResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PLS file: ${plsResponse.statusText}` },
        { status: plsResponse.status }
      );
    }

    const plsContent = await plsResponse.text();

    // Parse .pls file to get actual audio stream URL
    const streamUrl = plsContent
      .split('\n')
      .find(line => line.startsWith('File1='))
      ?.split('=')?.[1];

    if (!streamUrl) {
      return NextResponse.json(
        { error: 'Invalid PLS file format' },
        { status: 400 }
      );
    }

    // Get audio stream with retry logic
    let retryCount = 0;
    const maxRetries = 2;
    let lastError = null;

    while (retryCount <= maxRetries) {
      try {
        const audioResponse = await fetch(streamUrl, {
          headers: {
            'User-Agent': enforceUserAgent,
          }
        });

        if (!audioResponse.ok) {
          throw new Error(`HTTP error! status: ${audioResponse.status}`);
        }

        // Check if we got a valid audio stream
        const contentType = audioResponse.headers.get('Content-Type');
        if (!contentType?.includes('audio/') && !contentType?.includes('application/octet-stream')) {
          throw new Error('Invalid content type: ' + contentType);
        }

        // Create response with appropriate headers
        const response = new NextResponse(audioResponse.body, {
          status: 200,
          headers: {
            'Content-Type': contentType || 'audio/mpeg',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive',
          },
        });

        return response;
      } catch (error) {
        lastError = error;
        retryCount++;
        if (retryCount <= maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }

    console.error('Error proxying audio stream after retries:', lastError);
    return NextResponse.json(
      { error: 'Failed to proxy audio stream after retries' },
      { status: 503 }
    );

  } catch (error) {
    console.error('Error proxying audio stream:', error);
    return NextResponse.json(
      { error: 'Failed to proxy audio stream' },
      { status: 500 }
    );
  }
}