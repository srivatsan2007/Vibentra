/**
 * Vibentra Sleep Timer & Automation Service
 * Handles countdown timer, stop-after-current-track, and audio volume fade-out.
 */
class SleepTimerService {
    constructor() {
        this.timerId = null;
        this.tickerInterval = null;
        this.targetEndTime = null;
        this.totalDurationSeconds = 0;
        this.stopAfterTrack = false;
        this.fadeOutEnabled = true;
        this.originalVolume = 1;
        this.listeners = new Set();
    }

    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.add(callback);
        }
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners() {
        const status = this.getStatus();
        this.listeners.forEach(cb => {
            try { cb(status); } catch (e) { console.error('SleepTimer listener error:', e); }
        });
    }

    startTimer(minutes, fadeOut = true) {
        this.cancelTimer(false);

        const durationSec = Math.max(1, Math.round(minutes * 60));
        this.totalDurationSeconds = durationSec;
        this.targetEndTime = Date.now() + durationSec * 1000;
        this.stopAfterTrack = false;
        this.fadeOutEnabled = fadeOut;

        this.tickerInterval = setInterval(() => {
            const remaining = this.getRemainingSeconds();
            if (this.fadeOutEnabled && remaining <= 30 && remaining > 0) {
                this.applyFadeOut(remaining);
            }
            if (remaining <= 0) {
                this.triggerSleepEnd();
            } else {
                this.notifyListeners();
            }
        }, 1000);

        this.notifyListeners();
    }

    setStopAfterCurrentTrack(enabled = true) {
        this.cancelTimer(false);
        this.stopAfterTrack = enabled;
        this.notifyListeners();
    }

    handleTrackFinished(musicService) {
        if (this.stopAfterTrack) {
            console.log('[SLEEP_TIMER] Stopping playback as current track finished.');
            this.stopAfterTrack = false;
            if (musicService) {
                musicService.isPlaying = false;
                musicService.playbackState = 'PAUSED';
                if (musicService.audioPlayer) {
                    musicService.audioPlayer.pause();
                }
                musicService.updatePlayPauseUI(false);
            }
            this.notifyListeners();
            if (typeof window !== 'undefined' && window.showNotification) {
                window.showNotification('🌙 Music stopped after track finished. Sleep well!', 'info');
            }
            return true;
        }
        return false;
    }

    applyFadeOut(remainingSeconds) {
        try {
            if (typeof window !== 'undefined' && window.musicService?.audioPlayer) {
                const audio = window.musicService.audioPlayer;
                const factor = Math.max(0, remainingSeconds / 30);
                audio.volume = factor;
            }
        } catch (e) {
            console.warn('Fade-out volume error:', e);
        }
    }

    triggerSleepEnd() {
        this.cancelTimer(false);
        try {
            if (typeof window !== 'undefined' && window.musicService) {
                const ms = window.musicService;
                ms.isPlaying = false;
                ms.playbackState = 'PAUSED';
                if (ms.audioPlayer) {
                    ms.audioPlayer.pause();
                    ms.audioPlayer.volume = 1; // restore volume
                }
                ms.updatePlayPauseUI(false);
            }
        } catch (e) {
            console.error('Error triggering sleep pause:', e);
        }

        if (typeof window !== 'undefined' && window.showNotification) {
            window.showNotification('🌙 Sleep timer ended. Playback paused. Sweet dreams!', 'info');
        }
        this.notifyListeners();
    }

    cancelTimer(notify = true) {
        if (this.tickerInterval) {
            clearInterval(this.tickerInterval);
            this.tickerInterval = null;
        }
        this.targetEndTime = null;
        this.totalDurationSeconds = 0;
        this.stopAfterTrack = false;

        if (typeof window !== 'undefined' && window.musicService?.audioPlayer) {
            window.musicService.audioPlayer.volume = 1;
        }

        if (notify) {
            this.notifyListeners();
        }
    }

    getRemainingSeconds() {
        if (!this.targetEndTime) return 0;
        const diff = Math.max(0, Math.ceil((this.targetEndTime - Date.now()) / 1000));
        return diff;
    }

    getFormattedRemaining() {
        const sec = this.getRemainingSeconds();
        if (sec <= 0) return '';
        const mins = Math.floor(sec / 60);
        const remSec = sec % 60;
        return `${mins}:${remSec < 10 ? '0' : ''}${remSec}`;
    }

    getStatus() {
        const remaining = this.getRemainingSeconds();
        const active = remaining > 0 || this.stopAfterTrack;
        return {
            active,
            remainingSeconds: remaining,
            formattedRemaining: this.getFormattedRemaining(),
            stopAfterTrack: this.stopAfterTrack,
            fadeOut: this.fadeOutEnabled
        };
    }
}

export const sleepTimerService = new SleepTimerService();
if (typeof window !== 'undefined') {
    window.sleepTimerService = sleepTimerService;
}
