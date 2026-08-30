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

        // Remove if it already exists to put it at the front
        this.history = this.history.filter(t => String(t.id) !== String(track.id));
        this.history.unshift(track);
        // Keep up to 50 recent songs
        if (this.history.length > 50) {
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
}

export const historyService = new HistoryService();
if (typeof window !== 'undefined') {
    window.historyService = historyService;
}
