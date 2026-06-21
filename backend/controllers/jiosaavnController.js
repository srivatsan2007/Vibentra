const https = require('https');
const CryptoJS = require('crypto-js');

function decryptUrl(encryptedUrl) {
    try {
        const key = CryptoJS.enc.Utf8.parse('38346591');
        const decrypted = CryptoJS.DES.decrypt({
            ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl)
        }, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        return decryptedStr.replace('_96.mp4', '_320.mp4').trim();
    } catch (e) {
        console.error("Decryption failed", e);
        return null;
    }
}

function formatTime(secondsStr) {
    if (!secondsStr) return "0:00";
    const totalSeconds = parseInt(secondsStr, 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const fetchJson = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (data.trim() === '') {
                    return resolve({});
                }
                try { 
                    resolve(JSON.parse(data)); 
                } catch(e) { 
                    console.error("fetchJson parse error for url:", url, "Data:", data.substring(0, 100));
                    resolve({}); // Resolve empty object on parse error to avoid unhandled rejection
                }
            });
        }).on('error', reject);
    });
};

const formatTrack = (track) => {
    let streamUrl = null;
    if (track.encrypted_media_url) {
        streamUrl = decryptUrl(track.encrypted_media_url);
    }
    return {
        id: track.id,
        title: track.song ? track.song.replace(/&quot;/g, '"') : (track.title || ''),
        artist: track.primary_artists || track.singers || '',
        album: track.album ? track.album.replace(/&quot;/g, '"') : '',
        cover: track.image ? track.image.replace('150x150', '500x500') : '',
        duration: formatTime(track.duration),
        streamUrl: streamUrl,
        type: 'song'
    };
};

const searchJioSaavn = (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });

    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=15&p=1&cc=in&q=${encodeURIComponent(query)}`;

    https.get(url, (jioRes) => {
        let data = '';
        jioRes.on('data', chunk => data += chunk);
        jioRes.on('end', () => {
            if (data.trim() === '') {
                return res.json([]);
            }
            try {
                const json = JSON.parse(data);
                if (!json.results) return res.json([]);
                res.json(json.results.map(formatTrack));
            } catch (err) {
                console.error("JioSaavn Parse error:", err, "Data:", data.substring(0, 100));
                res.json([]); // Return empty array instead of 500
            }
        });
    }).on('error', (err) => {
        console.error("JioSaavn API Error:", err);
        res.status(500).json({ error: "Failed to connect to JioSaavn" });
    });
};

const searchAllJioSaavn = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query" });

    try {
        const q = encodeURIComponent(query);
        const [songsRes, albumsRes, playlistsRes] = await Promise.all([
            fetchJson(`https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=15&p=1&cc=in&q=${q}`),
            fetchJson(`https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&_format=json&n=15&p=1&cc=in&q=${q}`),
            fetchJson(`https://www.jiosaavn.com/api.php?__call=search.getPlaylistResults&_format=json&n=15&p=1&cc=in&q=${q}`)
        ]);

        const songs = (songsRes.results || []).map(formatTrack);
        
        const albums = (albumsRes.results || []).map(album => ({
            id: album.albumid || album.id,
            title: album.title ? album.title.replace(/&quot;/g, '"') : '',
            artist: album.music || album.subtitle || '',
            cover: album.image ? album.image.replace('150x150', '500x500') : '',
            type: 'album'
        }));

        const playlists = (playlistsRes.results || []).map(pl => ({
            id: pl.listid || pl.id,
            title: (pl.listname || pl.title || '').replace(/&quot;/g, '"'),
            artist: pl.language || pl.subtitle || 'Playlist',
            cover: pl.image ? pl.image.replace('150x150', '500x500') : '',
            type: 'playlist'
        }));

        res.json({ songs, albums, playlists });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Search all failed" });
    }
};

const getAlbumDetails = async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing id" });
    try {
        const json = await fetchJson(`https://www.jiosaavn.com/api.php?__call=content.getAlbumDetails&_format=json&cc=in&albumid=${encodeURIComponent(id)}`);
        if (!json.songs) return res.json([]);
        res.json(json.songs.map(formatTrack));
    } catch (err) {
        res.status(500).json({ error: "Failed to get album" });
    }
};

const getPlaylistDetails = async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing id" });
    try {
        const json = await fetchJson(`https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&cc=in&listid=${encodeURIComponent(id)}`);
        if (!json.songs) return res.json([]);
        res.json(json.songs.map(formatTrack));
    } catch (err) {
        res.status(500).json({ error: "Failed to get playlist" });
    }
};

const getLyrics = (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing track id" });

    const url = `https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&ctx=web6dot0&api_version=4&_format=json&lyrics_id=${encodeURIComponent(id)}`;

    https.get(url, (jioRes) => {
        let data = '';
        jioRes.on('data', chunk => data += chunk);
        jioRes.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.lyrics) {
                    res.json({ lyrics: json.lyrics });
                } else {
                    res.json({ lyrics: null });
                }
            } catch (err) {
                console.error("JioSaavn Lyrics Parse error:", err);
                res.status(500).json({ error: "Failed to parse lyrics response" });
            }
        });
    }).on('error', (err) => {
        console.error("JioSaavn Lyrics API Error:", err);
        res.status(500).json({ error: "Failed to connect to JioSaavn" });
    });
};

const recognizeAudio = async (req, res) => {
    const { audioData } = req.body;
    if (!audioData) return res.status(400).json({ error: "Missing audio data" });

    // Mock an external audio recognition API call.
    // In a real scenario, you'd send the base64 audio to AudD or ACRCloud here.
    try {
        // Simulate processing time
        await new Promise(r => setTimeout(r, 2000));
        
        // Randomly return a popular song as the "recognized" song
        const popularSongs = ["Blinding Lights", "Shape of You", "Levitating", "Tum Hi Ho", "Believer"];
        const recognizedSongTitle = popularSongs[Math.floor(Math.random() * popularSongs.length)];
        
        const q = encodeURIComponent(recognizedSongTitle);
        const songsRes = await fetchJson(`https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=5&p=1&cc=in&q=${q}`);
        
        if (songsRes.results && songsRes.results.length > 0) {
            const track = formatTrack(songsRes.results[0]);
            res.json({ success: true, track });
        } else {
            res.status(404).json({ error: "Song recognized but not found in JioSaavn" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Audio recognition failed" });
    }
};

const getSongDetails = async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing id" });
    try {
        const json = await fetchJson(`https://www.jiosaavn.com/api.php?__call=song.getDetails&_format=json&cc=in&pids=${encodeURIComponent(id)}`);
        if (!json || !json[id]) return res.status(404).json({ error: "Song not found" });
        res.json(formatTrack(json[id]));
    } catch (err) {
        res.status(500).json({ error: "Failed to get song details" });
    }
};

module.exports = {
    searchJioSaavn,
    searchAllJioSaavn,
    getAlbumDetails,
    getPlaylistDetails,
    getLyrics,
    recognizeAudio,
    getSongDetails
};
