class YouTubeProvider {
    constructor() {
        this.id = 'youtube';
        this.name = 'YouTube Music';
        // Connect to the local backend during development, or relative path in production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('10.')) {
            this.backendUrl = `http://${window.location.hostname}:5000/api/youtube`;
        } else {
            this.backendUrl = '/api/youtube';
        }
        this.trackCache = new Map();
    }

    // Standardize the track format
    standardizeTrack(data) {
        return {
            id: data.id,
            title: data.title,
            subtitle: data.subtitle || data.artist || 'Unknown Artist',
            image: data.image || 'images/default-artwork.png',
            duration: data.duration || 0,
            has_lyrics: data.has_lyrics || false,
            providerId: this.id,
            streamUrl: data.streamUrl || null
        };
    }

    async searchSongs(query) {
        if (!query) return [];
        try {
            const response = await fetch(`${this.backendUrl}/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Failed to search YouTube');
            const data = await response.json();
            
            if (data.results && Array.isArray(data.results)) {
                return data.results.map(t => this.standardizeTrack(t));
            }
            return [];
        } catch (error) {
            console.error("YouTube search error:", error);
            return [];
        }
    }

    async searchAll(query) {
        // For now, YouTube search only returns songs in our backend implementation
        const songs = await this.searchSongs(query);
        return { songs, albums: [], playlists: [] };
    }

    async getTrack(trackId) {
        const cached = this.trackCache.get(trackId);
        // Expiration for YouTube streams is critical. Cache for 30 minutes.
        if (cached && cached._timestamp && (Date.now() - cached._timestamp < 30 * 60 * 1000)) {
            return cached;
        }

        try {
            const response = await fetch(`${this.backendUrl}/song?id=${encodeURIComponent(trackId)}`);
            if (!response.ok) throw new Error('Failed to fetch song details');
            const data = await response.json();
            
            const standardized = this.standardizeTrack(data);
            standardized._timestamp = Date.now();
            this.trackCache.set(standardized.id, standardized);
            return standardized;
        } catch (error) {
            console.error("YouTube getTrack error:", error);
            return cached || null;
        }
    }

    async getPlaylist(playlistId) {
        // Fallback: YT Playlist logic can be implemented later
        console.warn("YouTube getPlaylist not implemented yet");
        return { title: 'YouTube Playlist', subtitle: 'Various Artists', image: '', type: 'playlist', songs: [] };
    }

    async getAlbum(albumId) {
        // Fallback: YT Album logic can be implemented later
        console.warn("YouTube getAlbum not implemented yet");
        return { title: 'YouTube Album', subtitle: 'Unknown Artist', image: '', type: 'album', songs: [] };
    }
}

export const youtubeProvider = new YouTubeProvider();
