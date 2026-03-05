const { body, param, query } = require('express-validator');

/**
 * Validation rules for API endpoints.
 */

const validateLandmarkId = [
  param('id').isUUID().withMessage('Invalid landmark ID format'),
];

const validateRouteGeneration = [
  body('start_lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('start_lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('time_budget_min').isInt({ min: 15, max: 480 }).withMessage('Time budget must be 15-480 minutes'),
];

const validateCollectionEntry = [
  body('landmark_id').isUUID().withMessage('Invalid landmark ID'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('dwell_time_min').optional().isInt({ min: 0 }).withMessage('Dwell time must be positive'),
];

const validateUserUpdate = [
  body('display_name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('accessibility_needs').optional().isInt({ min: 0, max: 5 }),
];

module.exports = {
  validateLandmarkId,
  validateRouteGeneration,
  validateCollectionEntry,
  validateUserUpdate,
};
