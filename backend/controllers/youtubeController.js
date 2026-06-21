const YTMusic = require('ytmusic-api');
const ytdl = require('@distube/ytdl-core');

const ytmusic = new YTMusic();

// Initialize the API immediately so it's ready for requests
let isInitialized = false;
ytmusic.initialize().then(() => {
    isInitialized = true;
    console.log("YTMusic API initialized successfully.");
}).catch(err => {
    console.error("YTMusic API initialization failed:", err);
});

const youtubeController = {
    search: async (req, res) => {
        try {
            const query = req.query.query;
            if (!query) return res.status(400).json({ error: "Query is required" });
            
            if (!isInitialized) await ytmusic.initialize();

            const results = await ytmusic.searchSongs(query);
            
            // Format to match our app's track structure
            const formatted = results.map(song => {
                // Parse duration from string (e.g. "3:45" to seconds)
                let durationSec = 0;
                if (song.duration) {
                    const parts = song.duration.toString().split(':').map(Number);
                    if (parts.length === 2) {
                        durationSec = parts[0] * 60 + parts[1];
                    } else if (parts.length === 3) {
                        durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                }

                return {
                    id: song.videoId,
                    title: song.name,
                    subtitle: song.artist.name,
                    image: song.thumbnails?.[song.thumbnails.length - 1]?.url || '',
                    type: 'song',
                    duration: durationSec,
                    has_lyrics: false,
                    provider: 'youtube'
                };
            });
            
            res.json({ results: formatted });
        } catch (error) {
            console.error("YouTube Search Error:", error);
            res.status(500).json({ error: "Failed to search YouTube" });
        }
    },
    
    getSongDetails: async (req, res) => {
        try {
            const id = req.query.id;
            if (!id) return res.status(400).json({ error: "Id is required" });
            
            const info = await ytdl.getInfo(id);
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            
            // Get highest bitrate audio format
            audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
            const bestAudio = audioFormats[0];
            
            if (!bestAudio) throw new Error("No audio formats found");

            res.json({
                id: id,
                title: info.videoDetails.title,
                subtitle: info.videoDetails.author.name,
                image: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || '',
                streamUrl: bestAudio.url,
                duration: parseInt(info.videoDetails.lengthSeconds),
                provider: 'youtube'
            });
        } catch (error) {
            console.error("YouTube Get Song Error:", error);
            res.status(500).json({ error: "Failed to fetch YouTube song details" });
        }
    }
};

module.exports = youtubeController;
