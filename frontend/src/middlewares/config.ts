export const routeConfigs = {
  admin: {
    excludedRoutes: ['/login'], // Routes that bypass admin middleware (user login page)
    protectedRoutes: ['/admin'], // All routes under `/admin` are protected
    tokenKey: 'adminToken', // Cookie key for admin token
    loginPath: '/login', // Redirect path when unauthorized (to user login)
    defaultPath: '/admin/dashboard' // Redirect path when already authenticated
  },
  user: {
    excludedRoutes: ['/login', '/forget-password', '/register', '/sign-up'], // Routes that bypass user middleware
    protectedRoutes: ['/user', '/account', '/checkout'], // All routes under `/user` are protected
    tokenKey: 'token', // Cookie key for user token
    loginPath: '/login', // Redirect path when unauthorized
    defaultPath: '/shop' // Redirect to Services (shop) when already authenticated
  },
  authRoutes: ['/login', '/register', '/sign-up']
}
