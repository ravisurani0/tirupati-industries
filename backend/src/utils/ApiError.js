/**
 * Error with an HTTP status code. Throw it from anywhere in a request
 * handler and the error middleware turns it into a JSON response.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message = 'Bad request', errors) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthenticated') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists', errors) {
    return new ApiError(409, message, errors);
  }

  static unprocessable(message = 'Validation failed', errors) {
    return new ApiError(422, message, errors);
  }
}

module.exports = ApiError;
