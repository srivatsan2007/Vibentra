const express = require('express');
const router = express.Router();
const { searchJioSaavn, searchAllJioSaavn, getAlbumDetails, getPlaylistDetails, getLyrics, recognizeAudio, getSongDetails } = require('../controllers/jiosaavnController');

// Using it publicly without auth for the frontend player
router.get('/search', searchJioSaavn);
router.get('/search/all', searchAllJioSaavn);
router.get('/album', getAlbumDetails);
router.get('/playlist', getPlaylistDetails);
router.get('/lyrics', getLyrics);
router.post('/recognize', recognizeAudio);
router.get('/song', getSongDetails);
router.get('/download', require('../controllers/jiosaavnController').downloadAudio);

module.exports = router;
