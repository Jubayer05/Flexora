import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import {
  sendBadRequestResponse,
  sendConflictResponse,
  sendErrorResponse,
  sendForbiddenResponse,
  sendInternalServerErrorResponse,
  sendNotFoundResponse,
  sendUnauthorizedResponse,
  sendValidationErrorResponse,
  type ApiResponse
} from '../utils/response-handler'

// Custom error class for operational errors
export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

// ================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ================================

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response<ApiResponse<null>> | void => {
  console.error('================================')
  console.error('GLOBAL ERROR HANDLER TRIGGERED')
  console.error('================================')
  console.error('Error Details:', {
    message: err.message,
    name: err.name,
    isZodError: err instanceof ZodError,
    isError: err instanceof Error,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  })
  
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack)
  }
  console.error('================================')

  // Don't handle if response already sent
  if (res.headersSent) {
    return next(err)
  }

  // Handle Zod validation errors (MUST be before pattern matching)
  if (err instanceof ZodError) {
    console.error('[ErrorHandler] ZodError caught with', err.issues.length, 'issues')
    const validationErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }))
    console.error('[ErrorHandler] Validation errors:', validationErrors)
    return sendValidationErrorResponse(
      res,
      validationErrors,
      'Request validation failed'
    )
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res)
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error('PrismaClientValidationError:', err.message)
    console.error('Request:', req.method, req.originalUrl)
    return sendBadRequestResponse(res, 'Invalid data provided to database')
  }

  // Handle Prisma initialization errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return sendInternalServerErrorResponse(res, 'Database connection failed')
  }

  // Handle operational errors (our custom AppError)
  if (err instanceof AppError) {
    return sendErrorResponse(res, err.message, err.statusCode)
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendUnauthorizedResponse(res, 'Invalid authentication token')
  }

  if (err.name === 'TokenExpiredError') {
    return sendUnauthorizedResponse(res, 'Authentication token has expired')
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    const multerError = err as any
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      return sendBadRequestResponse(res, 'File size too large. Maximum size is 10MB per file')
    }
    if (multerError.code === 'LIMIT_FILE_COUNT') {
      return sendBadRequestResponse(res, 'Too many files uploaded. Maximum is 10 files')
    }
    if (multerError.code === 'LIMIT_UNEXPECTED_FILE') {
      return sendBadRequestResponse(
        res,
        'Unexpected file field. Please use field name "files" for file uploads'
      )
    }
    if (multerError.code === 'LIMIT_FIELD_COUNT') {
      return sendBadRequestResponse(res, 'Too many form fields')
    }
    return sendBadRequestResponse(res, `File upload error: ${multerError.message}`)
  }

  // Handle known Node.js errors
  if (err.name === 'SyntaxError') {
    return sendBadRequestResponse(res, 'Invalid JSON format')
  }

  if (err.name === 'CastError') {
    return sendBadRequestResponse(res, 'Invalid data format')
  }

  // Handle business logic errors based on message patterns
  if (err instanceof Error) {
    const message = err.message.toLowerCase()

    if (message.includes('not found') || message.includes('does not exist')) {
      return sendNotFoundResponse(res, err.message)
    }

    if (message.includes('already exists') || message.includes('duplicate')) {
      return sendConflictResponse(res, err.message)
    }

    if (message.includes('unauthorized') || message.includes('access denied')) {
      return sendUnauthorizedResponse(res, err.message)
    }

    if (message.includes('forbidden') || message.includes('permission denied')) {
      return sendForbiddenResponse(res, err.message)
    }

    if (
      message.includes('cannot delete') ||
      message.includes('has dependencies') ||
      message.includes('existing orders')
    ) {
      return sendBadRequestResponse(res, err.message)
    }

    if (message.includes('invalid') || message.includes('malformed')) {
      return sendBadRequestResponse(res, err.message)
    }
  }

  // Programming or unknown error: don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  const errorMessage = isDevelopment
    ? err.message || 'Internal Server Error'
    : 'Something went wrong. Please try again later.'

  return sendInternalServerErrorResponse(res, errorMessage)
}

// ================================
// PRISMA ERROR HANDLER
// ================================

const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): Response<ApiResponse<null>> => {
  switch (err.code) {
    // Unique constraint violation
    case 'P2002': {
      const field = (err.meta?.target as string[]) || ['field']
      const fieldName = field[0]
      const message = `A record with this ${fieldName} already exists.`
      return sendConflictResponse(res, message)
    }

    // Foreign key constraint violation
    case 'P2003': {
      const fieldName = err.meta?.field_name || 'reference'
      return sendBadRequestResponse(res, `Invalid ${fieldName}: Referenced record does not exist.`)
    }

    // Record not found for where condition
    case 'P2025': {
      return sendNotFoundResponse(res, 'Record not found or could not be updated/deleted.')
    }

    // Record not found (general)
    case 'P2001': {
      return sendNotFoundResponse(
        res,
        'The record searched for in the where condition does not exist.'
      )
    }

    // Dependent record not found
    case 'P2018': {
      return sendNotFoundResponse(res, 'Required connected records not found.')
    }

    // Invalid ID format
    case 'P2023': {
      return sendBadRequestResponse(res, 'Invalid ID format provided.')
    }

    // Inconsistent column data
    case 'P2011': {
      return sendBadRequestResponse(res, 'Null constraint violation on a required field.')
    }

    // Value too long for column type
    case 'P2000': {
      const fieldName = err.meta?.column_name || 'field'
      return sendBadRequestResponse(res, `Value too long for ${fieldName}.`)
    }

    // Value out of range for column type
    case 'P2006': {
      const fieldName = err.meta?.column_name || 'field'
      return sendBadRequestResponse(res, `Invalid value provided for ${fieldName}.`)
    }

    // Data validation error
    case 'P2007': {
      return sendBadRequestResponse(res, 'Data validation error.')
    }

    // Query parsing error
    case 'P2008': {
      return sendBadRequestResponse(res, 'Failed to parse the query.')
    }

    // Query validation error
    case 'P2009': {
      return sendBadRequestResponse(res, 'Failed to validate the query.')
    }

    // Raw query failed
    case 'P2010': {
      return sendInternalServerErrorResponse(res, 'Raw query failed. Code: `P2010`')
    }

    // Null constraint violation
    case 'P2011': {
      const fieldName = err.meta?.constraint || 'field'
      return sendBadRequestResponse(res, `Null constraint violation on ${fieldName}.`)
    }

    // Missing a required value
    case 'P2012': {
      const fieldName = err.meta?.path || 'field'
      return sendBadRequestResponse(res, `Missing a required value at ${fieldName}.`)
    }

    // Missing the required argument
    case 'P2013': {
      const fieldName = err.meta?.argument_name || 'field'
      return sendBadRequestResponse(res, `Missing the required argument ${fieldName}.`)
    }

    // Relation violation
    case 'P2014': {
      return sendBadRequestResponse(res, 'The change would violate the required relation.')
    }

    // Related record not found
    case 'P2015': {
      return sendNotFoundResponse(res, 'A related record could not be found.')
    }

    // Query interpretation error
    case 'P2016': {
      return sendBadRequestResponse(res, 'Query interpretation error.')
    }

    // Records for relation not connected
    case 'P2017': {
      const relationName = err.meta?.relation_name || 'relation'
      return sendBadRequestResponse(
        res,
        `The records for relation ${relationName} are not connected.`
      )
    }

    // Required connected records not found
    case 'P2018': {
      return sendNotFoundResponse(res, 'Required connected records not found.')
    }

    // Input error
    case 'P2019': {
      return sendBadRequestResponse(res, 'Input error.')
    }

    // Value out of range
    case 'P2020': {
      return sendBadRequestResponse(res, 'Value out of range for the type.')
    }

    // Table does not exist
    case 'P2021': {
      const tableName = err.meta?.table || 'table'
      return sendInternalServerErrorResponse(
        res,
        `The table ${tableName} does not exist in the current database.`
      )
    }

    // Column does not exist
    case 'P2022': {
      const columnName =
        (err.meta && ('column' in err.meta && err.meta.column != null
          ? String(err.meta.column)
          : 'column_name' in err.meta && err.meta.column_name != null
            ? String(err.meta.column_name)
            : null)) ?? 'unknown'
      const hint =
        columnName === 'unknown' && process.env.NODE_ENV === 'development' && err.meta
          ? ` (meta: ${JSON.stringify(err.meta)})`
          : ''
      return sendInternalServerErrorResponse(
        res,
        `The column "${columnName}" does not exist in the current database. Run migrations: npx prisma migrate deploy.${hint}`
      )
    }

    // Inconsistent column data
    case 'P2023': {
      return sendBadRequestResponse(res, 'Inconsistent column data.')
    }

    // Timed out fetching a new connection from the pool
    case 'P2024': {
      return sendInternalServerErrorResponse(res, 'Database connection timeout. Please try again.')
    }

    // Default case for unknown Prisma errors
    default: {
      console.error('Unknown Prisma error code:', err.code, err.message)
      return sendInternalServerErrorResponse(
        res,
        process.env.NODE_ENV === 'development'
          ? `Database error (${err.code}): ${err.message}`
          : 'Database operation failed. Please try again.'
      )
    }
  }
}

// ================================
// ASYNC ERROR HANDLER WRAPPER
// ================================

export const asyncHandler = <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
  return (...args: T): Promise<R> => {
    const result = fn(...args)
    if (result instanceof Promise) {
      return result.catch(args[args.length - 1] as any) // next function is typically the last argument
    }
    return result
  }
}

// ================================
// 404 NOT FOUND HANDLER
// ================================

export const notFoundHandler = (req: Request, res: Response): Response<ApiResponse<null>> => {
  return sendNotFoundResponse(res, `Route ${req.originalUrl} not found.`)
}

// Export types for use in other files
export type { ApiResponse }
