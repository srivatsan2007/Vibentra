import ProviderInterface from './providerInterface.js';

export default class YouTubeMusicProvider extends ProviderInterface {
    constructor() {
        super('ytmusic', 'YouTube Music');
        
        // Fast, high-availability public Invidious & Piped API mirrors with CORS support
        this.apiInstances = [
            { type: 'invidious', url: 'https://invidious.nerdvpn.de' },
            { type: 'invidious', url: 'https://vid.puffyan.us' },
            { type: 'invidious', url: 'https://inv.privacydev.net' },
            { type: 'piped', url: 'https://pipedapi.kavin.rocks' },
            { type: 'piped', url: 'https://api.piped.privacydev.net' }
        ];
        this.currentInstanceIndex = 0;
        this.trackCache = new Map();
    }

    getInstance() {
        return this.apiInstances[this.currentInstanceIndex];
    }

    rotateInstance() {
        this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.apiInstances.length;
    }

    async fetchWithTimeout(url, timeoutMs = 3500) {
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

    async fetchWithFallback(buildEndpointFn) {
        let attempts = 0;
        while (attempts < this.apiInstances.length) {
            const instance = this.getInstance();
            const endpoint = buildEndpointFn(instance);
            const fullUrl = `${instance.url}${endpoint}`;

            try {
                const data = await this.fetchWithTimeout(fullUrl, 3500);
                if (data) return { data, instance };
            } catch (error) {
                console.warn(`[YouTube Music] Mirror failed (${instance.url}):`, error.message || error);
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

    async searchSongs(query) {
        try {
            const { data, instance } = await this.fetchWithFallback((inst) => {
                return inst.type === 'invidious' 
                    ? `/api/v1/search?q=${encodeURIComponent(query)}&type=video`
                    : `/search?q=${encodeURIComponent(query)}&filter=music_songs`;
            });

            let items = [];
            if (instance.type === 'invidious') {
                items = (Array.isArray(data) ? data : []).slice(0, 15).map(item => {
                    const videoId = item.videoId;
                    return {
                        id: `yt_${videoId}`,
                        videoId: videoId,
                        title: item.title || 'Unknown Track',
                        artist: item.author || 'YouTube Artist',
                        album: 'YouTube Music',
                        cover: item.videoThumbnails?.find(t => t.quality === 'medium' || t.quality === 'high')?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                        duration: this.formatDuration(item.lengthSeconds),
                        streamUrl: null
                    };
                });
            } else {
                const pipedItems = data.items || [];
                items = pipedItems.filter(item => item.type === 'stream' || item.url).slice(0, 15).map(item => {
                    const videoId = this.extractVideoId(item.url);
                    return {
                        id: `yt_${videoId}`,
                        videoId: videoId,
                        title: item.title || 'Unknown Track',
                        artist: item.uploaderName || 'YouTube Artist',
                        album: 'YouTube Music',
                        cover: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                        duration: this.formatDuration(item.duration),
                        streamUrl: null
                    };
                });
            }

            const standardized = items.map(trackData => this.standardizeTrack(trackData));
            standardized.forEach(t => this.trackCache.set(t.id, t));
            return standardized;
        } catch (error) {
            console.error('[YouTube Music] Search error:', error);
            return [];
        }
    }

    async searchAll(query) {
        const songs = await this.searchSongs(query);
        return { songs, albums: [], playlists: [] };
    }

    async getTrack(trackId) {
        const cached = this.trackCache.get(trackId);
        const videoId = cached?.videoId || trackId.replace('yt_', '');

        // If we already have a cached audio stream URL that is fresh (< 40 mins), use it
        if (cached && cached.streamUrl && cached._streamTimestamp && (Date.now() - cached._streamTimestamp < 40 * 60 * 1000)) {
            return cached;
        }

        try {
            const { data, instance } = await this.fetchWithFallback((inst) => {
                return inst.type === 'invidious' 
                    ? `/api/v1/videos/${videoId}`
                    : `/streams/${videoId}`;
            });

            let bestAudioUrl = null;

            if (instance.type === 'invidious') {
                const formats = [...(data.adaptiveFormats || []), ...(data.formatStreams || [])];
                const audioFormats = formats.filter(f => f.type?.includes('audio') || f.container === 'm4a' || f.container === 'webm');
                audioFormats.sort((a, b) => (parseInt(b.bitrate || 0) - parseInt(a.bitrate || 0)));
                bestAudioUrl = audioFormats[0]?.url;
            } else {
                const audioStreams = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                const bestAudio = audioStreams.find(s => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/m4a')) || audioStreams[0];
                bestAudioUrl = bestAudio?.url;
            }

            if (!bestAudioUrl) {
                throw new Error('No valid audio stream found');
            }

            const trackInfo = {
                id: `yt_${videoId}`,
                videoId: videoId,
                title: data.title || cached?.title || 'YouTube Track',
                artist: data.author || data.uploader || cached?.artist || 'YouTube Artist',
                album: 'YouTube Music',
                cover: data.videoThumbnails?.find(t => t.quality === 'medium')?.url || cached?.cover || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: this.formatDuration(data.lengthSeconds || data.duration),
                streamUrl: bestAudioUrl,
                _streamTimestamp: Date.now()
            };

            const standardized = this.standardizeTrack(trackInfo);
            this.trackCache.set(standardized.id, standardized);
            return standardized;
        } catch (error) {
            console.error('[YouTube Music] getTrack audio stream error:', error);
            if (cached) return cached;
            throw error;
        }
    }

    async getLyrics(trackId) {
        return null;
    }
}
