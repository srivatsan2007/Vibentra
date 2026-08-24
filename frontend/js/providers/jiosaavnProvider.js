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
        const urlsToTry = Array.from(new Set([
            `${this.backendUrl}${endpointPath}`,
            `https://vibentra.vercel.app/api/jiosaavn${endpointPath}`,
            `https://jiosaavn-api-v3.vercel.app${endpointPath}`
        ]));
        
        for (let url of urlsToTry) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const data = await response.json();
                    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
                        return data;
                    }
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
                const fallbackApis = [
                    `https://jiosaavn-api-v3.vercel.app/search?q=${encodeURIComponent(query)}`,
                    `https://saavn.me/search/songs?query=${encodeURIComponent(query)}`
                ];
                for (let api of fallbackApis) {
                    try {
                        const fallbackRes = await fetch(api);
                        if (fallbackRes.ok) {
                            const fallbackJson = await fallbackRes.json();
                            let rawList = Array.isArray(fallbackJson) ? fallbackJson : (fallbackJson?.data?.results || fallbackJson?.results || []);
                            if (rawList && rawList.length > 0) {
                                data = rawList.map(t => ({
                                    id: t.id,
                                    title: t.name || t.title || '',
                                    artist: t.primaryArtists || (t.artists?.primary ? t.artists.primary.map(a => a.name).join(', ') : '') || t.artist || '',
                                    album: t.album?.name || t.album || '',
                                    cover: (t.image && t.image.length > 0) ? (typeof t.image === 'string' ? t.image : t.image[t.image.length - 1].url) : (t.cover || ''),
                                    duration: typeof t.duration === 'number' ? `${Math.floor(t.duration / 60)}:${(t.duration % 60).toString().padStart(2, '0')}` : (t.duration || '3:30'),
                                    streamUrl: (t.downloadUrl && t.downloadUrl.length > 0) ? (typeof t.downloadUrl === 'string' ? t.downloadUrl : t.downloadUrl[t.downloadUrl.length - 1].url) : (t.streamUrl || null)
                                }));
                                break;
                            }
                        }
                    } catch (e) { }
                }
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

            if (cached && cached.streamUrl) return cached;

            if (cached) {
                const searchList = await this.searchSongs(`${cached.title} ${cached.artist}`);
                if (searchList && searchList.length > 0 && searchList[0].streamUrl) {
                    cached.streamUrl = searchList[0].streamUrl;
                    if (!cached.cover || cached.cover.trim() === '') cached.cover = searchList[0].cover;
                    cached._timestamp = Date.now();
                    this.trackCache.set(cached.id, cached);
                    return cached;
                }
            }

            return cached || null;
        } catch (error) {
            console.error("JioSaavn getTrack error:", error);
            return cached || null;
        }
    }

    standardizeAlbum(album) {
        if (!album) return null;
        let cover = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80';
        if (album.image) {
            if (Array.isArray(album.image)) {
                cover = album.image[album.image.length - 1]?.link || album.image[album.image.length - 1]?.url || cover;
            } else if (typeof album.image === 'string') {
                cover = album.image.replace('150x150', '500x500');
            }
        }
        return {
            id: album.id,
            title: album.title || album.name || 'Album',
            artist: album.artist || album.music || album.subtitle || 'Various Artists',
            cover: cover,
            year: album.year || album.release_date || '',
            type: 'album',
            provider: 'JioSaavn',
            providerId: 'jiosaavn'
        };
    }

    standardizePlaylist(playlist) {
        if (!playlist) return null;
        let cover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
        if (playlist.image) {
            if (Array.isArray(playlist.image)) {
                cover = playlist.image[playlist.image.length - 1]?.link || playlist.image[playlist.image.length - 1]?.url || cover;
            } else if (typeof playlist.image === 'string') {
                cover = playlist.image.replace('150x150', '500x500');
            }
        }
        return {
            id: playlist.id,
            title: playlist.title || playlist.name || 'Playlist',
            artist: playlist.artist || playlist.subtitle || 'Curated Playlist',
            cover: cover,
            type: 'playlist',
            provider: 'JioSaavn',
            providerId: 'jiosaavn'
        };
    }

    async searchAll(query) {
        try {
            const endpoint = `/search/all?q=${encodeURIComponent(query)}`;
            let rawData = await this.safeFetch(endpoint);
            let data = rawData?.data || rawData || {};

            let songs = [];
            let albums = [];
            let playlists = [];

            // Extract Songs Array safely
            const rawSongs = Array.isArray(data.songs) ? data.songs : (data.songs?.results || data.songs?.data || []);
            songs = rawSongs.map(t => this.standardizeTrack(t)).filter(Boolean);
            songs.forEach(t => this.trackCache.set(t.id, t));

            // Extract Albums Array safely
            const rawAlbums = Array.isArray(data.albums) ? data.albums : (data.albums?.results || data.albums?.data || []);
            albums = rawAlbums.map(a => this.standardizeAlbum(a)).filter(Boolean);

            // Extract Playlists Array safely
            const rawPlaylists = Array.isArray(data.playlists) ? data.playlists : (data.playlists?.results || data.playlists?.data || []);
            playlists = rawPlaylists.map(p => this.standardizePlaylist(p)).filter(Boolean);

            // Fallback: If no dedicated album array was returned from search/all, query /search/albums
            if (albums.length === 0) {
                try {
                    const albumData = await this.safeFetch(`/search/albums?q=${encodeURIComponent(query)}`);
                    const fallbackAlbums = Array.isArray(albumData) ? albumData : (albumData?.results || albumData?.data || albumData?.albums?.results || []);
                    if (Array.isArray(fallbackAlbums) && fallbackAlbums.length > 0) {
                        albums = fallbackAlbums.map(a => this.standardizeAlbum(a)).filter(Boolean);
                    }
                } catch (e) {
                    console.warn('[JioSaavn] Album fallback search failed:', e);
                }
            }

            return { songs, albums, playlists };
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

