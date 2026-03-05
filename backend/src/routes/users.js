const express = require('express');
const router = express.Router();
const { getUserById, updateUser } = require('../controllers/userController');
const { getUserCollection } = require('../controllers/collectionController');
const authenticate = require('../middleware/auth');

// GET /api/users/:id - Get user profile
router.get('/:id', authenticate, getUserById);

// PUT /api/users/:id - Update user profile
router.put('/:id', authenticate, updateUser);

// GET /api/users/:id/collections - Get user's collection
router.get('/:id/collections', authenticate, getUserCollection);

module.exports = router;
