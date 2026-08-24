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

    async withTimeout(promise, ms = 6500, fallbackValue = null) {
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
                activeProviders.map(p => this.withTimeout(p.searchSongs(query), 8500, []))
            );

            const providerLists = [];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && Array.isArray(result.value) && result.value.length > 0) {
                    providerLists.push(result.value);
                } else if (result.status === 'rejected') {
                    console.error(`Provider ${activeProviders[index]?.name} failed or timed out:`, result.reason);
                }
            });

            // Interleave provider results so YouTube Music and JioSaavn suggestions appear side-by-side
            return this.interleaveArrays(providerLists);
        } catch (error) {
            console.error("Unified search failed", error);
            return [];
        }
    }

    interleaveArrays(arrays) {
        const result = [];
        const maxLength = Math.max(...arrays.map(a => (a ? a.length : 0)), 0);
        for (let i = 0; i < maxLength; i++) {
            for (let arr of arrays) {
                if (arr && i < arr.length) {
                    result.push(arr[i]);
                }
            }
        }
        return result;
    }

    async searchAll(query) {
        const activeProviders = this.getAllProviders().filter(p => p.enabled);

        try {
            const results = await Promise.allSettled(
                activeProviders.map(p => {
                    if (!p.searchAll) return Promise.resolve({ songs: [], albums: [], playlists: [] });
                    return this.withTimeout(p.searchAll(query), 8500, { songs: [], albums: [], playlists: [] });
                })
            );

            const songLists = [];
            const albumLists = [];
            const playlistLists = [];

            results.forEach(res => {
                if (res.status === 'fulfilled' && res.value) {
                    if (Array.isArray(res.value.songs) && res.value.songs.length > 0) songLists.push(res.value.songs);
                    if (Array.isArray(res.value.albums) && res.value.albums.length > 0) albumLists.push(res.value.albums);
                    if (Array.isArray(res.value.playlists) && res.value.playlists.length > 0) playlistLists.push(res.value.playlists);
                }
            });

            return {
                songs: this.interleaveArrays(songLists),
                albums: this.interleaveArrays(albumLists),
                playlists: this.interleaveArrays(playlistLists)
            };
        } catch (error) {
            console.error("Unified searchAll failed", error);
            return { songs: [], albums: [], playlists: [] };
        }
    }

    async getAlbum(providerId, albumId) {
        const pId = (providerId === 'youtube' || providerId === 'ytmusic') ? 'ytmusic' : providerId;
        const provider = this.getProvider(pId);
        if (!provider || !provider.enabled || !provider.getAlbum) return [];
        return await provider.getAlbum(albumId);
    }

    async getPlaylist(providerId, playlistId) {
        const pId = (providerId === 'youtube' || providerId === 'ytmusic') ? 'ytmusic' : providerId;
        const provider = this.getProvider(pId);
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
