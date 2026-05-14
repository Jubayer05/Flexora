// Main permissions file - automatically exports client-side functions
// This is safe to import in both client and server components

// Re-export all client-safe functions
export {
  actionPermissions,
  canAccessRoute,
  canPerformAction,
  getClientPermissions,
  hasPermission,
  // routePermissions,
  type Permission
} from './permissions-client'
