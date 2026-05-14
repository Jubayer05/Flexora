import prisma from '../configs/db';

// Available actions for each resource
export const ACTIONS = {
  INDEX: 'index',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  DOWNLOAD: 'download',
  BULK_UPDATE: 'bulk_update',
  BULK_DELETE: 'bulk_delete',
  BULK_CREATE: 'bulk_create',
  ANALYTICS: 'analytics',
  REPORTS: 'reports',
  PUBLISH: 'publish',
  ARCHIVE: 'archive',
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// Available resources
export const RESOURCES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  USERS: 'users',
  TICKETS: 'tickets',
  ACCOUNTS: 'accounts',
  PAYMENTS: 'payments',
  DELIVERIES: 'deliveries',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  BLOGS: 'blogs',
  TELEGRAM: 'telegram'
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

export class PermissionService {
  /**
   * Check if a moderator has specific permission
   */
  async checkModeratorPermission(
    userId: number,
    resource: string,
    action: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customRole: {
          include: { permissions: true },
        },
      },
    });

    // User must be MODERATOR
    if (user?.role !== 'MODERATOR') return false;

    // Must have assigned role
    if (!user.customRole || !user.customRole.isActive) return false;

    // Check specific permission
    const permission = user.customRole.permissions.find(
      (p) => p.resource.toLowerCase() === resource.toLowerCase()
    );
    if (!permission) return false;

    // Check if action is allowed in the string array
    return permission.actions.map((i) => i.toLowerCase()).includes(action.toLowerCase());
  }

  /**
   * Get all permissions for a moderator
   */
  async getModeratorPermissions(userId: number): Promise<Record<string, string[]> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customRole: {
          include: { permissions: true },
        },
      },
    });

    if (user?.role !== 'MODERATOR' || !user.customRole) return null;

    const permissions: Record<string, string[]> = {};
    user.customRole.permissions.forEach((p) => {
      permissions[p.resource] = p.actions;
    });

    return permissions;
  }

  /**
   * Check if user has permission (handles all user types)
   */
  async hasPermission(userId: number, resource: string, action: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    // ADMIN bypasses all permission checks
    if (user.role === 'ADMIN') return true;

    // Only MODERATORS can have admin permissions
    if (user.role === 'MODERATOR') {
      return await this.checkModeratorPermission(userId, resource, action);
    }

    // CUSTOMER/GUEST have no admin permissions
    return false;
  }

  /**
   * Get all available resources
   */
  getAllResources(): Resource[] {
    return Object.values(RESOURCES);
  }

  /**
   * Get all available actions
   */
  getAllActions(): Action[] {
    return Object.values(ACTIONS);
  }
}
