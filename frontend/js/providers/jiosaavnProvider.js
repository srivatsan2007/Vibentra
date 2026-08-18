import ProviderInterface from './providerInterface.js';

export default class JioSaavnProvider extends ProviderInterface {
    constructor() {
        super('jiosaavn', 'JioSaavn API');
        if (typeof window !== 'undefined') {
            if (window.location.protocol === 'file:' || (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) {
                this.backendUrl = 'https://vibentra.vercel.app/api/jiosaavn';
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('10.')) {
                this.backendUrl = `http://${window.location.hostname}:5000/api/jiosaavn`;
            } else {
                this.backendUrl = '/api/jiosaavn';
            }
        } else {
            this.backendUrl = '/api/jiosaavn';
        }
        this.trackCache = new Map();
    }

    async safeFetch(endpointPath) {
        const urlsToTry = [
            `${this.backendUrl}${endpointPath}`,
            `https://vibentra.vercel.app/api/jiosaavn${endpointPath}`
        ];
        
        for (let url of urlsToTry) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    return await response.json();
                }
            } catch (e) {
                console.warn(`JioSaavn fetch failed for ${url}:`, e.message || e);
            }
        }
        return null;
    }

    async searchSongs(query) {
        try {
            const endpoint = `/search?q=${encodeURIComponent(query)}`;
            let data = await this.safeFetch(endpoint);
            
            // Client-side fallback if backend fails completely
            if (!data || !Array.isArray(data) || data.length === 0) {
                try {
                    const fallbackRes = await fetch(`https://saavn.me/search/songs?query=${encodeURIComponent(query)}`);
                    if (fallbackRes.ok) {
                        const fallbackJson = await fallbackRes.json();
                        if (fallbackJson && fallbackJson.data && fallbackJson.data.results) {
                            data = fallbackJson.data.results.map(t => ({
                                id: t.id,
                                title: t.name || t.title || '',
                                artist: t.primaryArtists || (t.artists?.primary ? t.artists.primary.map(a => a.name).join(', ') : ''),
                                album: t.album?.name || '',
                                cover: (t.image && t.image.length > 0) ? t.image[t.image.length - 1].url : '',
                                duration: `${Math.floor((t.duration || 0) / 60)}:${((t.duration || 0) % 60).toString().padStart(2, '0')}`,
                                streamUrl: (t.downloadUrl && t.downloadUrl.length > 0) ? t.downloadUrl[t.downloadUrl.length - 1].url : null
                            }));
                        }
                    }
                } catch (e) { }
            }

            if (!data || !Array.isArray(data)) return [];

            const standardized = data.map(t => this.standardizeTrack({
                id: t.id,
                title: t.title,
                artist: t.artist,
                album: t.album,
                cover: t.cover,
                duration: t.duration,
                streamUrl: t.streamUrl
            }));
            
            standardized.forEach(t => this.trackCache.set(t.id, t));
            return standardized;

        } catch (error) {
            console.error("JioSaavn search error:", error);
            return [];
        }
    }

    async getTrack(trackId) {
        const cached = this.trackCache.get(trackId);
        if (cached && cached.streamUrl && cached._timestamp && (Date.now() - cached._timestamp < 2.5 * 60 * 1000)) {
            return cached;
        }

        try {
            const data = await this.safeFetch(`/song?id=${trackId}`);
            if (data && data.id) {
                const standardized = this.standardizeTrack(data);
                standardized._timestamp = Date.now();
                this.trackCache.set(standardized.id, standardized);
                return standardized;
            }
            return cached || null;
        } catch (error) {
            console.error("JioSaavn getTrack error:", error);
            return cached || null;
        }
    }

    async searchAll(query) {
        try {
            const endpoint = `/search/all?q=${encodeURIComponent(query)}`;
            let data = await this.safeFetch(endpoint);
            
            if (!data || (!data.songs && !data.albums && !data.playlists)) {
                const songs = await this.searchSongs(query);
                data = { songs, albums: [], playlists: [] };
            }

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
            const data = await this.safeFetch(`/album?id=${albumId}`);
            if (!data || !Array.isArray(data)) return [];
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
            const data = await this.safeFetch(`/playlist?id=${playlistId}`);
            if (!data || !Array.isArray(data)) return [];
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
            const data = await this.safeFetch(`/lyrics?id=${trackId}`);
            if (data && data.lyrics) {
                return data.lyrics.replace(/<br\s*\/?>/gi, '\n');
            }
            return null;
        } catch(e) {
            console.error("Failed to fetch lyrics", e);
            return null;
        }
    }
}

