const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');

router.get('/search', youtubeController.search);
router.get('/song', youtubeController.getSongDetails);

module.exports = router;
