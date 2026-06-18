import providerManager from '../providers/providerManager.js';

class SearchService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Search across all active providers with caching
     */
    async searchSongs(query) {
        if (!query.trim()) return [];

        const cacheKey = `song_${query.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const results = await providerManager.searchSongs(query);
            this.cache.set(cacheKey, results);
            
            // Clear cache after 5 minutes
            setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
            
            return results;
        } catch (error) {
            console.error("Search Service Error:", error);
            return [];
        }
    }
    async searchAll(query) {
        if (!query.trim()) return { songs: [], albums: [], playlists: [] };

        const cacheKey = `all_${query.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const results = await providerManager.searchAll(query);
            this.cache.set(cacheKey, results);
            
            // Clear cache after 5 minutes
            setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
            
            return results;
        } catch (error) {
            console.error("Search Service Error:", error);
            return { songs: [], albums: [], playlists: [] };
        }
    }
}

export const searchService = new SearchService();
