import { NextRequest, NextResponse } from 'next/server'
import { routeConfigs } from './config'
import { genericMiddleware } from './generic-middleware'

export async function handleMiddlewares(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl

  // Determine if the request is for an admin or user route
  if (pathname.startsWith('/admin')) {
    return genericMiddleware(request, response, routeConfigs.admin)
  }

  // Super Admin
  // if (pathname.startsWith('/super-admin')) {
  //   return genericMiddleware(request, response, routeConfigs.superAdmin)
  // }

  if (
    [...routeConfigs.user.protectedRoutes, ...routeConfigs.user.excludedRoutes].some((route) =>
      pathname.startsWith(route)
    )
  ) {
    return genericMiddleware(request, response, routeConfigs.user)
  }

  return NextResponse.next() // Default behavior for non-protected routes
}
