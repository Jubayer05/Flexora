import type { Response } from 'express'
import { ZodError } from 'zod'
import type { ApiResponse } from '../types/req-res'

// ================================
// SUCCESS RESPONSE HANDLERS
// ================================

export const sendSuccessResponse = <T>(
  res: Response,
  data: T,
  message: string,
  statusCode: number = 200
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  } as ApiResponse<T>)
}

export const sendCreatedResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response<ApiResponse<T>> => {
  return sendSuccessResponse(res, data, message, 201)
}

export const sendNoContentResponse = (
  res: Response,
  message: string = 'Operation completed successfully'
): Response<ApiResponse<null>> => {
  return res.status(204).json({
    success: true,
    message
  } as ApiResponse<null>)
}

// ================================
// ERROR RESPONSE HANDLERS
// ================================

export const sendErrorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: any[]
): Response<ApiResponse<null>> => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  } as ApiResponse<null>)
}

export const sendValidationErrorResponse = (
  res: Response,
  errors: any[],
  message: string = 'Validation error'
): Response<ApiResponse<null>> => {
  return sendErrorResponse(res, message, 400, errors)
}

export const sendNotFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response<ApiResponse<null>> => {
  return sendErrorResponse(res, message, 404)
}

export const sendConflictResponse = (
  res: Response,
  message: string = 'Resource already exists'
): Response<ApiResponse<null>> => {
  return sendErrorResponse(res, message, 409)
}

export const sendForbiddenResponse = (
  res: Response,
  message: string = 'Access forbidden'
): Response<ApiResponse<null>> => {
  return sendErrorResponse(res, message, 403)
}

export const sendUnauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized access'
): Response<ApiResponse<null>> => {
  return sendErrorResponse(res, message, 401)
}

export const sendBadRequestResponse = (
  res: Response,
  message: string = 'Bad request'
): Response<ApiResponse<null>> => {
  return sendErrorResponse(res, message, 400)
}

export const sendInternalServerErrorResponse = (
  res: Response,
  message: string = 'Internal server error'
): Response<ApiResponse<null>> => {
  return sendErrorResponse(res, message, 500)
}

export const sendServiceUnavailableResponse = (
  res: Response,
  message: string = 'Service temporarily unavailable'
): Response<ApiResponse<null>> => {
  return sendErrorResponse(res, message, 503)
}

const isInfrastructureErrorMessage = (message: string): boolean => {
  const msg = message.toLowerCase()

  return (
    msg.includes('getaddrinfo') ||
    msg.includes('eservfail') ||
    msg.includes('eai_again') ||
    msg.includes('enotfound') ||
    msg.includes('prismaclientinitializationerror') ||
    msg.includes("can't reach database server") ||
    msg.includes('database connection failed') ||
    msg.includes('database connection timeout') ||
    msg.includes('connection refused') ||
    msg.includes('connect timeout') ||
    msg.includes('pool timeout')
  )
}

// ================================
// GENERIC ERROR HANDLER
// ================================

export const handleControllerError = (
  res: Response,
  error: unknown,
  defaultMessage: string = 'An error occurred'
): Response<ApiResponse<null>> => {
  console.error('Controller Error:', error)

  if (error instanceof ZodError) {
    return sendValidationErrorResponse(
      res,
      error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      })),
      'Validation error'
    )
  }

  if (error instanceof Error) {
    const msg = error.message || defaultMessage
    const msgLower = msg.toLowerCase()

    if (isInfrastructureErrorMessage(msg)) {
      return sendServiceUnavailableResponse(
        res,
        'Service temporarily unavailable. Please try again in a moment.'
      )
    }

    // Handle known business logic errors
    if (msgLower.includes('not found')) {
      return sendNotFoundResponse(res, msg)
    }

    if (msgLower.includes('already exists') || msgLower.includes('duplicate')) {
      return sendConflictResponse(res, msg)
    }

    if (msgLower.includes('cannot delete') || msgLower.includes('existing orders')) {
      return sendBadRequestResponse(res, msg)
    }

    // Treat authentication failures as 401 (common during login flows)
    if (
      msgLower.includes('unauthorized') ||
      msgLower.includes('access denied') ||
      msgLower.includes('invalid credentials') ||
      msgLower.includes('invalid admin credentials') ||
      msgLower.includes('invalid token') ||
      msgLower.includes('token has expired') ||
      msgLower.includes('session has expired') ||
      msgLower.includes('password is incorrect') ||
      msgLower.includes('does not have a password set')
    ) {
      return sendUnauthorizedResponse(res, msg)
    }

    // Treat authorization / policy failures as 403
    if (
      msgLower.includes('forbidden') ||
      msgLower.includes('permission') ||
      msgLower.includes('banned') ||
      msgLower.includes('deactivated') ||
      msgLower.includes('revoked')
    ) {
      return sendForbiddenResponse(res, msg)
    }

    // Generic error response
    return sendInternalServerErrorResponse(res, msg)
  }

  // Unknown error
  return sendInternalServerErrorResponse(res, defaultMessage)
}

// ================================
// TYPE EXPORTS
// ================================

export type { ApiResponse }
