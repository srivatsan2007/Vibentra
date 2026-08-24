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
        const cleanQuery = encodeURIComponent(query.trim());

        // 1. Try Piped search instances
        try {
            const endpoint = `/search?q=${cleanQuery}&filter=music_songs`;
            const data = await this.fetchWithFallback(endpoint);
            const rawItems = data.items || [];
            const rawSongs = rawItems.filter(item => item.url || item.type === 'stream' || item.type === 'music_song').slice(0, 20);
            
            songs = rawSongs.map(item => {
                const videoId = this.extractVideoId(item.url);
                const title = (item.title || 'YouTube Track').replace(/\(Official Audio\)/gi, '').replace(/\(Official Video\)/gi, '').replace(/\(Lyric Video\)/gi, '').trim();
                const artist = item.uploaderName || item.artist || 'YouTube Music';
                
                return this.standardizeTrack({
                    id: `yt_${videoId || Math.random().toString(36).substring(7)}`,
                    videoId: videoId,
                    title: title,
                    artist: artist,
                    album: 'YouTube Music',
                    cover: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : (item.thumbnail || ''),
                    duration: this.formatDuration(item.duration),
                    streamUrl: `https://inv.tux.pizza/latest_version?id=${videoId}&itag=140`
                });
            });
        } catch (error) {
            console.warn('[YouTube Music] Primary Piped search failed, trying Invidious mirrors:', error.message || error);
        }

        // 2. Secondary fallback: Try Invidious search mirrors if Piped mirrors are offline
        if (songs.length === 0) {
            const invidiousMirrors = [
                'https://inv.tux.pizza/api/v1',
                'https://invidious.nerdvpn.de/api/v1',
                'https://vid.puffyan.us/api/v1'
            ];
            for (let mirror of invidiousMirrors) {
                try {
                    const res = await fetch(`${mirror}/search?q=${cleanQuery}&type=video`);
                    if (res.ok) {
                        const items = await res.json();
                        if (Array.isArray(items) && items.length > 0) {
                            songs = items.slice(0, 20).map(item => {
                                const vId = item.videoId;
                                const title = (item.title || 'YouTube Track').replace(/\(Official Audio\)/gi, '').replace(/\(Official Video\)/gi, '').trim();
                                const artist = item.author || 'YouTube Music';
                                return this.standardizeTrack({
                                    id: `yt_${vId}`,
                                    videoId: vId,
                                    title: title,
                                    artist: artist,
                                    album: 'YouTube Music',
                                    cover: vId ? `https://i.ytimg.com/vi/${vId}/hqdefault.jpg` : '',
                                    duration: this.formatDuration(item.lengthSeconds),
                                    streamUrl: `${mirror.replace('/api/v1', '')}/latest_version?id=${vId}&itag=140`
                                });
                            });
                            break;
                        }
                    }
                } catch (e) { }
            }
        }

        songs.forEach(t => this.trackCache.set(t.id, t));
        return songs;
    }

    async searchAll(query) {
        try {
            const songs = await this.searchSongs(query);
            let albums = [];
            let playlists = [];

            if (songs.length > 0) {
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

        if (cached && cached.streamUrl && cached._streamTimestamp && (Date.now() - cached._streamTimestamp < 2.5 * 60 * 1000)) {
            return cached;
        }

        // Direct YouTube audio streams (Invidious & Piped)
        const audioStreamCandidates = [
            `https://inv.tux.pizza/latest_version?id=${videoId}&itag=140`,
            `https://invidious.nerdvpn.de/latest_version?id=${videoId}&itag=140`,
            `https://vid.puffyan.us/latest_version?id=${videoId}&itag=140`
        ];

        let chosenStream = audioStreamCandidates[0];

        // Verify/fetch via Piped API if available
        try {
            const data = await this.fetchWithTimeout(`${this.getInstanceUrl()}/streams/${videoId}`, 2500);
            if (data && data.audioStreams) {
                const audioStreams = data.audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                const best = audioStreams.find(s => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/m4a')) || audioStreams[0];
                if (best?.url) chosenStream = best.url;
            }
        } catch (e) { }

        if (cached) {
            cached.streamUrl = chosenStream;
            cached._streamTimestamp = Date.now();
            this.trackCache.set(cached.id, cached);
            return cached;
        }

        return this.standardizeTrack({
            id: trackId,
            videoId: videoId,
            title: 'YouTube Track',
            artist: 'YouTube Music',
            album: 'YouTube Music',
            cover: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
            duration: '3:30',
            streamUrl: chosenStream
        });
    }

    async getLyrics(trackId) {
        return null;
    }
}

