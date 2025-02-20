import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 从查询参数中获取音频流URL
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // 首先获取.pls文件内容
    const plsResponse = await fetch(url);
    const plsContent = await plsResponse.text();

    // 解析.pls文件获取实际的音频流URL
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

    // 获取音频流
    const audioResponse = await fetch(streamUrl);
    
    // 创建一个新的Response对象，保持原始响应的headers
    const response = new NextResponse(audioResponse.body, {
      status: audioResponse.status,
      statusText: audioResponse.statusText,
      headers: {
        'Content-Type': audioResponse.headers.get('Content-Type') || 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    });

    return response;

  } catch (error) {
    console.error('Error proxying audio stream:', error);
    return NextResponse.json(
      { error: 'Failed to proxy audio stream' },
      { status: 500 }
    );
  }
}