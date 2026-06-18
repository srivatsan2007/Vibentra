import ProviderInterface from './providerInterface.js';

export default class JioSaavnProvider extends ProviderInterface {
    constructor() {
        super('jiosaavn', 'JioSaavn API');
        // Use relative URL for Vercel, localhost for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('10.')) {
            this.backendUrl = `http://${window.location.hostname}:5000/api/jiosaavn`;
        } else {
            this.backendUrl = '/api/jiosaavn';
        }
        this.trackCache = new Map();
    }

    async searchSongs(query) {
        try {
            const url = `${this.backendUrl}/search?q=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            
            const standardized = data.map(t => this.standardizeTrack({
                id: t.id,
                title: t.title,
                artist: t.artist,
                album: t.album,
                cover: t.cover,
                duration: t.duration,
                streamUrl: t.streamUrl
            }));
            
            // Cache the results so getTrack can find them instantly
            standardized.forEach(t => this.trackCache.set(t.id, t));
            return standardized;

        } catch (error) {
            console.error("JioSaavn search error:", error);
            return [];
        }
    }

    async getTrack(trackId) {
        return this.trackCache.get(trackId) || null;
    }

    async searchAll(query) {
        try {
            const url = `${this.backendUrl}/search/all?q=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            if (data.songs) {
                data.songs = data.songs.map(t => this.standardizeTrack(t));
                data.songs.forEach(t => this.trackCache.set(t.id, t));
            }
            return data;
        } catch (error) {
            console.error("JioSaavn searchAll error:", error);
            return { songs: [], albums: [], playlists: [] };
        }
    }

    async getAlbum(albumId) {
        try {
            const response = await fetch(`${this.backendUrl}/album?id=${albumId}`);
            if (!response.ok) return [];
            const data = await response.json();
            const standardized = data.map(t => this.standardizeTrack(t));
            standardized.forEach(t => this.trackCache.set(t.id, t));
            return standardized;
        } catch (error) {
            console.error("JioSaavn getAlbum error:", error);
            return [];
        }
    }

    async getPlaylist(playlistId) {
        try {
            const response = await fetch(`${this.backendUrl}/playlist?id=${playlistId}`);
            if (!response.ok) return [];
            const data = await response.json();
            const standardized = data.map(t => this.standardizeTrack(t));
            standardized.forEach(t => this.trackCache.set(t.id, t));
            return standardized;
        } catch (error) {
            console.error("JioSaavn getPlaylist error:", error);
            return [];
        }
    }

    async searchArtists(query) { return []; }

    async getLyrics(trackId) {
        try {
            const response = await fetch(`${this.backendUrl}/lyrics?id=${trackId}`);
            if (!response.ok) return null;
            const data = await response.json();
            if (data.lyrics) {
                // Some APIs return lyrics with <br> tags, replace them with newlines
                return data.lyrics.replace(/<br\s*\/?>/gi, '\n');
            }
            return null;
        } catch(e) {
            console.error("Failed to fetch lyrics", e);
            return null;
        }
    }
}
