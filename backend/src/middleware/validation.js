const { validationResult } = require('express-validator');

/**
 * Middleware to check validation results.
 * Returns 400 if validation errors are found.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: errors.array(),
      },
    });
  }

  next();
};

module.exports = validate;
