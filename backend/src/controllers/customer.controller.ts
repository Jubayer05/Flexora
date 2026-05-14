import type { NextFunction, Request, Response } from 'express';
import { UserService } from '../services/user.services';
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils';
import {
  BulkUserDeleteSchema,
  BulkUserUpdateSchema,
  CreateUserSchema,
  SetPasswordSchema,
  UpdateUserSchema,
  UserIdSchema,
  UserQuerySchema,
} from '../validations/zod/user.schema';

const userService = new UserService();

// ================================
// UTILITY FUNCTIONS
// ================================

const validateCustomer = async (id: number) => {
  const customer = await userService.findById(id);

  if (!customer) {
    return { customer: null, error: 'Customer not found', status: 404 };
  }

  if (customer.role !== 'CUSTOMER' && customer.role !== 'GUEST') {
    return { customer: null, error: 'User is not a customer account', status: 403 };
  }

  return { customer };
};

// ================================
// CUSTOMER CRUD OPERATIONS
// ================================

/**
 * Get all customers with filtering and pagination
 */
export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const guestTypeValue = req.query.guestType
    const isGuestValue = req.query.isGuest
    const guestOnly =
      guestTypeValue === 'true' ||
      isGuestValue === 'true'
    const registeredOnly =
      guestTypeValue === 'false' ||
      isGuestValue === 'false'
    const resolvedIsGuest =
      guestOnly ? 'true' : registeredOnly ? 'false' : req.query.isGuest

    const queryParams = UserQuerySchema.parse({
      ...req.query,
      isGuest: resolvedIsGuest
    });

    const result = await userService.findManyCustomerList(queryParams);

    return sendSuccessResponse(
      res,
      {
        customers: result.users,
        pagination: result.pagination,
      },
      'Customers retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params);

    const { customer, error, status } = await validateCustomer(id);
    if (error) {
      return res.status(status!).json({
        success: false,
        message: error,
      });
    }

    return sendSuccessResponse(res, { customer }, 'Customer retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new customer
 */
export const createCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = CreateUserSchema.parse({
      ...req.body,
      role: 'CUSTOMER', // Force role to CUSTOMER
      isGuest: false,
    });

    const customer = await userService.create(validatedData);

    return sendCreatedResponse(res, customer, 'Customer created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update customer by ID
 */
export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params);

    const { error, status } = await validateCustomer(id);
    if (error) {
      return res.status(status!).json({
        success: false,
        message: error,
      });
    }

    const validatedData = UpdateUserSchema.parse({
      ...req.body,
      role: 'CUSTOMER', // Ensure role remains CUSTOMER
    });

    const customer = await userService.update(id, validatedData);

    return sendSuccessResponse(res, { customer }, 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete customer by ID
 */
export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params);

    const { error, status } = await validateCustomer(id);
    if (error) {
      return res.status(status!).json({
        success: false,
        message: error,
      });
    }

    await userService.delete(id);

    return sendSuccessResponse(res, null, 'Customer deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ================================
// CUSTOMER MANAGEMENT OPERATIONS
// ================================

/**
 * Ban customer (by ID, email, or IP)
 */
export const banCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { reason, email, ipAddress } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Ban reason is required',
      });
    }

    // Ban by email
    if (email) {
      const customer = await userService.findByEmail(email);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found with this email',
        });
      }

      if (customer.role !== 'CUSTOMER') {
        return res.status(403).json({
          success: false,
          message: 'User is not a customer',
        });
      }

      if (customer.isBanned) {
        return res.status(400).json({
          success: false,
          message: 'Customer is already banned',
        });
      }

      const banned = await userService.banUser(customer.id, reason);
      return sendSuccessResponse(
        res,
        { customer: banned },
        'Customer banned successfully by email'
      );
    }

    // Ban by IP address
    if (ipAddress) {
      const result = await userService.banByIp(ipAddress, reason);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // Ban by ID (original behavior)
    const { id } = UserIdSchema.parse(req.params);
    const { error, status } = await validateCustomer(id);
    if (error) {
      return res.status(status!).json({
        success: false,
        message: error,
      });
    }

    const customer = await userService.banUser(id, reason);
    return sendSuccessResponse(res, { customer }, 'Customer banned successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Unban customer
 */
export const unbanCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params);

    const { error, status } = await validateCustomer(id);
    if (error) {
      return res.status(status!).json({
        success: false,
        message: error,
      });
    }

    const customer = await userService.unbanUser(id);

    return sendSuccessResponse(res, { customer }, 'Customer unbanned successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Verify customer email
 */
export const verifyCustomerEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params);

    const { error, status } = await validateCustomer(id);
    if (error) {
      return res.status(status!).json({
        success: false,
        message: error,
      });
    }

    const customer = await userService.verifyEmail(id);

    return sendSuccessResponse(res, { customer }, 'Customer email verified successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Set customer password
 */
export const setCustomerPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params);
    const { password } = SetPasswordSchema.parse(req.body);

    const { error, status } = await validateCustomer(id);
    if (error) {
      return res.status(status!).json({
        success: false,
        message: error,
      });
    }

    await userService.setPassword(id, password);

    return sendSuccessResponse(res, null, 'Customer password set successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update customer rank
 */
export const updateCustomerRank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params);

    const { error, status } = await validateCustomer(id);
    if (error) {
      return res.status(status!).json({
        success: false,
        message: error,
      });
    }

    const customer = await userService.updateUserRank(id);

    return sendSuccessResponse(res, { customer }, 'Customer rank updated successfully');
  } catch (error) {
    next(error);
  }
};

// ================================
// BULK OPERATIONS
// ================================

/**
 * Bulk update customers
 */
export const bulkUpdateCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkUserUpdateSchema.parse(req.body);

    // Verify all users are customers
    const users = await Promise.all(
      validatedData.userIds.map((id: number) => userService.findById(id))
    );

    const nonCustomers = users.filter((user) => user && user.role !== 'CUSTOMER' && user.role !== 'GUEST');
    if (nonCustomers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Some users are not customers: ${nonCustomers.map((u) => u?.id).join(', ')}`,
      });
    }

    const result = await userService.bulkUpdate({
      userIds: validatedData.userIds,
      data: {
        ...validatedData.data,
        role: 'CUSTOMER', // Ensure role remains CUSTOMER
      },
    });

    return sendSuccessResponse(
      res,
      { updatedCount: result.count },
      `${result.count} customers updated successfully`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete customers
 */
export const bulkDeleteCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkUserDeleteSchema.parse(req.body);

    // Verify all users are customers
    const users = await Promise.all(
      validatedData.userIds.map((id: number) => userService.findById(id))
    );

    const nonCustomers = users.filter((user) => user && user.role !== 'CUSTOMER' && user.role !== 'GUEST');
    if (nonCustomers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Some users are not customers: ${nonCustomers.map((u) => u?.id).join(', ')}`,
      });
    }

    const result = await userService.bulkDelete(validatedData);

    return sendSuccessResponse(
      res,
      { deletedCount: result.count },
      `${result.count} customers deleted successfully`
    );
  } catch (error) {
    next(error);
  }
};

// ================================
// CUSTOMER STATISTICS
// ================================

/**
 * Get customer statistics
 */
export const getCustomerStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const stats = await userService.getUserStats();

    // Filter stats to only show customer-relevant data
    const customerStats = {
      totalCustomers: stats.totalUsers, // Since we filter by role in the service
      activeCustomers: stats.activeUsers,
      verifiedCustomers: stats.verifiedUsers,
      guestCustomers: stats.guestUsers,
      bannedCustomers: stats.bannedUsers,
      rankDistribution: stats.rankDistribution,
      recentRegistrations: stats.recentRegistrations,
    };

    return sendSuccessResponse(res, customerStats, 'Customer statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};
