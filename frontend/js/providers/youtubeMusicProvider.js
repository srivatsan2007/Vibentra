import ProviderInterface from './providerInterface.js';

export default class YouTubeMusicProvider extends ProviderInterface {
    constructor() {
        super('ytmusic', 'YouTube Music');
        
        // Fast, active YouTube Music search API endpoints
        this.apiInstances = [
            'https://api.piped.private.coffee',
            'https://pipedapi.kavin.rocks',
            'https://api.piped.privacydev.net',
            'https://pipedapi.drgns.space'
        ];
        this.currentInstanceIndex = 0;
        this.trackCache = new Map();
        
        // Base backend URL for audio stream resolving fallback
        if (typeof window !== 'undefined') {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('10.')) {
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

    async fetchWithTimeout(url, timeoutMs = 4000) {
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
                const data = await this.fetchWithTimeout(`${baseUrl}${endpoint}`, 4000);
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

    async searchSongs(query) {
        try {
            const endpoint = `/search?q=${encodeURIComponent(query)}&filter=music_songs`;
            const data = await this.fetchWithFallback(endpoint);
            
            const rawItems = data.items || [];
            const songs = rawItems.filter(item => item.url || item.type === 'stream' || item.type === 'music_song').slice(0, 20);
            
            const standardized = songs.map(item => {
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
                    streamUrl: null // Resolved on demand when user clicks play
                });
            });

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

        if (cached && cached.streamUrl && cached._streamTimestamp && (Date.now() - cached._streamTimestamp < 40 * 60 * 1000)) {
            return cached;
        }

        // Try resolving stream from YouTube Piped stream endpoint
        try {
            const data = await this.fetchWithFallback(`/streams/${videoId}`);
            const audioStreams = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            const bestAudio = audioStreams.find(s => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/m4a')) || audioStreams[0];

            if (bestAudio && bestAudio.url) {
                const trackInfo = {
                    id: `yt_${videoId}`,
                    videoId: videoId,
                    title: data.title || cached?.title || 'YouTube Track',
                    artist: data.uploader || cached?.artist || 'YouTube Music',
                    album: 'YouTube Music',
                    cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duration: this.formatDuration(data.duration),
                    streamUrl: bestAudio.url,
                    _streamTimestamp: Date.now()
                };
                const standardized = this.standardizeTrack(trackInfo);
                this.trackCache.set(standardized.id, standardized);
                return standardized;
            }
        } catch (error) {
            console.warn('[YouTube Music] Piped direct stream failed, attempting audio resolver fallback...', error);
        }

        // Fallback: Resolve high quality ad-free audio stream using track title & artist
        if (cached) {
            try {
                const searchUrl = `${this.backendUrl}/search?q=${encodeURIComponent(`${cached.title} ${cached.artist}`)}`;
                const response = await fetch(searchUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0 && data[0].streamUrl) {
                        cached.streamUrl = data[0].streamUrl;
                        cached._streamTimestamp = Date.now();
                        this.trackCache.set(cached.id, cached);
                        return cached;
                    }
                }
            } catch (fallbackError) {
                console.error('[YouTube Music] Stream fallback error:', fallbackError);
            }
            return cached;
        }

        throw new Error('Could not resolve audio stream for track');
    }

    async getLyrics(trackId) {
        return null;
    }
}
