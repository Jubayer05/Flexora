import type { NextFunction, Request, Response } from 'express';
import { EmailTemplateService } from '../services/emailTemplate.services';
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils';
import {
  createEmailTemplateSchema,
  emailTemplateParamsSchema,
  emailTemplateQuerySchema,
  updateEmailTemplateSchema,
} from '../validations';

// Initialize service
const emailTemplateService = new EmailTemplateService();

// ================================
// CRUD OPERATIONS
// ================================

export const createEmailTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = createEmailTemplateSchema.parse(req.body);
    const emailTemplate = await emailTemplateService.create(validatedData);

    return sendCreatedResponse(res, emailTemplate, 'Email template created successfully');
  } catch (error) {
    return next(error);
  }
};

export const getEmailTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = emailTemplateParamsSchema.parse(req.params);
    const emailTemplate = await emailTemplateService.findById(id);

    return sendSuccessResponse(res, emailTemplate, 'Email template retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getEmailTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = emailTemplateQuerySchema.parse(req.query);
    const result = await emailTemplateService.findMany(validatedQuery);

    return sendSuccessResponse(res, result, 'Email templates retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const updateEmailTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = emailTemplateParamsSchema.parse(req.params);
    const validatedData = updateEmailTemplateSchema.parse(req.body);

    const emailTemplate = await emailTemplateService.update(id, validatedData);

    return sendSuccessResponse(res, emailTemplate, 'Email template updated successfully');
  } catch (error) {
    return next(error);
  }
};

export const deleteEmailTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = emailTemplateParamsSchema.parse(req.params);
    const result = await emailTemplateService.delete(id);

    return sendSuccessResponse(res, result, 'Email template deleted successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// UTILITY ENDPOINTS
// ================================

export const getEmailTemplateTypes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const types = await emailTemplateService.getAllTypes();

    return sendSuccessResponse(res, types, 'Email template types retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getEmailTemplateByType = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { type } = req.params;

    if (!type) {
      throw new Error('Template type is required');
    }

    const emailTemplate = await emailTemplateService.findByType(type);

    if (!emailTemplate) {
      throw new Error('Email template not found');
    }

    return sendSuccessResponse(res, emailTemplate, 'Email template retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// PREVIEW & TEST ENDPOINTS
// ================================

export const previewEmailTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { type } = req.params;
    const { variables } = req.body; // Optional sample variables

    if (!type) {
      throw new Error('Template type is required');
    }

    const { emailTemplateRenderer } = await import('../services/email-template-renderer.service');
    const preview = await emailTemplateRenderer.previewEmail(type, variables);

    return sendSuccessResponse(res, preview, 'Email template preview generated successfully');
  } catch (error) {
    return next(error);
  }
};

export const testEmailTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { type, testEmail, variables } = req.body;

    if (!type || !testEmail) {
      throw new Error('Template type and test email are required');
    }

    const { emailTemplateRenderer } = await import('../services/email-template-renderer.service');
    const { sendEmail } = await import('../libs/email');

    // Render the email
    const rendered = await emailTemplateRenderer.renderEmail({
      type,
      variables: variables || {},
      fallbackSubject: `Test Email - ${type}`,
      fallbackBody: 'This is a test email.',
      fallbackHtml: '<p>This is a test email.</p>'
    });

    // Send test email
    await sendEmail(testEmail, rendered.text, rendered.subject, rendered.html);

    return sendSuccessResponse(res, { sent: true }, 'Test email sent successfully');
  } catch (error) {
    return next(error);
  }
};

export const getTemplateVariables = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { type } = req.params;

    if (!type) {
      throw new Error('Template type is required');
    }

    const { emailTemplateRenderer } = await import('../services/email-template-renderer.service');
    const variables = await emailTemplateRenderer.getTemplateVariables(type);

    return sendSuccessResponse(res, { variables }, 'Template variables retrieved successfully');
  } catch (error) {
    return next(error);
  }
};