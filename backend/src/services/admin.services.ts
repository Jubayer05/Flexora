import type { LoginSession, User } from '@prisma/client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../configs/db';
import type { Pagination } from '../types/req-res';
import { UserService } from './user.services';

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface CreateAdminData {
  email: string;
  username?: string;
  password: string;
  firstName?: string;
  phone?: string;
  telegramUsername?: string;
  role?: 'ADMIN' | 'MODERATOR'; // Allow creating both ADMIN and MODERATOR
  roleId?: number; // Custom Role ID for MODERATOR - assigns permissions from roles table
}

export interface AdminJWTPayload {
  userId: number;
  email: string;
  role: string;
  sessionId: string;
  isAdmin: true;
}

export interface AdminAuthResult {
  admin: Partial<User>;
  token: string;
  refreshToken: string;
  session: Omit<LoginSession, 'meta'>;
}

export class AdminService {
  private userService: UserService;
  private readonly ADMIN_JWT_SECRET: string;
  private readonly ADMIN_JWT_REFRESH_SECRET: string;
  private readonly TOKEN_EXPIRY = '1d'; // Longer for admin sessions
  private readonly REFRESH_TOKEN_EXPIRY = '30d'; // Longer for admin
  private readonly SESSION_EXPIRY_DAYS = 30;
  private readonly SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@flexora.com';

  constructor() {
    this.userService = new UserService();

    // Use dedicated admin JWT secrets for enhanced security
    this.ADMIN_JWT_SECRET =
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'fallback-admin-jwt-secret';
    this.ADMIN_JWT_REFRESH_SECRET =
      process.env.ADMIN_JWT_REFRESH_SECRET ||
      process.env.JWT_REFRESH_SECRET ||
      'fallback-admin-refresh-secret';

    if (!process.env.ADMIN_JWT_SECRET || !process.env.ADMIN_JWT_REFRESH_SECRET) {
      console.warn(
        'Admin JWT secrets not properly configured. Using fallback values or regular JWT secrets.'
      );
      console.warn(
        'For better security, set ADMIN_JWT_SECRET and ADMIN_JWT_REFRESH_SECRET environment variables.'
      );
    }
  }

  // ================================
  // HELPER METHODS
  // ================================

  private isSuperAdmin(email: string): boolean {
    return email === this.SUPER_ADMIN_EMAIL;
  }

  private isAdmin(user: User): boolean {
    return user.role === 'ADMIN' || this.isSuperAdmin(user.email);
  }

  private isAdminOrModerator(user: Partial<User>): boolean {
    return user.role === 'ADMIN' || user.role === 'MODERATOR' || this.isSuperAdmin(user.email!);
  }

  private isTransientDatabaseError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();

    return (
      message.includes('getaddrinfo') ||
      message.includes('eservfail') ||
      message.includes('eai_again') ||
      message.includes('enotfound') ||
      message.includes("can't reach database server") ||
      message.includes('database connection failed') ||
      message.includes('database connection timeout') ||
      message.includes('connection refused') ||
      message.includes('connect timeout') ||
      message.includes('pool timeout')
    );
  }

  private async withTransientDatabaseRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    attempts = 2
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!this.isTransientDatabaseError(error) || attempt === attempts) {
          throw error;
        }

        console.warn(
          `[AdminService] Transient database error during ${operationName}. Retrying (${attempt}/${attempts})...`,
          error
        );

        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }

    throw lastError;
  }

  // ================================
  // ADMIN AUTHENTICATION
  // ================================

  async adminLogin(
    credentials: AdminLoginCredentials,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AdminAuthResult> {
    // Find admin by email (including super admin)
    const admin = await this.withTransientDatabaseRetry(
      () =>
        db.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            phone: true,
            role: true,
            passwordHash: true,
            isActive: true,
            isBanned: true,
            banReason: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            isVerified: true,
            customRole: {
              select: {
                name: true,
                description: true,
                permissions: {
                  select: {
                    actions: true,
                    resource: true,
                  },
                },
              },
            },
          },
        }),
      'admin lookup'
    );

    if (!admin) {
      throw new Error('Invalid admin credentials');
    }

    // Verify the user is an admin or moderator
    if (!this.isAdminOrModerator(admin)) {
      throw new Error('Access denied: Admin or Moderator privileges required');
    }

    // Check if admin is banned
    if (admin.isBanned) {
      throw new Error(`Admin account is banned: ${admin.banReason || 'No reason provided'}`);
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new Error('Admin account is deactivated');
    }

    // Verify password
    if (!admin.passwordHash) {
      throw new Error('Admin account does not have a password set');
    }

    const isPasswordValid = await this.userService.verifyPassword(
      credentials.password,
      admin.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid admin credentials');
    }

    // Create admin session
    const session = await this.withTransientDatabaseRetry(
      () => this.createAdminSession(admin.id, userAgent, ipAddress),
      'admin session creation'
    );
    const { token, refreshToken } = this.generateAdminTokens(admin, session.id);

    // Update last login
    await this.withTransientDatabaseRetry(
      () => this.userService.updateLastLogin(admin.id),
      'admin last-login update'
    );

    // Remove sensitive data
    const { passwordHash, ...adminWithoutPassword } = admin;

    return {
      admin: adminWithoutPassword,
      token,
      refreshToken,
      session,
    };
  }

  async adminLogout(sessionId: string): Promise<void> {
    await db.loginSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  async adminLogoutAll(adminId: number): Promise<void> {
    await db.loginSession.updateMany({
      where: {
        userId: adminId,
        meta: { path: ['adminSession'], equals: true },
      },
      data: { isActive: false },
    });
  }

  // ================================
  // ADMIN TOKEN MANAGEMENT
  // ================================

  generateAdminTokens(admin: Partial<User>, sessionId: string) {
    const payload: AdminJWTPayload = {
      userId: admin.id!,
      email: admin.email!,
      role: admin.role!,
      sessionId,
      isAdmin: true,
    };

    const token = jwt.sign(payload, this.ADMIN_JWT_SECRET, {
      expiresIn: this.TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(
      { userId: admin.id, sessionId, isAdmin: true },
      this.ADMIN_JWT_REFRESH_SECRET,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
      }
    );

    return { token, refreshToken };
  }
  async refreshAdminToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, this.ADMIN_JWT_REFRESH_SECRET) as {
        userId: number;
        sessionId: string;
        isAdmin: boolean;
      };

      if (!decoded.isAdmin) {
        throw new Error('Invalid admin refresh token');
      }

      // Check if session is still active
      const session = await db.loginSession.findUnique({
        where: { id: decoded.sessionId },
        include: { user: true },
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new Error('Invalid admin refresh token');
      }

      // Verify user is still an admin
      if (!this.isAdmin(session.user)) {
        throw new Error('Admin privileges revoked');
      }

      // Check if admin is still active and not banned
      if (session.user.isBanned || !session.user.isActive) {
        throw new Error('Admin account is no longer active');
      }

      // Generate new tokens
      const tokens = this.generateAdminTokens(session.user, session.id);

      // Update session expiry
      await db.loginSession.update({
        where: { id: session.id },
        data: {
          expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      return tokens;
    } catch (error) {
      throw new Error('Invalid admin refresh token');
    }
  }

  async verifyAdminToken(token: string): Promise<AdminJWTPayload & { user: User }> {
    try {
      const decoded = jwt.verify(token, this.ADMIN_JWT_SECRET) as AdminJWTPayload;

      if (!decoded.isAdmin) {
        throw new Error('Invalid admin token');
      }

      // Check if session is still active
      const session = await db.loginSession.findUnique({
        where: { id: decoded.sessionId },
        include: { user: true },
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new Error('Admin session expired');
      }

      // Verify user is still an admin
      if (!this.isAdminOrModerator(session.user)) {
        throw new Error('Admin privileges revoked');
      }

      // Check if admin is still active and not banned
      if (session.user.isBanned || !session.user.isActive) {
        throw new Error('Admin account is no longer active');
      }

      return {
        ...decoded,
        user: session.user,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid admin token');
      }
      throw error;
    }
  }

  // ================================
  // ADMIN SESSION MANAGEMENT
  // ================================

  async createAdminSession(
    adminId: number,
    userAgent?: string,
    ipAddress?: string
  ): Promise<Omit<LoginSession, 'meta'>> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    return await db.loginSession.create({
      data: {
        userId: adminId,
        token,
        userAgent,
        ipAddress,
        expiresAt,
        meta: {
          adminSession: true,
          sessionType: 'admin',
        },
      },
      omit: {
        meta: true,
      },
    });
  }

  async getActiveAdminSessions(adminId: number): Promise<LoginSession[]> {
    return await db.loginSession.findMany({
      where: {
        userId: adminId,
        isActive: true,
        expiresAt: { gt: new Date() },
        meta: { path: ['adminSession'], equals: true },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeAdminSession(sessionId: string, adminId: number): Promise<void> {
    await db.loginSession.updateMany({
      where: {
        id: sessionId,
        userId: adminId,
        meta: { path: ['adminSession'], equals: true },
      },
      data: { isActive: false },
    });
  }

  async revokeAllOtherAdminSessions(adminId: number, currentSessionId: string): Promise<void> {
    await db.loginSession.updateMany({
      where: {
        userId: adminId,
        id: { not: currentSessionId },
        meta: { path: ['adminSession'], equals: true },
      },
      data: { isActive: false },
    });
  }

  // ================================
  // ADMIN MANAGEMENT
  // ================================

  /**
   * Create a new admin or moderator user
   */
  async createAdmin(data: CreateAdminData, createdBy: number): Promise<User> {
    const { password, ...rest } = data;
    // Check if creator is an admin or moderator with sufficient privileges
    const creator = await db.user.findUnique({ where: { id: createdBy } });
    if (!creator || !this.isAdmin(creator)) {
      throw new Error('Only admins can create admin/moderator accounts');
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    if (data.username) {
      const existingUsername = await db.user.findUnique({ where: { username: data.username } });
      if (existingUsername) {
        throw new Error('Username is already taken');
      }
    }

    // Prevent creating super admin
    if (this.isSuperAdmin(data.email)) {
      throw new Error('Cannot create super admin account');
    }

    // Create admin/moderator user
    const passwordHash = await this.userService.hashPassword(password);
    const userRole = data.role || 'MODERATOR'; // Default to MODERATOR if not specified

    const admin = await db.user.create({
      data: {
        ...rest,
        passwordHash,
        role: userRole,
        roleId: userRole === 'MODERATOR' && data.roleId ? data.roleId : undefined,
        isVerified: true,
        isActive: true,
        emailVerifiedAt: new Date(),
        meta: {
          createdBy: createdBy,
          createdAt: new Date().toISOString(),
          adminCreated: true,
          assignedRole: userRole,
        },
      },
    });

    // Remove sensitive data
    const { passwordHash: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword as User;
  }

  async getAdminList(requestingAdminId: number): Promise<User[]> {
    // Verify requesting user is an admin
    const requestingAdmin = await db.user.findUnique({ where: { id: requestingAdminId } });
    if (!requestingAdmin || !this.isAdmin(requestingAdmin)) {
      throw new Error('Only admins can view admin list');
    }

    // Get all admins and moderators except super admin
    const admins = await db.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MODERATOR'] },
        email: { not: this.SUPER_ADMIN_EMAIL },
      },
      include: {
        customRole: {
          include: { permissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return admins as User[];
  }

  async findAdminById(adminId: number): Promise<User | null> {
    const admin = await db.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['ADMIN', 'MODERATOR'] },
        AND: [{ email: { not: this.SUPER_ADMIN_EMAIL } }],
      },
      include: {
        customRole: {
          include: { permissions: true },
        },
      },
    });

    return admin as User | null;
  }

  async findAdminByIdForAuth(adminId: number): Promise<User | null> {
    const admin = await db.user.findFirst({
      where: {
        id: adminId,
        OR: [{ role: 'ADMIN' }, { role: 'MODERATOR' }, { email: this.SUPER_ADMIN_EMAIL }]
      },
      include: {
        customRole: {
          include: { permissions: true }
        }
      }
    })

    return admin as User | null
  }

  /**
   * Get permissions for the given admin in frontend format.
   * Super admin (by email) and any user with role ADMIN -> { __superAdmin: true }; MODERATOR -> { resource: [actions], ... }
   * Uses findUnique by id so super admin is not excluded (findAdminById excludes super admin email).
   */
  async getAdminPermissions(adminId: number): Promise<Record<string, string[] | boolean>> {
    const admin = await db.user.findUnique({
      where: { id: adminId },
      include: {
        customRole: {
          include: { permissions: true }
        }
      }
    });
    if (!admin) return {};

    // Super admin or any ADMIN role sees all menus
    if (this.isSuperAdmin(admin.email ?? '') || admin.role === 'ADMIN') {
      return { __superAdmin: true };
    }

    if (admin.role === 'MODERATOR' && admin.customRole?.permissions) {
      const perms: Record<string, string[]> = {};
      admin.customRole.permissions.forEach((p) => {
        perms[p.resource] = p.actions;
      });
      return perms;
    }

    return {};
  }

  async updateAdminById(
    adminId: number,
    updateData: {
      firstName?: string;
      phone?: string;
      isActive?: boolean;
      isVerified?: boolean;
      role?: 'ADMIN' | 'MODERATOR';
      roleId?: number | null;
    },
    updatingAdminId: number
  ): Promise<User> {
    // Verify updating user is an admin
    const updatingAdmin = await db.user.findUnique({ where: { id: updatingAdminId } });
    if (!updatingAdmin || !this.isAdmin(updatingAdmin)) {
      throw new Error('Only admins can update admin details');
    }

    // Prevent updating super admin
    const targetAdmin = await db.user.findUnique({ where: { id: adminId } });
    if (!targetAdmin) {
      throw new Error('Admin not found');
    }

    if (this.isSuperAdmin(targetAdmin.email) && targetAdmin.id !== updatingAdmin.id) {
      throw new Error('Cannot update super admin account');
    }

    if (targetAdmin.role !== 'ADMIN' && targetAdmin.role !== 'MODERATOR') {
      throw new Error('Target user is not an admin or moderator');
    }

    const data: Record<string, unknown> = {
      firstName: updateData.firstName,
      phone: updateData.phone,
      updatedAt: new Date(),
    };

    const isSelfSuperAdminProfileUpdate =
      this.isSuperAdmin(targetAdmin.email) && targetAdmin.id === updatingAdmin.id;

    if (!isSelfSuperAdminProfileUpdate) {
      data.isActive = updateData.isActive;
      data.isVerified = updateData.isVerified;
    }

    if (!isSelfSuperAdminProfileUpdate && updateData.role !== undefined) {
      data.role = updateData.role;
      data.roleId = updateData.role === 'ADMIN' ? null : updateData.roleId ?? targetAdmin.roleId;
    } else if (!isSelfSuperAdminProfileUpdate && updateData.roleId !== undefined) {
      data.roleId = updateData.roleId;
    }

    const updatedAdmin = await db.user.update({
      where: { id: adminId },
      data,
      include: {
        customRole: {
          include: { permissions: true },
        },
      },
    });

    return updatedAdmin as User;
  }

  async changeAdminPassword(
    adminId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const admin = await db.user.findUnique({ where: { id: adminId } });

    if (!admin || !this.isAdminOrModerator(admin)) {
      throw new Error('Admin or moderator not found');
    }

    if (!admin.passwordHash) {
      throw new Error('Admin account does not have a password set');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.userService.verifyPassword(
      currentPassword,
      admin.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.userService.hashPassword(newPassword);

    await db.$transaction([
      db.user.update({
        where: { id: adminId },
        data: { passwordHash: newPasswordHash },
      }),
      db.loginSession.updateMany({
        where: {
          userId: adminId,
          meta: { path: ['adminSession'], equals: true },
        },
        data: { isActive: false },
      }),
    ]);
  }

  // ================================
  // ADMIN STATISTICS
  // ================================

  async getAdminStats(requestingAdminId: number) {
    // Verify requesting user is an admin
    const requestingAdmin = await db.user.findUnique({ where: { id: requestingAdminId } });
    if (!requestingAdmin || !this.isAdmin(requestingAdmin)) {
      throw new Error('Only admins can view admin statistics');
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalAdmins, activeAdmins, adminLoginsLast24h, adminLoginsLast7d, activeAdminSessions] =
      await Promise.all([
        db.user.count({
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            email: { not: this.SUPER_ADMIN_EMAIL },
          },
        }),
        db.user.count({
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            isActive: true,
            email: { not: this.SUPER_ADMIN_EMAIL },
          },
        }),
        db.user.count({
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            lastLoginAt: { gte: last24Hours },
            email: { not: this.SUPER_ADMIN_EMAIL },
          },
        }),
        db.user.count({
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            lastLoginAt: { gte: last7Days },
            email: { not: this.SUPER_ADMIN_EMAIL },
          },
        }),
        db.loginSession.count({
          where: {
            isActive: true,
            expiresAt: { gt: now },
            meta: { path: ['adminSession'], equals: true },
          },
        }),
      ]);

    return {
      totalAdmins,
      activeAdmins,
      adminLoginsLast24h,
      adminLoginsLast7d,
      activeAdminSessions,
    };
  }

  async getAdminListWithQuery(queryParams: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    isVerified?: boolean;
    isBanned?: boolean;
    sortBy?: 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'email';
    sortOrder?: 'asc' | 'desc';
    role?: 'ADMIN' | 'MODERATOR';
  }): Promise<{
    admins: User[];
    pagination: Pagination;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      isVerified,
      isBanned,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
    } = queryParams;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      role: role ? role : { in: ['ADMIN', 'MODERATOR'] },
      email: { not: this.SUPER_ADMIN_EMAIL },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    if (isBanned !== undefined) {
      where.isBanned = isBanned;
    }

    // Get admins and count
    const [admins, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          customRole: {
            include: { permissions: true },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      db.user.count({ where }),
    ]);

    return {
      admins: admins as User[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getAdminDashboardStats(): Promise<{
    totalAdmins: number;
    activeAdmins: number;
    adminLoginsLast24h: number;
    adminLoginsLast7d: number;
    activeAdminSessions: number;
  }> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalAdmins, activeAdmins, adminLoginsLast24h, adminLoginsLast7d, activeAdminSessions] =
      await Promise.all([
        db.user.count({
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            email: { not: this.SUPER_ADMIN_EMAIL },
          },
        }),
        db.user.count({
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            isActive: true,
            email: { not: this.SUPER_ADMIN_EMAIL },
          },
        }),
        db.user.count({
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            lastLoginAt: { gte: last24Hours },
            email: { not: this.SUPER_ADMIN_EMAIL },
          },
        }),
        db.user.count({
          where: {
            role: { in: ['ADMIN', 'MODERATOR'] },
            lastLoginAt: { gte: last7Days },
            email: { not: this.SUPER_ADMIN_EMAIL },
          },
        }),
        db.loginSession.count({
          where: {
            isActive: true,
            expiresAt: { gt: now },
            meta: { path: ['adminSession'], equals: true },
          },
        }),
      ]);

    return {
      totalAdmins,
      activeAdmins,
      adminLoginsLast24h,
      adminLoginsLast7d,
      activeAdminSessions,
    };
  }
}
