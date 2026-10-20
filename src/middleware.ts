import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Redis Connection Setup (Fail-safe mode)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit: Ratelimit | null = null;
if (redisUrl && redisToken) {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, '10 s'), // Max 5 requests per 10 seconds
    analytics: true,
  });
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Niche hum response object create kar rahe hain taaki usme headers inject kar sakein
  const response = NextResponse.next();

  // --- 1. ENTERPRISE SECURITY HEADERS (Anti-Hacking Shields) ---
  // Clickjacking, XSS attacks, aur MIME-sniffing ko edge par hi block karta hai
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // Sirf aapki site iframe me embed ho sakti hai
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // --- 2. BASIC BOT & SCRIPT PROTECTION ---
  // Agar request kisi automated script (jaise curl, Postman) ya bina User-Agent ke aati hai, block it.
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent || userAgent.includes('curl') || userAgent.includes('PostmanRuntime')) {
    return new NextResponse(
      JSON.stringify({ error: "Access Denied: Malicious activity detected." }), 
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const isSensitiveRoute = path.startsWith('/admin/login') || 
                           path.startsWith('/executive/login') || 
                           path.startsWith('/api/');

  if (isSensitiveRoute && ratelimit) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
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

  // --- 4. EDGE ROUTE GUARDS (Unauthorized Access Prevention) ---
  // NextAuth ka session token edge par hi check karna taaki bina login wale users server tak hit hi na karein
  const sessionToken = request.cookies.get('authjs.session-token')?.value || 
                       request.cookies.get('__Secure-authjs.session-token')?.value;

  // Agar user /admin ya /executive dashboard par jana chahta hai par token nahi hai, direct wapas bhejo
  if (path.startsWith('/admin') && path !== '/admin/login' && !sessionToken) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  
  if (path.startsWith('/executive') && path !== '/executive/login' && !sessionToken) {
    return NextResponse.redirect(new URL('/executive/login', request.url));
  }

  return response;
}

// Ye middleware sirf in paths par chalega (Images, CSS, aur static files par time waste nahi karega)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};