import type { Role, RolePermission, User } from '@prisma/client';
import prisma from '../configs/db';

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: {
    resource: string;
    actions: string[];
  }[];
}

export interface RoleWithPermissions extends Role {
  permissions: RolePermission[];
}

export class RoleService {
  /**
   * Create a new role with permissions
   */
  async createRole(data: CreateRoleData): Promise<RoleWithPermissions> {
    return await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: {
          create: data.permissions.map((p) => ({
            resource: p.resource,
            actions: p.actions,
          })),
        },
      },
      include: { permissions: true },
    });
  }

  /**
   * Get all active roles with their permissions
   */
  async getAllRoles(): Promise<RoleWithPermissions[]> {
    return await prisma.role.findMany({
      where: { isActive: true },
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleById(id: number): Promise<RoleWithPermissions | null> {
    return await prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
  }

  /**
   * Update role and permissions
   */
  async updateRole(id: number, data: Partial<CreateRoleData>): Promise<RoleWithPermissions> {
    // If permissions are being updated, replace all permissions
    if (data.permissions) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });
    }

    return await prisma.role.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.permissions && {
          permissions: {
            create: data.permissions.map((p) => ({
              resource: p.resource,
              actions: p.actions,
            })),
          },
        }),
      },
      include: { permissions: true },
    });
  }

  /**
   * Delete role (soft delete by setting isActive = false)
   */
  async deleteRole(id: number): Promise<void> {
    await prisma.role.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Assign role to a moderator
   */
  async assignRoleToModerator(userId: number, roleId: number): Promise<User> {
    // Verify user is MODERATOR
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'MODERATOR') {
      throw new Error('Only MODERATOR users can be assigned roles');
    }

    return await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { customRole: { include: { permissions: true } } },
    });
  }

  /**
   * Remove role from moderator
   */
  async removeRoleFromModerator(userId: number): Promise<User> {
    return await prisma.user.update({
      where: { id: userId },
      data: { roleId: null },
    });
  }

  /**
   * Get all moderators with their roles
   */
  async getModeratorsWithRoles(): Promise<User[]> {
    return await prisma.user.findMany({
      where: { role: 'MODERATOR' },
      include: { customRole: { include: { permissions: true } } },
      orderBy: { email: 'asc' },
    });
  }
}
