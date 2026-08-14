import ProviderInterface from './providerInterface.js';

export default class YouTubeMusicProvider extends ProviderInterface {
    constructor() {
        super('ytmusic', 'YouTube Music');
        
        // Array of fast, reliable public Piped API mirrors for 100% uptime
        this.apiInstances = [
            'https://pipedapi.kavin.rocks',
            'https://api.piped.privacydev.net',
            'https://pipedapi.palvelut.org',
            'https://piped-api.lunar.icu',
            'https://pipedapi.drgns.space'
        ];
        this.currentInstanceIndex = 0;
        this.trackCache = new Map();
    }

    getBaseUrl() {
        return this.apiInstances[this.currentInstanceIndex];
    }

    rotateInstance() {
        this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.apiInstances.length;
        console.warn(`[YouTube Music] Rotated API mirror to: ${this.getBaseUrl()}`);
    }

    async fetchWithFallback(endpoint) {
        let attempts = 0;
        while (attempts < this.apiInstances.length) {
            const baseUrl = this.getBaseUrl();
            try {
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.warn(`[YouTube Music] Failed fetch from ${baseUrl}:`, error);
            }
            this.rotateInstance();
            attempts++;
        }
        throw new Error('All YouTube Music API mirrors failed');
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
            
            const items = data.items || [];
            const songs = items.filter(item => item.type === 'stream' || item.type === 'music_song' || item.url).slice(0, 20);
            
            const standardized = songs.map(item => {
                const videoId = this.extractVideoId(item.url);
                return this.standardizeTrack({
                    id: `yt_${videoId}`,
                    videoId: videoId,
                    title: item.title || 'Unknown Title',
                    artist: item.uploaderName || item.artist || 'YouTube Music',
                    album: 'YouTube Music',
                    cover: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duration: this.formatDuration(item.duration),
                    streamUrl: null // Stream URL will be dynamically resolved in getTrack for freshness
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
        try {
            const endpoint = `/search?q=${encodeURIComponent(query)}&filter=all`;
            const data = await this.fetchWithFallback(endpoint);
            
            const items = data.items || [];
            const songs = items.filter(item => item.type === 'stream' || item.url).slice(0, 15).map(item => {
                const videoId = this.extractVideoId(item.url);
                const track = this.standardizeTrack({
                    id: `yt_${videoId}`,
                    videoId: videoId,
                    title: item.title || 'Unknown Title',
                    artist: item.uploaderName || 'YouTube Music',
                    album: 'YouTube Music',
                    cover: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duration: this.formatDuration(item.duration),
                    streamUrl: null
                });
                this.trackCache.set(track.id, track);
                return track;
            });

            return { songs, albums: [], playlists: [] };
        } catch (error) {
            console.error('[YouTube Music] searchAll error:', error);
            return { songs: [], albums: [], playlists: [] };
        }
    }

    async getTrack(trackId) {
        const cached = this.trackCache.get(trackId);
        const videoId = cached?.videoId || trackId.replace('yt_', '');

        // If we have a cached audio stream URL that is fresh (< 45 mins), use it
        if (cached && cached.streamUrl && cached._streamTimestamp && (Date.now() - cached._streamTimestamp < 45 * 60 * 1000)) {
            return cached;
        }

        try {
            const data = await this.fetchWithFallback(`/streams/${videoId}`);
            
            // Select the highest quality audio-only stream (m4a or webm)
            const audioStreams = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            const bestAudio = audioStreams.find(s => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/m4a')) || audioStreams[0];

            if (!bestAudio || !bestAudio.url) {
                throw new Error('No audio stream found for video');
            }

            const trackInfo = {
                id: `yt_${videoId}`,
                videoId: videoId,
                title: data.title || cached?.title || 'YouTube Track',
                artist: data.uploader || cached?.artist || 'YouTube Music',
                album: 'YouTube Music',
                cover: data.thumbnailUrl || cached?.cover || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: this.formatDuration(data.duration),
                streamUrl: bestAudio.url,
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
