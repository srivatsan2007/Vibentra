import JioSaavnProvider from './jiosaavnProvider.js';
import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class ProviderManager {
    constructor() {
        this.providers = new Map();
        
        const jiosaavn = new JioSaavnProvider();

        // Register available providers
        this.register(jiosaavn);

        // JioSaavn enabled by default
        jiosaavn.enabled = true;
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

    async searchSongs(query) {
        const activeProviders = this.getAllProviders().filter(p => p.enabled);
        
        try {
            // Promise.allSettled ensures one failed provider doesn't crash the whole search
            const results = await Promise.allSettled(
                activeProviders.map(provider => provider.searchSongs(query))
            );

            let unifiedList = [];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    unifiedList = unifiedList.concat(result.value);
                } else {
                    console.error(`Provider ${activeProviders[index].name} failed:`, result.reason);
                }
            });

            // Optional: Shuffle or rank results to mix providers
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
                activeProviders.map(p => p.searchAll ? p.searchAll(query) : null).filter(Boolean)
            );

            results.forEach(res => {
                if (res.status === 'fulfilled') {
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
