import type { NextRequest, NextResponse } from 'next/server'
import { handleMiddlewares } from './middlewares'

export async function middleware(request: NextRequest, response: NextResponse) {
  return handleMiddlewares(request, response)
}

// Define matchers to restrict middleware application to specific routes
// Strictly ensure all protected routes are covered
export const config = {
  matcher: [
    '/admin/:path*', // All admin routes (protected)
    '/user/:path*', // All user routes (protected)
    '/account/:path*', // Account routes (protected)
    '/login', // User login (auth route)
    '/register', // User registration (auth route)
    '/sign-up', // User sign-up (auth route)
    '/forget-password' // User password recovery (auth route)
  ]
}