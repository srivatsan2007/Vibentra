export class HistoryService {
    constructor() {
        this.history = [];
        this.loadHistory();
    }

    loadHistory() {
        const stored = localStorage.getItem('vibentra_history');
        if (stored) {
            this.history = JSON.parse(stored);
        }
    }

    saveHistory() {
        localStorage.setItem('vibentra_history', JSON.stringify(this.history));
    }

    getHistory() {
        return this.history;
    }

    addToHistory(track) {
        // Remove if it already exists to put it at the front
        this.history = this.history.filter(t => t.id !== track.id);
        this.history.unshift(track);
        // Keep only top 20 recent songs
        if (this.history.length > 20) {
            this.history.pop();
        }
        this.saveHistory();
    }
}

export const historyService = new HistoryService();
