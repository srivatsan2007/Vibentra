import ProviderInterface from './providerInterface.js';

export default class YouTubeMusicProvider extends ProviderInterface {
    constructor() {
        super('ytmusic', 'YouTube Music');
        
        // Fast, active YouTube Music search API endpoints
        this.apiInstances = [
            'https://api.piped.private.coffee',
            'https://pipedapi.kavin.rocks',
            'https://pipedapi.drgns.space',
            'https://api.piped.privacydev.net'
        ];
        this.currentInstanceIndex = 0;
        this.trackCache = new Map();
        
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
    }

    getInstanceUrl() {
        return this.apiInstances[this.currentInstanceIndex];
    }

    rotateInstance() {
        this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.apiInstances.length;
    }

    async fetchWithTimeout(url, timeoutMs = 2500) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    }

    async fetchWithFallback(endpoint) {
        let attempts = 0;
        while (attempts < this.apiInstances.length) {
            const baseUrl = this.getInstanceUrl();
            try {
                const data = await this.fetchWithTimeout(`${baseUrl}${endpoint}`, 2500);
                if (data) return data;
            } catch (error) {
                console.warn(`[YouTube Music] Mirror failed (${baseUrl}):`, error.message || error);
            }
            this.rotateInstance();
            attempts++;
        }
        throw new Error('All YouTube Music API mirrors timed out or failed');
    }

    extractVideoId(urlOrId) {
        if (!urlOrId) return '';
        if (urlOrId.includes('v=')) {
            const match = urlOrId.match(/v=([a-zA-Z0-9_-]{11})/);
            if (match) return match[1];
        } else if (urlOrId.includes('/watch?v=')) {
            return urlOrId.split('/watch?v=')[1]?.split('&')[0] || urlOrId;
        } else if (urlOrId.startsWith('/watch?v=')) {
            return urlOrId.replace('/watch?v=', '').split('&')[0];
        }
        return urlOrId;
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '3:30';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    async prefetchTrackStream(track) {
        if (!track || track.streamUrl) return;
        try {
            const query = encodeURIComponent(`${track.title} ${track.artist}`);
            const urlsToTry = [
                `${this.backendUrl}/search?q=${query}`,
                `https://vibentra.vercel.app/api/jiosaavn/search?q=${query}`
            ];
            for (let u of urlsToTry) {
                try {
                    const res = await fetch(u);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.length > 0 && data[0].streamUrl) {
                            track.streamUrl = data[0].streamUrl;
                            track._streamTimestamp = Date.now();
                            this.trackCache.set(track.id, track);
                            break;
                        }
                    }
                } catch (e) { }
            }
        } catch (e) {}
    }

    async searchSongs(query) {
        let songs = [];
        try {
            const endpoint = `/search?q=${encodeURIComponent(query)}&filter=music_songs`;
            const data = await this.fetchWithFallback(endpoint);
            
            const rawItems = data.items || [];
            const rawSongs = rawItems.filter(item => item.url || item.type === 'stream' || item.type === 'music_song').slice(0, 20);
            
            songs = rawSongs.map(item => {
                const videoId = this.extractVideoId(item.url);
                const title = (item.title || 'YouTube Track').replace(/\(Official Audio\)/gi, '').replace(/\(Official Video\)/gi, '').trim();
                const artist = item.uploaderName || item.artist || 'YouTube Music';
                
                return this.standardizeTrack({
                    id: `yt_${videoId || Math.random().toString(36).substring(7)}`,
                    videoId: videoId,
                    title: title,
                    artist: artist,
                    album: 'YouTube Music',
                    cover: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : (item.thumbnail || ''),
                    duration: this.formatDuration(item.duration),
                    streamUrl: null
                });
            });
        } catch (error) {
            console.warn('[YouTube Music] Primary search mirrors failed, using API fallback:', error.message || error);
        }

        // Secondary resilient fallback: query fallback API so YT Music search ALWAYS returns songs & playable streamUrls
        if (songs.length === 0) {
            try {
                const fallbackUrls = [
                    `https://vibentra.vercel.app/api/jiosaavn/search?q=${encodeURIComponent(query)}`,
                    `https://jiosaavn-api-v3.vercel.app/search?q=${encodeURIComponent(query)}`
                ];
                for (let api of fallbackUrls) {
                    try {
                        const res = await fetch(api);
                        if (res.ok) {
                            const json = await res.json();
                            const list = Array.isArray(json) ? json : (json?.data?.results || json?.results || []);
                            if (list && list.length > 0) {
                                songs = list.map(item => {
                                    const sUrl = item.streamUrl || (item.downloadUrl && item.downloadUrl.length > 0 ? (typeof item.downloadUrl === 'string' ? item.downloadUrl : item.downloadUrl[item.downloadUrl.length - 1].url) : null);
                                    return this.standardizeTrack({
                                        id: `yt_${item.id || Math.random().toString(36).substring(7)}`,
                                        videoId: item.id,
                                        title: item.title || item.name || '',
                                        artist: item.artist || item.primaryArtists || 'YouTube Music',
                                        album: 'YouTube Music',
                                        cover: item.cover || (item.image && item.image.length > 0 ? (typeof item.image === 'string' ? item.image : item.image[item.image.length - 1].url) : ''),
                                        duration: typeof item.duration === 'number' ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : (item.duration || '3:30'),
                                        streamUrl: sUrl
                                    });
                                });
                                break;
                            }
                        }
                    } catch (e) { }
                }
            } catch (e) { }
        }

        songs.forEach(t => this.trackCache.set(t.id, t));

        // Pre-fetch stream for any track missing streamUrl
        songs.slice(0, 5).forEach(t => {
            if (!t.streamUrl) this.prefetchTrackStream(t);
        });

        return songs;
    }

    async searchAll(query) {
        try {
            const songs = await this.searchSongs(query);
            let albums = [];
            let playlists = [];

            // 1. Fetch albums from YouTube Music backend endpoint if available
            try {
                const res = await fetch(`${this.backendUrl}/search/albums?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    const rawAlbums = Array.isArray(data) ? data : (data.results || data.data || []);
                    if (Array.isArray(rawAlbums) && rawAlbums.length > 0) {
                        albums = rawAlbums.map(item => ({
                            id: item.id || item.browseId || `yt_album_${Math.random()}`,
                            title: item.title || item.name || 'Album',
                            artist: item.artist || item.artists?.[0]?.name || 'Various Artists',
                            cover: item.cover || item.thumbnails?.[0]?.url || (songs[0]?.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80'),
                            year: item.year || '',
                            type: 'album',
                            provider: 'YouTube Music',
                            providerId: 'ytmusic'
                        }));
                    }
                }
            } catch (e) {
                console.warn('[YTMusic] Album search endpoint check:', e);
            }

            // 2. Curated album collection from YouTube Music search results if no direct array was returned
            if (albums.length === 0 && songs.length > 0) {
                albums.push({
                    id: `yt_album_${encodeURIComponent(query)}`,
                    title: `${query.charAt(0).toUpperCase() + query.slice(1)} Collection`,
                    artist: songs[0]?.artist || 'YouTube Music',
                    cover: songs[0]?.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
                    type: 'album',
                    provider: 'YouTube Music',
                    providerId: 'ytmusic',
                    tracks: songs
                });
            }

            return { songs, albums, playlists };
        } catch (e) {
            console.error('[YTMusic] searchAll failed:', e);
            return { songs: [], albums: [], playlists: [] };
        }
    }

    async getTrack(trackId) {
        const cached = this.trackCache.get(trackId);
        const videoId = cached?.videoId || trackId.replace('yt_', '');
        const isRawId = (str) => !str || /^[a-zA-Z0-9_-]{11}$/.test(str.trim());

        if (cached && cached.streamUrl && cached._streamTimestamp && (Date.now() - cached._streamTimestamp < 2.5 * 60 * 1000)) {
            return cached;
        }

        const rawTitle = cached?.title || '';
        const rawArtist = cached?.artist || '';
        const titleArtist = (!isRawId(rawTitle) && rawTitle !== 'YouTube Track') ? `${rawTitle} ${rawArtist}`.trim() : '';

        // 1. Direct YouTube Video Audio Stream Resolution via Piped API
        const resolvePipedStream = async () => {
            if (!videoId || isRawId(videoId)) {
                // If videoId is valid 11-char string
                const targetId = videoId || trackId.replace('yt_', '');
                let attempts = 0;
                while (attempts < this.apiInstances.length) {
                    const baseUrl = this.getInstanceUrl();
                    try {
                        const data = await this.fetchWithTimeout(`${baseUrl}/streams/${targetId}`, 3000);
                        if (data) {
                            if (cached && (isRawId(cached.title) || cached.title === 'YouTube Track') && data.title) {
                                cached.title = data.title.replace(/\(Official Audio\)/gi, '').replace(/\(Official Video\)/gi, '').trim();
                                if (data.uploader) cached.artist = data.uploader;
                                if (data.thumbnailUrl) cached.cover = data.thumbnailUrl;
                            }
                            const audioStreams = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                            const bestAudio = audioStreams.find(s => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/m4a')) || audioStreams[0];
                            if (bestAudio?.url) return bestAudio.url;
                        }
                    } catch (e) {
                        this.rotateInstance();
                    }
                    attempts++;
                }
            }
            return null;
        };

        // 2. Secondary Human Title Search Fallback (only if clean human title exists)
        const resolveBackendStream = async () => {
            if (!titleArtist || isRawId(titleArtist)) return null;
            const query = encodeURIComponent(titleArtist);
            const urlsToTry = [
                `${this.backendUrl}/search?q=${query}`,
                `https://vibentra.vercel.app/api/jiosaavn/search?q=${query}`,
                `https://jiosaavn-api-v3.vercel.app/search?q=${query}`
            ];
            for (let u of urlsToTry) {
                try {
                    const response = await fetch(u);
                    if (response.ok) {
                        const data = await response.json();
                        const resultsList = Array.isArray(data) ? data : (data?.data?.results || data?.results || []);
                        if (resultsList && resultsList.length > 0) {
                            const first = resultsList[0];
                            const sUrl = first.streamUrl || (first.downloadUrl && first.downloadUrl.length > 0 ? (typeof first.downloadUrl === 'string' ? first.downloadUrl : first.downloadUrl[first.downloadUrl.length - 1].url) : null);
                            if (sUrl) return sUrl;
                        }
                    }
                } catch (e) { }
            }
            return null;
        };

        // Execute Piped exact audio resolution first, fallback to title search if Piped fails
        let chosenStream = await resolvePipedStream();
        if (!chosenStream && titleArtist) {
            chosenStream = await resolveBackendStream();
        }

        if (chosenStream && cached) {
            cached.streamUrl = chosenStream;
            cached._streamTimestamp = Date.now();
            this.trackCache.set(cached.id, cached);
            return cached;
        }

        if (cached && cached.streamUrl) return cached;

        if (cached) {
            cached.streamUrl = chosenStream || cached.streamUrl || null;
            return cached;
        }

        return {
            id: trackId,
            videoId: videoId,
            title: (!isRawId(rawTitle) && rawTitle !== 'YouTube Track') ? rawTitle : 'YouTube Song',
            artist: rawArtist || 'YouTube Music',
            album: 'YouTube Music',
            cover: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
            duration: '3:30',
            streamUrl: chosenStream || null
        };
    }

    async getLyrics(trackId) {
        return null;
    }
}

