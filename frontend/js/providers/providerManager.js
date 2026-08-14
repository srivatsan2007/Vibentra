import JioSaavnProvider from './jiosaavnProvider.js';
import YouTubeMusicProvider from './youtubeMusicProvider.js';
import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class ProviderManager {
    constructor() {
        this.providers = new Map();
        
        const jiosaavn = new JioSaavnProvider();
        const youtube = new YouTubeMusicProvider();

        // Register available providers
        this.register(jiosaavn);
        this.register(youtube);

        // Enable providers by default
        jiosaavn.enabled = true;
        youtube.enabled = true;
    }

    register(provider) {
        this.providers.set(provider.id, provider);
        console.log(`Registered Music Provider: ${provider.name}`);
    }

    getProvider(providerId) {
        return this.providers.get(providerId);
    }

    getAllProviders() {
        return Array.from(this.providers.values());
    }

    async loadProviderSettings() {
        // Load settings from Firebase if user is logged in, else defaults
        try {
            // Simplified for MVP. In reality, we'd fetch for specific user or global admin settings
            for (let [id, provider] of this.providers.entries()) {
                // Mock checking Firebase. We'll default to enabled.
                provider.enabled = true;
            }
        } catch (error) {
            console.error("Error loading provider settings", error);
        }
    }

    async saveProviderSettings(providerId, enabled) {
        const provider = this.getProvider(providerId);
        if (provider) {
            provider.enabled = enabled;
            // Optionally save to Firebase
            try {
                if (db) {
                    await setDoc(doc(db, "providerSettings", providerId), {
                        providerName: provider.name,
                        enabled: enabled,
                        lastUpdated: new Date().toISOString()
                    }, { merge: true });
                }
            } catch (error) {
                console.error("Error saving provider settings", error);
            }
        }
    }

    async withTimeout(promise, ms = 4500, fallbackValue = null) {
        let timeoutId;
        const timeoutPromise = new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve(fallbackValue), ms);
        });
        return Promise.race([
            promise.then(res => { clearTimeout(timeoutId); return res; }),
            timeoutPromise
        ]);
    }

    async searchSongs(query) {
        const activeProviders = this.getAllProviders().filter(p => p.enabled);
        
        try {
            const results = await Promise.allSettled(
                activeProviders.map(p => this.withTimeout(p.searchSongs(query), 4500, []))
            );

            let unifiedList = [];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                    unifiedList = unifiedList.concat(result.value);
                } else {
                    console.error(`Provider ${activeProviders[index]?.name} failed or timed out:`, result.reason);
                }
            });

            return unifiedList;
        } catch (error) {
            console.error("Unified search failed", error);
            return [];
        }
    }

    async searchAll(query) {
        const activeProviders = this.getAllProviders().filter(p => p.enabled);
        let unifiedSongs = [];
        let unifiedAlbums = [];
        let unifiedPlaylists = [];

        try {
            const results = await Promise.allSettled(
                activeProviders.map(p => {
                    if (!p.searchAll) return Promise.resolve({ songs: [], albums: [], playlists: [] });
                    return this.withTimeout(p.searchAll(query), 4500, { songs: [], albums: [], playlists: [] });
                })
            );

            results.forEach(res => {
                if (res.status === 'fulfilled' && res.value) {
                    if (res.value.songs) unifiedSongs = unifiedSongs.concat(res.value.songs);
                    if (res.value.albums) unifiedAlbums = unifiedAlbums.concat(res.value.albums);
                    if (res.value.playlists) unifiedPlaylists = unifiedPlaylists.concat(res.value.playlists);
                }
            });
            return { songs: unifiedSongs, albums: unifiedAlbums, playlists: unifiedPlaylists };
        } catch (error) {
            console.error("Unified searchAll failed", error);
            return { songs: [], albums: [], playlists: [] };
        }
    }

    async getAlbum(providerId, albumId) {
        const provider = this.getProvider(providerId);
        if (!provider || !provider.enabled || !provider.getAlbum) return [];
        return await provider.getAlbum(albumId);
    }

    async getPlaylist(providerId, playlistId) {
        const provider = this.getProvider(providerId);
        if (!provider || !provider.enabled || !provider.getPlaylist) return [];
        return await provider.getPlaylist(playlistId);
    }

    // Pass-through for getting a specific track
    async getTrack(providerId, trackId) {
        const provider = this.getProvider(providerId);
        if (!provider || !provider.enabled) throw new Error("Provider not available");
        return await provider.getTrack(trackId);
    }

    async getLyrics(providerId, trackId) {
        const provider = this.getProvider(providerId);
        if (!provider || !provider.enabled || !provider.getLyrics) return null;
        return await provider.getLyrics(trackId);
    }
}

// Export a singleton instance
const providerManager = new ProviderManager();
export default providerManager;
