import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Redis Connection Setup (Fail-safe initialization)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit: Ratelimit | null = null;
if (redisUrl && redisToken) {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, '10 s'), // Campus NAT friendly (30 req / 10s)
    analytics: true,
  });
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- 1. BASIC BOT & SCRIPT PROTECTION ---
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent || userAgent.includes('curl') || userAgent.includes('PostmanRuntime')) {
    return new NextResponse(
      JSON.stringify({ error: "Access Denied: Malicious activity detected." }), 
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- 2. EDGE ROUTE GUARDS (Full-Proof URL Gatekeeper) ---
  // Comprehensive NextAuth v4 & v5 cookie detection (HTTP & HTTPS)
  const sessionToken = 
    request.cookies.get('authjs.session-token')?.value || 
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  const isAuthenticated = Boolean(sessionToken);

  // A. Student Portal Protection (/dashboard)
  if (path.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // B. Already Logged In Student Accessing /login
  if (path === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // C. Supreme Admin Console Protection (/admin)
  if (path.startsWith('/admin') && path !== '/admin/login') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // D. Executive Portal Protection (/executive)
  if (path.startsWith('/executive') && path !== '/executive/login') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/executive/login', request.url));
    }
  }

  // --- 3. REDIS RATE LIMITING (Sensitive Routes Only) ---
  const isSensitiveRoute = 
    path.startsWith('/admin/login') || 
    path.startsWith('/executive/login') || 
    path === '/login' ||
    path.startsWith('/api/');

  if (isSensitiveRoute && ratelimit) {
    const ip = request.headers.get("x-forwarded-for")?.split(',')[0].trim() || 
               request.headers.get("x-real-ip") || 
               "127.0.0.1";
    try {
      const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_${ip}`);
      if (!success) {
        console.warn(`[RATE LIMIT BLOCKED] IP: ${ip} | Path: ${path}`);
        return new NextResponse(
          JSON.stringify({ error: "Security Alert: Too many requests. Please try again later." }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          }
        );
      }
    } catch (error) {
      console.error("Redis Rate Limit Failed (Fail-Open active):", error);
    }
  }

  // --- 4. ENTERPRISE SECURITY HEADERS ---
  const response = NextResponse.next();
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

