import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // public routes
  const isPublicRoute = pathname === '/' || pathname === '/signin' || pathname === '/signup';

  // if authenticated and trying to access signin/signup, redirect to dashboard
  if (isAuthenticated && (pathname === '/signin' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // if not authenticated and trying to access protected routes, redirect to landing
  // if (!isAuthenticated && !isPublicRoute && !pathname.startsWith('/api')) {
  //   return NextResponse.redirect(new URL('/', req.url));
  // }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
