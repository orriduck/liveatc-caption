import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const enforceUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const TIMEOUT = 10000; // 10 second timeout

  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Fetch with timeout
    const fetchWithTimeout = async (url: string, options: RequestInit) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), TIMEOUT);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    // First fetch the .pls file content with timeout
    const plsResponse = await fetchWithTimeout(url, {
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
      ?.split('=')?.[1]?.trim();

    if (!streamUrl) {
      return NextResponse.json(
        { error: 'Invalid PLS file format' },
        { status: 400 }
      );
    }

    // Get audio stream with improved retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let lastError = null;

    while (retryCount <= maxRetries) {
      try {
        const audioResponse = await fetchWithTimeout(streamUrl, {
          headers: {
            'User-Agent': enforceUserAgent,
            'Connection': 'keep-alive',
            'Accept': '*/*',
          }
        });

        if (!audioResponse.ok) {
          throw new Error(`HTTP error! status: ${audioResponse.status}`);
        }

        // Validate content type
        const contentType = audioResponse.headers.get('Content-Type');
        if (!contentType?.includes('audio/') && 
            !contentType?.includes('application/octet-stream') &&
            !contentType?.includes('video/')) { // Some streams use video/ MIME type
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
            'Keep-Alive': 'timeout=60',
            'X-Accel-Buffering': 'no', // Disable proxy buffering
          },
        });

        return response;
      } catch (error) {
        lastError = error;
        retryCount++;
        
        // Check if we should retry
        const shouldRetry = error instanceof Error && 
          (error.name === 'AbortError' || // Timeout
           error.message.includes('network') || // Network error
           error.message.includes('failed') || // Generic failure
           error.message.includes('content type')); // Invalid content type

        if (retryCount <= maxRetries && shouldRetry) {
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }

    console.error('Error proxying audio stream after retries:', lastError);
    return NextResponse.json(
      { 
        error: 'Failed to proxy audio stream after retries',
        details: lastError instanceof Error ? lastError.message : 'Unknown error'
      },
      { status: 503 }
    );

  } catch (error) {
    console.error('Error proxying audio stream:', error);
    return NextResponse.json(
      { 
        error: 'Failed to proxy audio stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}