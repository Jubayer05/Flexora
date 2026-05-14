import type { Response } from 'express';
import { z } from 'zod';
import type { AdminAuthRequest } from '../middlewares/auth';
import { PermissionService } from '../services/permission.services';
import { RoleService, type CreateRoleData } from '../services/role.services';
import {
  handleControllerError,
  sendCreatedResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendUnauthorizedResponse,
} from '../utils/response-handler';

// Initialize service instances
const roleService = new RoleService();
const permissionService = new PermissionService();

// ================================
// VALIDATION SCHEMAS
// ================================

const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name is too long'),
  description: z.string().max(255, 'Description is too long').optional(),
  permissions: z.array(
    z.object({
      resource: z.string().min(1, 'Resource is required'),
      actions: z.array(z.string().min(1, 'Action cannot be empty')),
    })
  ),
});

const UpdateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name is too long').optional(),
  description: z.string().max(255, 'Description is too long').optional(),
  permissions: z
    .array(
      z.object({
        resource: z.string().min(1, 'Resource is required'),
        actions: z.array(z.string().min(1, 'Action cannot be empty')),
      })
    )
    .optional(),
});

const RoleIdSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      throw new Error('Invalid role ID');
    }
    return num;
  }),
});

const AssignRoleSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  roleId: z.number().int().positive('Role ID must be a positive integer'),
});

const RemoveRoleSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
});

// ================================
// ROLE MANAGEMENT CONTROLLERS
// ================================

/**
 * Get all active roles with permissions
 */
export const getAllRoles = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const roles = await roleService.getAllRoles();

    sendSuccessResponse(res, { roles }, 'Roles retrieved successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve roles');
  }
};

/**
 * Get role by ID with permissions
 */
export const getRoleById = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const { id } = RoleIdSchema.parse(req.params);

    const role = await roleService.getRoleById(id);

    if (!role) {
      sendNotFoundResponse(res, 'Role not found');
      return;
    }

    sendSuccessResponse(res, { role }, 'Role retrieved successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve role');
  }
};

/**
 * Create new role with permissions
 */
export const createRole = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const roleData = CreateRoleSchema.parse(req.body);

    const role = await roleService.createRole(roleData as CreateRoleData);

    sendCreatedResponse(res, { role }, 'Role created successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to create role');
  }
};

/**
 * Update role and permissions
 */
export const updateRole = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const { id } = RoleIdSchema.parse(req.params);
    const updateData = UpdateRoleSchema.parse(req.body);

    const role = await roleService.updateRole(id, updateData);

    sendSuccessResponse(res, { role }, 'Role updated successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to update role');
  }
};

/**
 * Delete role (soft delete)
 */
export const deleteRole = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const { id } = RoleIdSchema.parse(req.params);

    await roleService.deleteRole(id);

    sendSuccessResponse(res, null, 'Role deleted successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to delete role');
  }
};

// ================================
// ROLE ASSIGNMENT CONTROLLERS
// ================================

/**
 * Assign role to a moderator
 */
export const assignRoleToModerator = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const { userId, roleId } = AssignRoleSchema.parse(req.body);

    const user = await roleService.assignRoleToModerator(userId, roleId);

    sendSuccessResponse(res, { user }, 'Role assigned to moderator successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to assign role to moderator');
  }
};

/**
 * Remove role from moderator
 */
export const removeRoleFromModerator = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const { userId } = RemoveRoleSchema.parse(req.body);

    const user = await roleService.removeRoleFromModerator(userId);

    sendSuccessResponse(res, { user }, 'Role removed from moderator successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to remove role from moderator');
  }
};

/**
 * Get all moderators with their roles
 */
export const getModeratorsWithRoles = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const moderators = await roleService.getModeratorsWithRoles();

    sendSuccessResponse(res, { moderators }, 'Moderators with roles retrieved successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve moderators with roles');
  }
};

// ================================
// PERMISSION REFERENCE CONTROLLERS
// ================================

/**
 * Get all available resources
 */
export const getAllResources = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const resources = permissionService.getAllResources();

    sendSuccessResponse(res, { resources }, 'Resources retrieved successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve resources');
  }
};

/**
 * Get all available actions
 */
export const getAllActions = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      sendUnauthorizedResponse(res, 'Admin authentication required');
      return;
    }

    const actions = permissionService.getAllActions();

    sendSuccessResponse(res, { actions }, 'Actions retrieved successfully');
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve actions');
  }
};
