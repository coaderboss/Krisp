import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getToken } from 'next-auth/jwt';

// 1. Redis Connection Setup (Fail-safe initialization)
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

  // EXCEPTION: Always allow Next.js internal static files, APIs, and images to pass immediately.
  // This prevents the middleware from blocking background session updates.
  if (path.startsWith('/_next') || path.startsWith('/static') || path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
    return NextResponse.next();
  }

  // --- 1. BASIC BOT & SCRIPT PROTECTION ---
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent || userAgent.includes('curl') || userAgent.includes('PostmanRuntime')) {
    return new NextResponse(
      JSON.stringify({ error: "Access Denied: Malicious activity detected." }), 
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- 2. JWT EDGE DECODING (The Vercel HTTPS Cookie Fix) ---
  // Vercel par HTTPS hone ki wajah se cookie secure hoti hai (__Secure- prefix).
  // getToken ko explicitly batana padta hai ki secure cookie aur exact salt kya hai.
  const isProduction = process.env.NODE_ENV === "production";
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  // Primary Check (Auth.js v5 Format)
  let token = await getToken({
    req: request,
    secret: secret,
    secureCookie: isProduction,
    salt: isProduction ? "__Secure-authjs.session-token" : "authjs.session-token"
  });

  // Fallback Check (NextAuth v4 Format - Just in case Vercel Edge misinterprets versions)
  if (!token) {
    token = await getToken({
      req: request,
      secret: secret,
      secureCookie: isProduction,
      salt: isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token"
    });
  }
  
  const isAuthenticated = Boolean(token);
  const isProfileComplete = token?.isProfileComplete === true; 
  const role = token?.role as string | undefined;

  const isAuthApi = path.startsWith('/api/auth');
  const isOnboarding = path === '/onboarding';
  const isLoginPage = path === '/login' || path === '/admin/login' || path === '/executive/login';

  // --- 3. REDIRECT RULES LOGIC (Strict Sequence to Prevent Loops) ---

  // RULE A: If trying to access Onboarding Page
  if (isOnboarding) {
    if (!isAuthenticated) return NextResponse.redirect(new URL('/login', request.url)); // Must login first
    if (isProfileComplete) {
      // Already complete? Send them to their respective dashboard
      if (role === "CLUB_ADMIN") return NextResponse.redirect(new URL('/admin', request.url));
      if (role === "EXECUTIVE") return NextResponse.redirect(new URL('/executive/dashboard', request.url));
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Allow access to onboarding if auth is true but profile is incomplete
  }

  // RULE B: If trying to access Login Pages while already authenticated
  if (isLoginPage && isAuthenticated) {
    if (!isProfileComplete) return NextResponse.redirect(new URL('/onboarding', request.url)); // Force finish onboarding
    // Already complete? Send to dashboard
    if (role === "CLUB_ADMIN") return NextResponse.redirect(new URL('/admin', request.url));
    if (role === "EXECUTIVE") return NextResponse.redirect(new URL('/executive/dashboard', request.url));
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // RULE C: Mandatory Gatekeeper for logged-in users navigating elsewhere
  // If logged in, but profile is INCOMPLETE, block everything except onboarding & auth APIs
  if (isAuthenticated && !isProfileComplete && !isAuthApi && !isOnboarding && !isLoginPage) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  // --- 4. STRICT ROLE-BASED EDGE ROUTE GUARDS ---

  // A. Student Portal Protection (/dashboard)
  if (path.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // B. Supreme Admin Console Protection (/admin)
  if (path.startsWith('/admin') && !isLoginPage) {
    if (!isAuthenticated) return NextResponse.redirect(new URL('/admin/login', request.url));
    if (role !== 'CLUB_ADMIN') return NextResponse.redirect(new URL('/login', request.url)); // Kicks out non-admins
  }

  // C. Executive Portal Protection (/executive)
  if (path.startsWith('/executive') && !isLoginPage) {
    if (!isAuthenticated) return NextResponse.redirect(new URL('/executive/login', request.url));
    if (role !== 'EXECUTIVE' && role !== 'CLUB_ADMIN') return NextResponse.redirect(new URL('/login', request.url));
  }

  // --- 5. REDIS RATE LIMITING (Sensitive Routes Only) ---
  const isSensitiveRoute = isLoginPage || path.startsWith('/api/');

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

  // --- 6. ENTERPRISE SECURITY HEADERS ---
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