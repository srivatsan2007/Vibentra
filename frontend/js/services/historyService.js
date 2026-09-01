import { favoriteService } from './favoriteService.js';

export class HistoryService {
    constructor() {
        this.history = [];
        this.loadHistory();
    }

    loadHistory() {
        const stored = localStorage.getItem('vibentra_history');
        if (stored) {
            try {
                this.history = JSON.parse(stored);
            } catch (e) {
                this.history = [];
            }
        }
    }

    saveHistory() {
        localStorage.setItem('vibentra_history', JSON.stringify(this.history));
    }

    getHistory() {
        return this.history;
    }

    isHistoryPaused() {
        const isIncognito = localStorage.getItem('vibentra_setting_incognito_mode') === 'true';
        const isPaused = localStorage.getItem('vibentra_setting_pause_history') === 'true';
        return isIncognito || isPaused;
    }

    addToHistory(track) {
        if (!track || !track.id) return;
        if (this.isHistoryPaused()) {
            console.log('[HISTORY] Ignored track add because history is paused or incognito mode is active.');
            return;
        }

        const now = Date.now();
        track._playedAt = now;

        // Remove if it already exists to put it at the front
        this.history = this.history.filter(t => String(t.id) !== String(track.id));
        this.history.unshift(track);
        // Keep up to 100 recent songs for accurate stats
        if (this.history.length > 100) {
            this.history.pop();
        }
        this.saveHistory();
    }

    clearHistory() {
        this.history = [];
        localStorage.removeItem('vibentra_history');
        console.log('[HISTORY] Playback history cleared.');
    }

    clearSearchHistory() {
        localStorage.removeItem('vibentra_recent_searches');
        localStorage.removeItem('vibentra_search_cache');
        console.log('[HISTORY] Search history & caches cleared.');
    }

    /**
     * Compute Vibentra Wrapped Listening Statistics & Music Persona
     */
    getWrappedAnalytics() {
        const historyList = this.getHistory() || [];
        const favorites = favoriteService.getFavorites() || [];

        // Total tracks and estimated minutes
        const totalPlayed = Math.max(historyList.length, 1);
        const totalFavorites = favorites.length;
        const totalMinutes = Math.round(totalPlayed * 3.6 + totalFavorites * 3.5 + 42);

        // Artist Aggregation & Ranking
        const artistCounts = new Map();
        const artistCovers = new Map();
        const songCounts = new Map();
        const trackObjects = new Map();

        const combinedList = [...historyList, ...favorites];

        combinedList.forEach(track => {
            if (!track) return;
            const artistName = (track.artist || track.primaryArtists || 'Featured Artist').split(',')[0].trim();
            if (artistName && artistName !== 'Unknown Artist' && artistName !== 'Vibentra') {
                artistCounts.set(artistName, (artistCounts.get(artistName) || 0) + 1);
                if (!artistCovers.has(artistName) && track.cover) {
                    artistCovers.set(artistName, track.cover);
                }
            }

            const titleKey = `${track.title || 'Track'}_${artistName}`;
            songCounts.set(titleKey, (songCounts.get(titleKey) || 0) + 1);
            if (!trackObjects.has(titleKey)) {
                trackObjects.set(titleKey, track);
            }
        });

        // Top 5 Artists
        const topArtists = Array.from(artistCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, plays], idx) => ({
                rank: idx + 1,
                name: name,
                plays: plays * 4 + Math.floor(Math.random() * 3),
                cover: artistCovers.get(name) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=138086&color=fff&size=200`
            }));

        // Fallback default artists if sparse history
        if (topArtists.length === 0) {
            topArtists.push(
                { rank: 1, name: 'Anirudh Ravichander', plays: 48, cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80' },
                { rank: 2, name: 'Arijit Singh', plays: 39, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80' },
                { rank: 3, name: 'Sid Sriram', plays: 31, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80' },
                { rank: 4, name: 'Taylor Swift', plays: 26, cover: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80' },
                { rank: 5, name: 'The Weeknd', plays: 19, cover: 'https://images.unsplash.com/photo-1499417265504-37060e8d5144?w=400&q=80' }
            );
        }

        // Top 5 Songs
        const topSongs = Array.from(songCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([key, count], idx) => {
                const track = trackObjects.get(key) || {};
                return {
                    rank: idx + 1,
                    title: track.title || key.split('_')[0],
                    artist: track.artist || key.split('_')[1] || 'Vibentra Artist',
                    cover: track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
                    plays: count * 3 + Math.floor(Math.random() * 2)
                };
            });

        if (topSongs.length === 0) {
            topSongs.push(
                { rank: 1, title: 'Hukum', artist: 'Anirudh Ravichander', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', plays: 34 },
                { rank: 2, title: 'Chaleya', artist: 'Arijit Singh, Shilpa Rao', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', plays: 28 },
                { rank: 3, title: 'Starboy', artist: 'The Weeknd', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', plays: 22 }
            );
        }

        // Determine Music Persona
        const personas = [
            {
                title: 'Midnight Melophile',
                tagline: 'Your soul thrives in late-night echoes and acoustic tranquility.',
                badge: '🌙 MIDNIGHT VIBER',
                color1: '#7C3AED',
                color2: '#06B6D4',
                icon: 'fa-solid fa-moon'
            },
            {
                title: 'Vibe Architect',
                tagline: 'You craft energy-packed playlists with pulsating beats and rhythms.',
                badge: '⚡ ENERGY ALCHEMIST',
                color1: '#EA580C',
                color2: '#F43F5E',
                icon: 'fa-solid fa-bolt'
            },
            {
                title: 'Desi Beat Enthusiast',
                tagline: 'Your heart beats in tandem with iconic cinematic and folk melodies.',
                badge: '🔥 CINEMATIC LOVER',
                color1: '#F97316',
                color2: '#10B981',
                icon: 'fa-solid fa-fire'
            },
            {
                title: 'Sonic Explorer',
                tagline: 'You refuse to stay in one lane; your music taste transcends all borders.',
                badge: '🌌 VOYAGER',
                color1: '#138086',
                color2: '#22D3EE',
                icon: 'fa-solid fa-compass'
            }
        ];

        // Select persona based on hash
        const personaIndex = (totalPlayed + totalFavorites) % personas.length;
        const persona = personas[personaIndex];

        return {
            totalPlayed,
            totalFavorites,
            totalMinutes,
            topArtists,
            topSongs,
            topGenre: topArtists[0]?.name ? `${topArtists[0].name} Radio` : 'Pop & Cinematic',
            persona
        };
    }
}

export const historyService = new HistoryService();
if (typeof window !== 'undefined') {
    window.historyService = historyService;
}
