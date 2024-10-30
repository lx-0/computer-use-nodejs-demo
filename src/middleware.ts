import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const isEventStream = request.headers.get('accept') === 'text/event-stream';
  const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('apiKey');

  // Check if this is an API route
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // For event streams, check apiKey from query params
    if (isEventStream) {
      if (!apiKey || apiKey !== process.env.API_KEY) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return NextResponse.next();
    }

    // For regular API requests, check x-api-key header
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return NextResponse.next();
}

// Fix: Matcher paths must start with '/'
export const config = {
  matcher: [
    '/api/:path*', // Match all API routes
    '/_next/static/:path*', // Match Next.js static files
    '/favicon.ico', // Match favicon
  ],
};
