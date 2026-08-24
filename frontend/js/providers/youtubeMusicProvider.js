import ProviderInterface from './providerInterface.js';

export default class YouTubeMusicProvider extends ProviderInterface {
    constructor() {
        super('ytmusic', 'YouTube Music');
        
        this.apiInstances = [
            'https://api.piped.private.coffee',
            'https://pipedapi.kavin.rocks',
            'https://pipedapi.lunar.icu',
            'https://pipedapi.drgns.space'
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

    async fetchWithTimeout(url, timeoutMs = 3000) {
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

    standardizeTrack(trackData) {
        const id = trackData.id ? (String(trackData.id).startsWith('yt_') ? String(trackData.id) : `yt_${trackData.id}`) : `yt_${Math.random().toString(36).substring(7)}`;
        const videoId = trackData.videoId || (id ? id.replace('yt_', '') : null);
        return {
            id: id,
            videoId: videoId,
            title: trackData.title || 'YouTube Track',
            artist: trackData.artist || 'YouTube Music',
            album: trackData.album || 'YouTube Music',
            cover: trackData.cover || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'),
            duration: trackData.duration || '3:30',
            streamUrl: trackData.streamUrl || null,
            provider: 'YouTube Music',
            providerId: 'ytmusic'
        };
    }

    async prefetchTrackStream(track) {
        if (!track || track.streamUrl) return;
        try {
            const query = encodeURIComponent(`${track.title} ${track.artist}`);
            const urlsToTry = [
                `https://vibentra.vercel.app/api/jiosaavn/search?q=${query}`,
                `${this.backendUrl}/search?q=${query}`,
                `https://saavn.me/search/songs?query=${query}`
            ];
            for (let u of urlsToTry) {
                try {
                    const res = await fetch(u);
                    if (res.ok) {
                        const data = await res.json();
                        const list = Array.isArray(data) ? data : (data?.data?.results || data?.results || []);
                        if (list && list.length > 0) {
                            const first = list[0];
                            const sUrl = first.streamUrl || (first.downloadUrl && first.downloadUrl.length > 0 ? (typeof first.downloadUrl === 'string' ? first.downloadUrl : first.downloadUrl[first.downloadUrl.length - 1].url) : null);
                            if (sUrl) {
                                track.streamUrl = sUrl;
                                track._streamTimestamp = Date.now();
                                this.trackCache.set(track.id, track);
                                break;
                            }
                        }
                    }
                } catch (e) { }
            }
        } catch (e) {}
    }

    async searchSongs(query) {
        if (!query || !query.trim()) return [];
        let songs = [];
        const cleanQuery = encodeURIComponent(query.trim());

        const searchPromises = [
            // Piped mirrors
            ...this.apiInstances.map(inst => 
                this.fetchWithTimeout(`${inst}/search?q=${cleanQuery}&filter=music_songs`, 3000)
                    .then(data => {
                        const rawItems = data?.items || [];
                        const rawSongs = rawItems.filter(item => item.url || item.type === 'stream' || item.type === 'music_song').slice(0, 20);
                        if (rawSongs.length === 0) return null;
                        return rawSongs.map(item => {
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
                                streamUrl: null
                            });
                        });
                    }).catch(() => null)
            ),
            // Fast guaranteed Vercel search route for YouTube Music
            fetch(`https://vibentra.vercel.app/api/jiosaavn/search?q=${cleanQuery}`, { headers: { 'Accept': 'application/json' } })
                .then(r => r.ok ? r.json() : null)
                .then(json => {
                    const list = Array.isArray(json) ? json : (json?.data?.results || json?.results || []);
                    if (!list || list.length === 0) return null;
                    return list.slice(0, 20).map(item => {
                        const sUrl = item.streamUrl || (item.downloadUrl && item.downloadUrl.length > 0 ? (typeof item.downloadUrl === 'string' ? item.downloadUrl : item.downloadUrl[item.downloadUrl.length - 1].url) : null);
                        return this.standardizeTrack({
                            id: `yt_${item.id || Math.random().toString(36).substring(7)}`,
                            videoId: item.id,
                            title: item.title || item.name || 'YouTube Track',
                            artist: item.artist || item.primaryArtists || 'YouTube Music',
                            album: 'YouTube Music',
                            cover: (item.image && item.image.length > 0 ? (typeof item.image === 'string' ? item.image : item.image[item.image.length - 1].url) : '') || item.cover || '',
                            duration: typeof item.duration === 'number' ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : (item.duration || '3:30'),
                            streamUrl: sUrl
                        });
                    });
                }).catch(() => null)
        ];

        const results = await Promise.allSettled(searchPromises);
        const validTrackLists = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) {
                validTrackLists.push(res.value);
            }
        });

        // Deduplicate tracks by title
        const seenTitles = new Set();
        songs = [];
        for (let trackList of validTrackLists) {
            for (let track of trackList) {
                const normKey = track.title.toLowerCase().trim();
                if (!seenTitles.has(normKey)) {
                    seenTitles.add(normKey);
                    songs.push(track);
                }
            }
        }

        songs.forEach(t => this.trackCache.set(t.id, t));

        // Background stream pre-fetching for top tracks missing streamUrl
        songs.slice(0, 5).forEach(t => {
            if (!t.streamUrl) this.prefetchTrackStream(t);
        });

        return songs;
    }

    async searchPlaylists(query) {
        if (!query || !query.trim()) return [];
        const cleanQuery = encodeURIComponent(query.trim());
        let playlists = [];

        const searchPromises = this.apiInstances.map(inst =>
            this.fetchWithTimeout(`${inst}/search?q=${cleanQuery}&filter=music_playlists`, 3000)
                .then(data => {
                    const items = data?.items || [];
                    const playlistItems = items.filter(item => item.type === 'playlist' || item.type === 'music_playlist' || (item.url && item.url.includes('list=')));
                    if (playlistItems.length === 0) return null;
                    return playlistItems.map(item => {
                        const url = item.url || '';
                        const listMatch = url.match(/list=([a-zA-Z0-9_-]+)/);
                        const plId = listMatch ? listMatch[1] : (item.id || item.playlistId || url.replace('/playlist?list=', ''));
                        return {
                            id: `yt_pl_${plId}`,
                            playlistId: plId,
                            title: item.title ? item.title.replace(/\(Official Audio\)/gi, '').replace(/\(Official Video\)/gi, '').trim() : `${query} Mix`,
                            artist: item.uploaderName || item.artist || 'YouTube Music',
                            cover: item.thumbnail || (plId ? `https://i.ytimg.com/vi/${plId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'),
                            type: 'playlist',
                            provider: 'YouTube Music',
                            providerId: 'ytmusic',
                            searchQuery: query
                        };
                    });
                }).catch(() => null)
        );

        const results = await Promise.allSettled(searchPromises);
        results.forEach(res => {
            if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) {
                playlists.push(...res.value);
            }
        });

        // Deduplicate playlists by title
        const seenTitles = new Set();
        const uniquePlaylists = [];
        for (let pl of playlists) {
            const key = pl.title.toLowerCase().trim();
            if (!seenTitles.has(key)) {
                seenTitles.add(key);
                uniquePlaylists.push(pl);
            }
        }

        // Guarantee YouTube Music playlists for searches like "Tamil 90's hits", "Illayaraja hits", "AR Rahman hits"
        const formattedTitle = query.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        uniquePlaylists.push({
            id: `yt_pl_${encodeURIComponent(query.trim())}`,
            playlistId: null,
            title: `${formattedTitle} - YouTube Music Mix`,
            artist: 'YouTube Music',
            cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
            type: 'playlist',
            provider: 'YouTube Music',
            providerId: 'ytmusic',
            searchQuery: query
        });

        return uniquePlaylists;
    }

    async searchAll(query) {
        try {
            const songs = await this.searchSongs(query);
            let albums = [];
            let playlists = await this.searchPlaylists(query);

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
                
                // If playlist cover can be improved using top song cover
                if (playlists && playlists.length > 0 && songs[0]?.cover) {
                    playlists.forEach(pl => {
                        if (pl.cover.includes('unsplash')) pl.cover = songs[0].cover;
                    });
                }
            }

            return { songs, albums, playlists };
        } catch (e) {
            console.error('[YTMusic] searchAll failed:', e);
            return { songs: [], albums: [], playlists: [] };
        }
    }

    async getTrack(trackId) {
        const cached = this.trackCache.get(trackId);
        const videoId = cached?.videoId || (typeof trackId === 'string' ? trackId.replace('yt_', '') : '');

        if (cached && cached.streamUrl && cached._streamTimestamp && (Date.now() - cached._streamTimestamp < 2.5 * 60 * 1000)) {
            return cached;
        }

        const isRawVideoId = (str) => !str || /^[a-zA-Z0-9_-]{11}$/.test(str.trim());
        const titleArtist = (cached && cached.title && !isRawVideoId(cached.title) && cached.title !== 'YouTube Track') ? `${cached.title} ${cached.artist !== 'YouTube Music' ? cached.artist : ''}`.trim() : '';

        // Concurrent ultra-fast audio stream resolution
        const resolveBackendStream = async () => {
            if (!titleArtist) return null;
            const query = encodeURIComponent(titleArtist);
            const urlsToTry = [
                `https://vibentra.vercel.app/api/jiosaavn/search?q=${query}`,
                `${this.backendUrl}/search?q=${query}`,
                `https://saavn.me/search/songs?query=${query}`
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

        const resolvePipedStream = async () => {
            if (!videoId || videoId.length !== 11) return null;
            for (let instance of this.apiInstances) {
                try {
                    const data = await this.fetchWithTimeout(`${instance}/streams/${videoId}`, 2000);
                    if (data && data.audioStreams && data.audioStreams.length > 0) {
                        if (cached && (isRawVideoId(cached.title) || cached.title === 'YouTube Track') && data.title) {
                            cached.title = data.title.replace(/\(Official Audio\)/gi, '').replace(/\(Official Video\)/gi, '').trim();
                            if (data.uploader) cached.artist = data.uploader;
                        }
                        const audioStreams = data.audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                        const bestAudio = audioStreams.find(s => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/m4a')) || audioStreams[0];
                        if (bestAudio?.url) return bestAudio.url;
                    }
                } catch(e) {}
            }
            return null;
        };

        // Execute fast stream resolvers in parallel
        const [pipedStream, fastStream] = await Promise.all([
            resolvePipedStream(),
            resolveBackendStream()
        ]);

        let chosenStream = pipedStream || fastStream;

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

        return this.standardizeTrack({
            id: trackId,
            videoId: videoId,
            title: titleArtist || 'YouTube Track',
            artist: 'YouTube Music',
            album: 'YouTube Music',
            cover: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '',
            duration: '3:30',
            streamUrl: chosenStream || null
        });
    }

    async getAlbum(albumId) { return []; }

    async getPlaylist(playlistId) {
        if (!playlistId) return [];

        let rawPlId = String(playlistId).replace('yt_pl_essentials_', '').replace('yt_pl_', '');
        let decodedQuery = null;
        try {
            decodedQuery = decodeURIComponent(rawPlId);
        } catch(e) {
            decodedQuery = rawPlId;
        }

        if (rawPlId.startsWith('PL') || rawPlId.startsWith('RD') || rawPlId.startsWith('OLAK5uy')) {
            for (let inst of this.apiInstances) {
                try {
                    const data = await this.fetchWithTimeout(`${inst}/playlists/${rawPlId}`, 3500);
                    const streams = data?.relatedStreams || data?.items || [];
                    if (streams && streams.length > 0) {
                        const tracks = streams.map(item => {
                            const videoId = this.extractVideoId(item.url || item.id);
                            const title = (item.title || 'YouTube Track').replace(/\(Official Audio\)/gi, '').replace(/\(Official Video\)/gi, '').trim();
                            return this.standardizeTrack({
                                id: `yt_${videoId || Math.random().toString(36).substring(7)}`,
                                videoId: videoId,
                                title: title,
                                artist: item.uploaderName || item.artist || 'YouTube Music',
                                album: 'YouTube Music Playlist',
                                cover: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : (item.thumbnail || ''),
                                duration: this.formatDuration(item.duration),
                                streamUrl: null
                            });
                        });
                        tracks.forEach(t => this.trackCache.set(t.id, t));
                        return tracks;
                    }
                } catch (e) {}
            }
        }

        const searchQuery = decodedQuery || 'top hits';
        const songs = await this.searchSongs(searchQuery);
        return songs;
    }

    async searchArtists(query) { return []; }
    async getLyrics(trackId) { return null; }
}
