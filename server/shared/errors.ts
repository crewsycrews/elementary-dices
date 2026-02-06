/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Conflict error (409) - for duplicate resources
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    public originalError?: any,
    public query?: string
  ) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Parse PostgreSQL error codes into user-friendly messages
 */
export function parsePostgresError(error: any): DatabaseError {
  const code = error.code;
  const table = error.table;
  const column = error.column;
  const constraint = error.constraint;

  // Common PostgreSQL error codes
  const errorMessages: Record<string, string> = {
    '23505': `Duplicate entry: ${constraint || 'unique constraint'} violation`,
    '23503': `Foreign key violation: referenced ${table || 'record'} does not exist`,
    '23502': `Not null violation: ${column || 'required field'} cannot be null`,
    '42703': `Undefined column: column "${column || 'unknown'}" does not exist in table "${table || 'unknown'}"`,
    '42P01': `Undefined table: table "${table || error.message}" does not exist`,
    '42601': 'Syntax error in SQL query',
    '22P02': 'Invalid input syntax (type mismatch)',
    '23514': `Check constraint violation: ${constraint || 'validation'} failed`,
  };

  const message = errorMessages[code] || `Database error: ${error.message}`;

  return new DatabaseError(message, error, error.query);
}

/**
 * Check if error is a database error
 */
export function isDatabaseError(error: any): boolean {
  return error.code && (
    error.code.startsWith('23') || // Integrity constraint violations
    error.code.startsWith('42') || // Syntax/schema errors
    error.code.startsWith('22') || // Data exceptions
    error.severity === 'ERROR'     // PostgreSQL errors
  );
}
