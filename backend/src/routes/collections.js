const express = require('express');
const router = express.Router();
const { addToCollection } = require('../controllers/collectionController');
const authenticate = require('../middleware/auth');

// POST /api/collections - Add landmark to collection
router.post('/', authenticate, addToCollection);

module.exports = router;
