import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow GET requests to /api/docker for EventSource
  if (request.method === 'GET' && request.nextUrl.pathname === '/api/docker') {
    return NextResponse.next();
  }

  // Check for API key in header for other API routes
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return new NextResponse(JSON.stringify({ message: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
