class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function badRequest(message = 'bad request', details = null) {
  return new ApiError(400, message, details);
}

function unauthorized(message = 'unauthorized') {
  return new ApiError(401, message);
}

function notFound(message = 'not found') {
  return new ApiError(404, message);
}

function validationError(details) {
  return new ApiError(422, 'validation failed', details);
}

module.exports = {
  ApiError,
  badRequest,
  notFound,
  unauthorized,
  validationError
};