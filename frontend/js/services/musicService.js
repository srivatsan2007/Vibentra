import providerManager from '../providers/providerManager.js';
import { favoriteService } from './favoriteService.js';
import { playlistService } from './playlistService.js';
import { historyService } from './historyService.js';
import { connectService } from './connectService.js';

/**
 * Authoritative Playback Controller for Vibentra
 * Manages exact state machine, single HTML5 audio element, queue, and background audio synchronization.
 */
class MusicService {
    constructor() {
        // Authoritative Playback State
        this.currentTrack = null;
        this.queue = [];
        this.originalQueue = [];
        this.history = [];
        this.isPlaying = false;
        this.playbackState = 'IDLE'; // 'IDLE' | 'LOADING' | 'PLAYING' | 'BUFFERING' | 'PAUSED' | 'ENDED'
        this.playbackContext = 'PLAYLIST';
        this.isShuffle = false;
        this.isRepeat = false;
        this.repeatMode = 'off'; // 'off' | 'all' | 'one'
        this.currentIndex = -1;

        // Transition Locks and Generation Tracking
        this._isTransitioning = false;
        this._playbackGeneration = 0;
        this._endedHandledForGeneration = 0;
        this._userRequestedPause = false;
        this._errorRetryCount = 0;
        this._uiInitialized = false;
        this._isPlayPending = false;
        this._transientTimers = [];

        // Single Authoritative Audio Element
        this.audioPlayer = new Audio();
        this.audioPlayer.crossOrigin = "anonymous";
        this.audioPlayer.preload = 'auto';
        this.audioPlayer.playsInline = true;
        this.audioPlayer.loop = false;
        this.audioPlayer.setAttribute('playsinline', 'true');
        this.audioPlayer.setAttribute('webkit-playsinline', 'true');

        // Controlled Event Handlers for Single HTML Audio Element
        this.setupAudioEventListeners();

        // Capacitor Native MediaAction listener
        if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.BackgroundAudio) {
            window.Capacitor.Plugins.BackgroundAudio.addListener('mediaAction', (data) => {
                console.log(`[Vibentra Native Action] Received: ${data?.action}`);
                if (data?.action === 'play') {
                    if (!this.isPlaying) this.togglePlayPause();
                } else if (data?.action === 'pause') {
                    if (this.isPlaying) this.togglePlayPause();
                } else if (data?.action === 'next') {
                    this.playNext(false);
                } else if (data?.action === 'previous') {
                    this.playPrevious();
                }
            });
        }

        // Network Reconnection Handler
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log("[PLAYBACK_ONLINE] Network connection restored.");
                if (this.isPlaying && this.currentTrack && !this._userRequestedPause && this.audioPlayer.paused && this.audioPlayer.readyState >= 2) {
                    this.safePlay('online_reconnect');
                }
            });
        }
    }

    get _playbackRequestId() {
        return this._playbackGeneration;
    }

    set _playbackRequestId(val) {
        this._playbackGeneration = val;
    }

    clearTransientTimers() {
        if (this._transientTimers && this._transientTimers.length > 0) {
            this._transientTimers.forEach(id => clearTimeout(id));
            this._transientTimers = [];
        }
    }

    logPlayRequest(triggerTag) {
        console.log(`[PLAY_REQUEST]`, {
            timestamp: new Date().toISOString(),
            trigger: triggerTag,
            generationId: this._playbackGeneration,
            currentTrack: this.currentTrack?.title || 'None',
            currentIndex: this.currentIndex,
            currentTime: (this.audioPlayer.currentTime || 0).toFixed(2),
            paused: this.audioPlayer.paused,
            readyState: this.audioPlayer.readyState,
            isPlaying: this.isPlaying,
            transitionState: this._isTransitioning
        });
    }

    async safePlay(triggerTag = 'unknown') {
        this.logPlayRequest(triggerTag);

        if (this._isPlayPending) {
            console.log(`[PLAY_REQUEST] Ignored (${triggerTag}): play operation already pending for gen ${this._playbackGeneration}.`);
            return;
        }
        if (!this.audioPlayer.paused) {
            console.log(`[PLAY_REQUEST] Ignored (${triggerTag}): audio element is already playing.`);
            return;
        }

        const currentGen = this._playbackGeneration;
        this._isPlayPending = true;
        try {
            await this.audioPlayer.play();
            if (this._playbackGeneration === currentGen) {
                console.log(`[TRACK_PLAYING] Gen ${currentGen}: Playback active for "${this.currentTrack?.title}"`);
            }
        } catch (err) {
            if (this._playbackGeneration === currentGen) {
                console.warn(`[PLAY_REQUEST] Play failed (${triggerTag}) for gen ${currentGen}:`, err);
            }
            throw err;
        } finally {
            this._isPlayPending = false;
        }
    }

    checkAndResumePlayback(eventTag = 'unknown') {
        // NEVER auto-resume on timeupdate. timeupdate fires continuously while advancing.
        if (eventTag === 'timeupdate') return;

        if (this.isPlaying && !this._userRequestedPause && this.audioPlayer.paused && !this._isTransitioning && this.audioPlayer.readyState >= 2) {
            console.log(`[PLAYBACK_AUTO_RESUME] Resume triggered by ${eventTag}. ReadyState: ${this.audioPlayer.readyState}, Track: "${this.currentTrack?.title}" at ${this.audioPlayer.currentTime.toFixed(1)}s`);
            this.safePlay(eventTag).catch(() => {});
        }
    }

    setupAudioEventListeners() {
        // 1. ENDED: Authoritative track completion signal
        this.audioPlayer.addEventListener('ended', () => {
            const currentGen = this._playbackGeneration;
            console.log(`[TRACK_END] Gen ${currentGen}: Track finished. Title: "${this.currentTrack?.title}"`);
            this.clearTransientTimers();
            if (this._endedHandledForGeneration === currentGen || this._isTransitioning) {
                console.log(`[TRACK_END] Ignored duplicate ended signal for gen ${currentGen} (transitioning: ${this._isTransitioning}).`);
                return;
            }
            this._endedHandledForGeneration = currentGen;
            this.playbackState = 'ENDED';
            this.handleTrackEnd(currentGen);
        });

        // 2. TIMEUPDATE: Updates progress UI without touching playback state
        this.audioPlayer.addEventListener('timeupdate', () => {
            if (this.playbackState === 'BUFFERING' && !this.audioPlayer.paused) {
                this.playbackState = 'PLAYING';
            }
            this.updateProgressUI();
        });

        // 3. PROGRESS: Fired periodically as browser downloads media buffer packets
        this.audioPlayer.addEventListener('progress', () => {
            this.checkAndResumePlayback('progress');
        });

        // 4. PLAYING: Audio samples are actively rendering
        this.audioPlayer.addEventListener('playing', () => {
            const currentGen = this._playbackGeneration;
            console.log(`[TRACK_PLAYING] Gen ${currentGen}: Rendering audio for "${this.currentTrack?.title}" at ${this.audioPlayer.currentTime.toFixed(1)}s`);
            this.clearTransientTimers();
            this._errorRetryCount = 0;
            this._isTransitioning = false;
            this.isPlaying = true;
            this.playbackState = 'PLAYING';
            this._userRequestedPause = false;
            this.updatePlayPauseUI(true);
        });

        // 5. PLAY: Playback requested/started
        this.audioPlayer.addEventListener('play', () => {
            const currentGen = this._playbackGeneration;
            console.log(`[TRACK_STARTED] Gen ${currentGen}: Play event fired for "${this.currentTrack?.title}"`);
            this.clearTransientTimers();
            this._isTransitioning = false;
            this.isPlaying = true;
            if (this.playbackState !== 'PLAYING') {
                this.playbackState = 'PLAYING';
            }
            this._userRequestedPause = false;
            this.updatePlayPauseUI(true);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
            this.requestWakeLock();
        });

        // 6. CANPLAY & CANPLAYTHROUGH: Media data buffered sufficiently
        this.audioPlayer.addEventListener('canplay', () => {
            console.log(`[PLAYBACK_CANPLAY] Gen ${this._playbackGeneration}: readyState ${this.audioPlayer.readyState}`);
            this.checkAndResumePlayback('canplay');
        });

        this.audioPlayer.addEventListener('canplaythrough', () => {
            console.log(`[PLAYBACK_CANPLAYTHROUGH] Gen ${this._playbackGeneration}: readyState ${this.audioPlayer.readyState}`);
            this.checkAndResumePlayback('canplaythrough');
        });

        // 7. PAUSE: State machine pause handler
        this.audioPlayer.addEventListener('pause', () => {
            const currentGen = this._playbackGeneration;
            console.log(`[PLAYBACK_PAUSE] Gen ${currentGen}: Audio element paused. userRequestedPause: ${this._userRequestedPause}, isTransitioning: ${this._isTransitioning}, ended: ${this.audioPlayer.ended}`);

            if (this._isTransitioning) return;

            if (this._userRequestedPause || this.audioPlayer.ended) {
                this.clearTransientTimers();
                this.isPlaying = false;
                this.playbackState = 'PAUSED';
                this.updatePlayPauseUI(false);
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'paused';
                }
                this.releaseWakeLock();
            } else {
                console.log(`[TRACK_BUFFERING] Gen ${currentGen}: Unexpected pause detected. Setting state to BUFFERING...`);
                this.playbackState = 'BUFFERING';

                this.clearTransientTimers();
                const timerId = setTimeout(() => {
                    if (this._playbackGeneration === currentGen && this.isPlaying && !this._userRequestedPause && this.audioPlayer.paused && !this._isTransitioning) {
                        if (this.audioPlayer.readyState >= 2) {
                            console.log(`[TRACK_BUFFERING] Gen ${currentGen}: Auto-resuming after pause...`);
                            this.safePlay('transient_pause_recovery').catch(err => {
                                console.warn(`[TRACK_BUFFERING] Gen ${currentGen}: Auto-resume failed:`, err);
                            });
                        }
                    }
                }, 500);
                this._transientTimers.push(timerId);
            }
        });

        // 8. WAITING: Temporary lack of media data
        this.audioPlayer.addEventListener('waiting', () => {
            const currentGen = this._playbackGeneration;
            console.log(`[TRACK_BUFFERING] Gen ${currentGen}: Media waiting for data, readyState: ${this.audioPlayer.readyState}`);
            if (!this._userRequestedPause && !this._isTransitioning) {
                this.playbackState = 'BUFFERING';
            }
        });

        // 9. STALLED: Browser fetching stalled
        this.audioPlayer.addEventListener('stalled', () => {
            const currentGen = this._playbackGeneration;
            console.log(`[TRACK_BUFFERING] Gen ${currentGen}: Media data stalled, readyState: ${this.audioPlayer.readyState}`);
            if (!this._userRequestedPause && !this._isTransitioning) {
                this.playbackState = 'BUFFERING';
            }
        });

        // 10. ERROR: Diagnostic logging for network or decode failures
        this.audioPlayer.addEventListener('error', () => {
            const currentGen = this._playbackGeneration;
            const err = this.audioPlayer.error;
            console.error(`[PLAYBACK_ERROR] Gen ${currentGen} Diagnostics:`, {
                code: err?.code,
                message: err?.message,
                readyState: this.audioPlayer.readyState,
                currentTime: this.audioPlayer.currentTime,
                src: this.audioPlayer.src
            });

            if (this.currentTrack && !this._userRequestedPause && !this._isTransitioning) {
                this.recoverCurrentTrack(currentGen);
            }
        });
    }

    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator && !this.wakeLock) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.wakeLock.addEventListener('release', () => {
                    this.wakeLock = null;
                });
            }
        } catch (err) {
            console.warn(`Wake Lock warning: ${err.name}, ${err.message}`);
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock) {
            await this.wakeLock.release().catch(() => {});
            this.wakeLock = null;
        }
    }

    initKeepAliveAudio() {
        // Native Android BackgroundAudioService manages CPU wakefulness and process priority natively.
        // No redundant WebAudio oscillator needed to avoid buffer underrun mixing stutter.
    }

    initUI() {
        if (this.audioPlayer && !this.audioPlayer.parentNode && typeof document !== 'undefined' && document.body) {
            this.audioPlayer.style.display = 'none';
            document.body.appendChild(this.audioPlayer);
        }

        // Prevent attaching duplicate listeners if initUI is called multiple times
        if (this._uiInitialized) return;
        this._uiInitialized = true;

        this.setupKeyboardShortcuts();

        // Player Controls
        const handlePlayPause = (e) => { e.stopPropagation(); this.togglePlayPause(); };
        const handleNext = (e) => { e.stopPropagation(); this.playNext(false); };
        const handlePrev = (e) => { e.stopPropagation(); this.playPrevious(); };

        document.getElementById('playPauseBtn')?.addEventListener('click', handlePlayPause);
        document.getElementById('largePlayBtn')?.addEventListener('click', handlePlayPause);
        document.getElementById('nextBtn')?.addEventListener('click', handleNext);
        document.getElementById('largeNextBtn')?.addEventListener('click', handleNext);
        document.getElementById('prevBtn')?.addEventListener('click', handlePrev);
        document.getElementById('largePrevBtn')?.addEventListener('click', handlePrev);

        const shuffleBtns = [document.getElementById('shuffleBtn'), document.getElementById('largeShuffleBtn')];
        shuffleBtns.forEach(btn => {
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleShuffle();
            });
        });

        const repeatBtns = [document.getElementById('repeatBtn'), document.getElementById('largeRepeatBtn')];
        this.updateRepeatUI = () => {
            repeatBtns.forEach(btn => {
                if (!btn) return;
                btn.classList.remove('active');
                if (this.repeatMode === 'all') {
                    btn.classList.add('active');
                    btn.title = "Repeat Queue: On";
                    btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
                } else if (this.repeatMode === 'one') {
                    btn.classList.add('active');
                    btn.title = "Repeat Track: On";
                    btn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="font-size: 0.6rem; font-weight: bold; position: absolute; margin-left: -5px; margin-top: -6px; background: var(--primary); color: white; border-radius: 50%; width: 12px; height: 12px; display: inline-flex; align-items: center; justify-content: center;">1</span>';
                } else {
                    btn.title = "Repeat: Off";
                    btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
                }
            });
        };

        repeatBtns.forEach(btn => {
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.repeatMode === 'off') this.repeatMode = 'all';
                else if (this.repeatMode === 'all') this.repeatMode = 'one';
                else this.repeatMode = 'off';

                this.isRepeat = (this.repeatMode === 'one');
                if (this.updateRepeatUI) this.updateRepeatUI();
                this.savePlayerState();
            });
        });

        // Volume Controls
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeMuteBtn = document.getElementById('volumeMuteBtn');

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                e.stopPropagation();
                this.audioPlayer.volume = e.target.value / 100;
                this.updateVolumeIcon();
            });
        }

        if (volumeMuteBtn) {
            volumeMuteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.audioPlayer.muted = !this.audioPlayer.muted;
                this.updateVolumeIcon();
                if (volumeSlider) {
                    volumeSlider.value = this.audioPlayer.muted ? 0 : this.audioPlayer.volume * 100;
                }
            });
        }

        // Progress Slider Seek
        const progressSliders = [document.getElementById('progressSlider'), document.getElementById('largeProgressSlider')];
        progressSliders.forEach(slider => {
            if (slider) {
                slider.addEventListener('input', (e) => {
                    e.stopPropagation();
                    if (this.audioPlayer.duration) {
                        const newTime = (e.target.value / 100) * this.audioPlayer.duration;
                        this.audioPlayer.currentTime = newTime;
                    }
                });
                slider.addEventListener('change', (e) => {
                    if (this.audioPlayer.duration && connectService.isHost) {
                        const newTime = (e.target.value / 100) * this.audioPlayer.duration;
                        connectService.syncPlaybackState(this.currentTrack, this.isPlaying, newTime);
                    }
                });
            }
        });

        // Large Player Modal
        const playerLeft = document.querySelector('.player-left');
        const largePlayerModal = document.getElementById('largePlayerModal');
        const closeLargePlayerBtn = document.getElementById('closeLargePlayerBtn');

        if (playerLeft && largePlayerModal) {
            playerLeft.style.cursor = 'pointer';
            playerLeft.addEventListener('click', () => {
                if (this.currentTrack) {
                    this.renderLargePlayer();
                    largePlayerModal.classList.add('active');
                }
            });
        }

        if (closeLargePlayerBtn && largePlayerModal) {
            closeLargePlayerBtn.addEventListener('click', () => {
                largePlayerModal.classList.remove('active');
            });
        }

        // Player Options Dropdown
        const playerOptionsBtn = document.getElementById('playerOptionsBtn');
        const playerOptionsDropdown = document.getElementById('playerOptionsDropdown');
        if (playerOptionsBtn && playerOptionsDropdown) {
            playerOptionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playerOptionsDropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', () => {
                playerOptionsDropdown.classList.add('hidden');
            });
        }

        // Large Player Options Dropdown (Three Dots Menu)
        const largeMoreBtn = document.getElementById('largeMoreBtn');
        const largePlayerOptionsDropdown = document.getElementById('largePlayerOptionsDropdown');
        if (largeMoreBtn && largePlayerOptionsDropdown) {
            largeMoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                largePlayerOptionsDropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', () => {
                largePlayerOptionsDropdown.classList.add('hidden');
            });
        }

        // Mobile FAB Options Dropdown
        const mobileFab = document.getElementById('mobileFab');
        const mobileFabDropdown = document.getElementById('mobileFabDropdown');
        if (mobileFab && mobileFabDropdown) {
            mobileFab.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileFabDropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', () => {
                mobileFabDropdown.classList.add('hidden');
            });
        }

        // Ringtone Options
        const downloadRingtoneOpt = document.getElementById('downloadRingtoneOpt');
        const mobileRingtoneOpt = document.getElementById('mobileRingtoneOpt');
        const largeOptRingtone = document.getElementById('largeOptRingtone');
        const largeDownloadBtn = document.getElementById('largeDownloadBtn');
        const largeOptDownload = document.getElementById('largeOptDownload');

        const handleRingtoneClick = (e, dropdownElem) => {
            e.stopPropagation();
            if (dropdownElem) dropdownElem.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to set it as a ringtone!');
                return;
            }
            this.openRingtoneModal(this.currentTrack);
        };

        const handleDownloadClick = (e, dropdownElem) => {
            e.stopPropagation();
            if (dropdownElem) dropdownElem.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to download!');
                return;
            }
            this.downloadTrack(this.currentTrack);
        };

        if (downloadRingtoneOpt) downloadRingtoneOpt.addEventListener('click', (e) => handleRingtoneClick(e, playerOptionsDropdown));
        if (mobileRingtoneOpt) mobileRingtoneOpt.addEventListener('click', (e) => handleRingtoneClick(e, mobileFabDropdown));
        if (largeOptRingtone) largeOptRingtone.addEventListener('click', (e) => handleRingtoneClick(e, largePlayerOptionsDropdown));

        if (largeDownloadBtn) largeDownloadBtn.addEventListener('click', (e) => handleDownloadClick(e, null));
        if (largeOptDownload) largeOptDownload.addEventListener('click', (e) => handleDownloadClick(e, largePlayerOptionsDropdown));

        // Save / Add to Playlist Options
        const addToPlaylistOpt = document.getElementById('addToPlaylistOpt');
        const mobileAddToPlaylistOpt = document.getElementById('mobileAddToPlaylistOpt');
        const largeOptPlaylist = document.getElementById('largeOptPlaylist');

        const handlePlaylistClick = (e, dropdownElem) => {
            e.stopPropagation();
            if (dropdownElem) dropdownElem.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to save it to a playlist!');
                return;
            }
            this.openAddToPlaylistModal(this.currentTrack);
        };

        if (addToPlaylistOpt) addToPlaylistOpt.addEventListener('click', (e) => handlePlaylistClick(e, playerOptionsDropdown));
        if (mobileAddToPlaylistOpt) mobileAddToPlaylistOpt.addEventListener('click', (e) => handlePlaylistClick(e, mobileFabDropdown));
        if (largeOptPlaylist) largeOptPlaylist.addEventListener('click', (e) => handlePlaylistClick(e, largePlayerOptionsDropdown));

        // Show Lyrics Option
        const showLyricsOpt = document.getElementById('showLyricsOpt');
        const mobileLyricsOpt = document.getElementById('mobileLyricsOpt');
        const largeOptLyrics = document.getElementById('largeOptLyrics');
        const lyricsModal = document.getElementById('lyricsModal');
        const closeLyricsModal = document.getElementById('closeLyricsModal');

        const handleLyricsClick = (e, dropdownElem) => {
            e.stopPropagation();
            if (dropdownElem) dropdownElem.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to view lyrics!');
                return;
            }
            this.showLyricsModal(this.currentTrack);
        };

        if (showLyricsOpt && lyricsModal) showLyricsOpt.addEventListener('click', (e) => handleLyricsClick(e, playerOptionsDropdown));
        if (mobileLyricsOpt && lyricsModal) mobileLyricsOpt.addEventListener('click', (e) => handleLyricsClick(e, mobileFabDropdown));
        if (largeOptLyrics && lyricsModal) largeOptLyrics.addEventListener('click', (e) => handleLyricsClick(e, largePlayerOptionsDropdown));

        if (closeLyricsModal) {
            closeLyricsModal.addEventListener('click', () => {
                lyricsModal.classList.remove('active');
            });
        }

        // Like Button
        const likeBtns = [document.getElementById('playerLikeBtn'), document.getElementById('largeLikeBtn')];
        likeBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.currentTrack) return;

                    const isNowFav = favoriteService.toggleFavorite(this.currentTrack);
                    likeBtns.forEach(b => {
                        if (!b) return;
                        const icon = b.querySelector('i');
                        if (icon) {
                            if (isNowFav) {
                                b.classList.add('active');
                                icon.className = 'fa-solid fa-heart';
                            } else {
                                b.classList.remove('active');
                                icon.className = 'fa-regular fa-heart';
                            }
                        }
                    });

                    document.dispatchEvent(new CustomEvent('favoritesChanged'));
                });
            }
        });

        // Additional large player buttons
        document.getElementById('largePlaylistBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.currentTrack) return;
            this.openAddToPlaylistModal(this.currentTrack);
        });

        const largeRingtoneBtn = document.getElementById('largeRingtoneBtn');
        if (largeRingtoneBtn) {
            largeRingtoneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.currentTrack) {
                    alert('Play a song first to set a ringtone!');
                    return;
                }
                this.openRingtoneModal(this.currentTrack);
            });
        }

        // Save state when user leaves or hides the app
        window.addEventListener('beforeunload', () => this.savePlayerState());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') this.savePlayerState();
        });

        // Restore player state
        this.restorePlayerState();
    }

    openAddToPlaylistModal(targetTrack = null) {
        const trackToAdd = targetTrack || this.currentTrack;
        const modal = document.getElementById('addToPlaylistModal');
        const listContainer = document.getElementById('playlistSelectionList');
        if (!modal || !listContainer) return;

        const playlists = playlistService.getPlaylists();
        listContainer.innerHTML = '';

        if (playlists.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--text-muted); padding: 10px; text-align: center;">You have no custom playlists yet.</p>';
        } else {
            playlists.forEach(pl => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-outline';
                btn.style.width = '100%';
                btn.style.justifyContent = 'flex-start';
                btn.style.textAlign = 'left';
                btn.style.padding = '12px 18px';
                btn.style.borderRadius = '12px';
                btn.innerHTML = `<i class="fa-solid fa-folder-plus" style="margin-right: 10px; color: var(--primary);"></i> ${pl.name}`;
                btn.addEventListener('click', () => {
                    if (trackToAdd) {
                        playlistService.addTrackToPlaylist(pl.id, trackToAdd);
                        modal.classList.remove('active');
                        document.dispatchEvent(new CustomEvent('showNotification', { detail: `Added "${trackToAdd.title}" to ${pl.name}` }));
                    }
                });
                listContainer.appendChild(btn);
            });
        }

        modal.classList.add('active');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowRight':
                    this.playNext(false);
                    break;
                case 'ArrowLeft':
                    this.playPrevious();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.audioPlayer) {
                        this.audioPlayer.volume = Math.min(1, this.audioPlayer.volume + 0.1);
                        const volumeSlider = document.getElementById('volumeSlider');
                        if (volumeSlider) volumeSlider.value = this.audioPlayer.volume * 100;
                        this.updateVolumeIcon();
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.audioPlayer) {
                        this.audioPlayer.volume = Math.max(0, this.audioPlayer.volume - 0.1);
                        const volumeSlider = document.getElementById('volumeSlider');
                        if (volumeSlider) volumeSlider.value = this.audioPlayer.volume * 100;
                        this.updateVolumeIcon();
                    }
                    break;
            }
        });
    }

    async showLyricsModal(targetTrack = null) {
        const trackToFetch = targetTrack || this.currentTrack;
        const modal = document.getElementById('lyricsModal');
        const content = document.getElementById('lyricsContent');
        const title = document.getElementById('lyricsTitle');
        if (!modal || !content || !trackToFetch) return;

        title.textContent = `Lyrics: ${trackToFetch.title}`;
        content.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Loading lyrics...</p>';
        modal.classList.add('active');

        const lyrics = await providerManager.getLyrics(trackToFetch.providerId, trackToFetch.id);
        if (lyrics) {
            content.textContent = lyrics;
        } else {
            content.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No lyrics available for this song.</p>';
        }
    }

    downloadTrack(track) {
        if (!track) return;
        const songTitle = track.title || 'Song';
        const artistName = track.artist || 'Artist';

        document.dispatchEvent(new CustomEvent('showNotification', { 
            detail: `📥 Downloading "${songTitle}" to your device...` 
        }));

        if (track.streamUrl) {
            fetch(track.streamUrl)
                .then(res => res.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${songTitle} - ${artistName} (Vibentra).m4a`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    document.dispatchEvent(new CustomEvent('showNotification', { 
                        detail: `✅ Download Complete: "${songTitle}"!` 
                    }));
                })
                .catch(err => {
                    console.warn("Direct blob download fallback:", err);
                    const a = document.createElement('a');
                    a.href = track.streamUrl;
                    a.target = '_blank';
                    a.download = `${songTitle} - ${artistName}.m4a`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
        } else {
            alert('Audio stream is initializing. Please wait a second and try again.');
        }
    }

    openRingtoneModal(track) {
        if (!track) return;
        const modal = document.getElementById('ringtoneModal');
        const songTitleEl = document.getElementById('ringtoneSongTitle');
        const startSlider = document.getElementById('ringtoneStartSlider');
        const startValEl = document.getElementById('ringtoneStartVal');
        const closeBtn = document.getElementById('closeRingtoneModal');
        const downloadBtn = document.getElementById('ringtoneDownloadBtn');
        const setDeviceBtn = document.getElementById('ringtoneSetDeviceBtn');
        const durBtns = document.querySelectorAll('.ringtone-dur-btn');

        if (!modal) return;

        if (songTitleEl) songTitleEl.textContent = `${track.title} • ${track.artist || 'Vibentra'}`;
        modal.classList.add('active');

        let selectedDuration = 30;

        durBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-dur') === '30');
            btn.onclick = () => {
                durBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'rgba(255,255,255,0.05)';
                    b.style.borderColor = 'rgba(255,255,255,0.1)';
                });
                btn.classList.add('active');
                btn.style.background = 'rgba(124,58,237,0.3)';
                btn.style.borderColor = 'var(--primary, #7C3AED)';
                selectedDuration = parseInt(btn.getAttribute('data-dur') || '30', 10);
            };
        });

        if (startSlider && startValEl) {
            startSlider.value = 0;
            startValEl.textContent = '0:00';
            startSlider.oninput = (e) => {
                const totalSeconds = this.audioPlayer.duration || 210;
                const startSecs = Math.floor((e.target.value / 100) * totalSeconds);
                const mins = Math.floor(startSecs / 60);
                const secs = (startSecs % 60).toString().padStart(2, '0');
                startValEl.textContent = `${mins}:${secs}`;
            };
        }

        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('active');
        }

        if (downloadBtn) {
            downloadBtn.onclick = () => {
                this.downloadTrack(track);
                document.dispatchEvent(new CustomEvent('showNotification', { 
                    detail: `🔔 ${selectedDuration}s Ringtone for "${track.title}" created!` 
                }));
                modal.classList.remove('active');
            };
        }

        if (setDeviceBtn) {
            setDeviceBtn.onclick = () => {
                this.downloadTrack(track);
                alert(`📱 Ringtone Clip Saved to Downloads!\n\nTo set "${track.title}" as your phone ringtone:\n\n1. Open Phone Settings.\n2. Go to Sound & Vibration > Phone Ringtone.\n3. Select "Add Ringtone" and choose this downloaded file.`);
                modal.classList.remove('active');
            };
        }
    }

    /**
     * Authoritative Entry Point when user starts playback from Playlist / Search / Album / Favorites
     */
    async playContext(queue, track) {
        if (!queue || queue.length === 0) return;
        this.playbackContext = 'PLAYLIST';
        this.originalQueue = queue.map(t => ({...t}));
        this.queue = queue.map(t => ({...t}));

        // Explicitly reset shuffle mode to false when user plays a playlist, guaranteeing sequential playback
        this.isShuffle = false;
        const shuffleBtns = [document.getElementById('shuffleBtn'), document.getElementById('largeShuffleBtn')];
        shuffleBtns.forEach(b => b?.classList.remove('active'));

        let targetIndex = -1;
        if (track) {
            targetIndex = this.queue.findIndex(t => 
                t === track ||
                (t.id && track.id && String(t.id) === String(track.id)) ||
                (t.trackId && track.trackId && String(t.trackId) === String(track.trackId)) ||
                (t.title && track.title && t.title.toLowerCase().trim() === track.title.toLowerCase().trim())
            );
        }
        if (targetIndex === -1 && track) {
            this.queue.push({...track});
            this.originalQueue.push({...track});
            targetIndex = this.queue.length - 1;
        }
        if (targetIndex === -1) targetIndex = 0;

        this.currentIndex = targetIndex;

        // Asynchronously pre-fetch stream URLs for queue
        this.preloadEntireQueue();

        await this.playSpecificTrack(this.queue[this.currentIndex], this.currentIndex);
    }

    /**
     * Authoritative Track Playback Launcher with Generation Lock
     */
    async playSpecificTrack(track, queueIndex = null) {
        if (!track) {
            this._isTransitioning = false;
            return;
        }

        const requestId = ++this._playbackRequestId;
        this.clearTransientTimers();
        this._isTransitioning = true;
        this._userRequestedPause = false;
        this.playbackState = 'LOADING';
        this.audioPlayer.loop = false;

        console.log(`[PLAYBACK_START] Initiating playback for gen ${requestId}: "${track.title}" (Queue index: ${queueIndex})`);

        // Synchronously pause current audio to prevent buffer bleeding
        try {
            this.audioPlayer.pause();
        } catch (e) {}

        if (queueIndex !== null && queueIndex >= 0 && queueIndex < this.queue.length) {
            this.currentIndex = queueIndex;
        } else if (this.queue.length > 0) {
            const idx = this.queue.findIndex(t => 
                t === track ||
                (t.id && track.id && String(t.id) === String(track.id)) ||
                (t.title && track.title && t.title.toLowerCase().trim() === track.title.toLowerCase().trim())
            );
            if (idx !== -1) {
                this.currentIndex = idx;
            } else {
                this.queue.push(track);
                this.currentIndex = this.queue.length - 1;
            }
        } else {
            this.queue = [track];
            this.currentIndex = 0;
        }

        // Instant UI feedback
        this.currentTrack = track;
        this.updatePlayerUI(this.currentTrack);
        this.updatePlayPauseUI(true);

        // Fetch full track details if streamUrl is missing
        let fullTrack = track;
        if (!fullTrack.streamUrl) {
            try {
                const providerId = track.providerId || (track.provider === 'YouTube Music' || track.provider === 'ytmusic' ? 'ytmusic' : 'jiosaavn');
                fullTrack = (await providerManager.getTrack(providerId, track.id)) || track;
            } catch(err) {
                console.warn(`[PLAYBACK_ERROR] Stream URL fetch warning for gen ${requestId}:`, err);
            }
        }

        // Verify request generation is still current
        if (this._playbackRequestId !== requestId) {
            console.log(`[PLAYBACK_START] Request ${requestId} superseded by request ${this._playbackRequestId}. Aborting.`);
            return;
        }

        if (fullTrack && track && !fullTrack.id) {
            fullTrack.id = track.id;
        }

        this.currentTrack = fullTrack;

        if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
            this.queue[this.currentIndex] = fullTrack;
        }

        historyService.addToHistory(this.currentTrack);
        this.updatePlayerUI(this.currentTrack);
        this.updateMediaSession(fullTrack);

        if (fullTrack.streamUrl) {
            if (this.audioPlayer.src !== fullTrack.streamUrl) {
                this.audioPlayer.src = fullTrack.streamUrl;
                this.audioPlayer.load();
            } else {
                this.audioPlayer.currentTime = 0;
            }

            try {
                await this.safePlay('playSpecificTrack');

                if (this._playbackRequestId !== requestId) return;

                this._isTransitioning = false;
                this.isPlaying = true;
                this.playbackState = 'PLAYING';
                this.updatePlayPauseUI(true);
            } catch (e) {
                if (this._playbackRequestId !== requestId) return;
                this._isTransitioning = false;
                console.error(`[PLAYBACK_ERROR] Play promise rejected for gen ${requestId}:`, e);

                // Safe lockscreen retry for active generation
                if (fullTrack.streamUrl) {
                    setTimeout(async () => {
                        if (this._playbackRequestId === requestId && this.currentTrack?.id === fullTrack.id) {
                            try {
                                await this.safePlay('playSpecificTrack_retry');
                                if (this._playbackRequestId === requestId) {
                                    this.isPlaying = true;
                                    this.playbackState = 'PLAYING';
                                    this.updatePlayPauseUI(true);
                                }
                            } catch (retryErr) {
                                if (this._playbackRequestId !== requestId) return;
                                console.warn(`[PLAYBACK_ERROR] Retry failed for gen ${requestId}:`, retryErr);
                                this.recoverCurrentTrack(requestId);
                            }
                        }
                    }, 300);
                }
            }
        } else {
            console.warn(`[PLAYBACK_ERROR] No stream URL for ${fullTrack.title}. Skipping safely...`);
            this._isTransitioning = false;
            if (this._playbackRequestId === requestId) {
                this.playNext(true);
            }
        }

        if (document.getElementById('largePlayerModal')?.classList.contains('active')) {
            this.renderLargePlayer();
        }

        this.history.push(fullTrack);
        this.savePlayerState();

        if (connectService.isHost) {
            connectService.syncPlaybackState(fullTrack, this.isPlaying, this.audioPlayer.currentTime);
        }

        this.preloadUpcomingTracks();
    }

    updateMediaSession(track) {
        if (!track) return;
        document.title = `${track.title} - ${track.artist || 'Unknown Artist'} | Vibentra`;

        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.title,
                    artist: track.artist || 'Unknown Artist',
                    album: 'Vibentra',
                    artwork: [
                        { src: track.cover, sizes: '96x96', type: 'image/jpeg' },
                        { src: track.cover, sizes: '128x128', type: 'image/jpeg' },
                        { src: track.cover, sizes: '192x192', type: 'image/jpeg' },
                        { src: track.cover, sizes: '256x256', type: 'image/jpeg' },
                        { src: track.cover, sizes: '384x384', type: 'image/jpeg' },
                        { src: track.cover, sizes: '512x512', type: 'image/jpeg' }
                    ]
                });

                navigator.mediaSession.setActionHandler('play', () => {
                    if (!this.isPlaying) this.togglePlayPause();
                });
                navigator.mediaSession.setActionHandler('pause', () => {
                    if (this.isPlaying) this.togglePlayPause();
                });
                navigator.mediaSession.setActionHandler('previoustrack', () => {
                    this.playPrevious();
                });
                navigator.mediaSession.setActionHandler('nexttrack', () => {
                    this.playNext(false);
                });
                try {
                    navigator.mediaSession.setActionHandler('seekto', (details) => {
                        if (details.seekTime !== undefined && this.audioPlayer.duration) {
                            this.audioPlayer.currentTime = details.seekTime;
                            this.updateProgressUI();
                        }
                    });
                } catch(e) {}

                if ('setPositionState' in navigator.mediaSession && this.audioPlayer.duration) {
                    navigator.mediaSession.setPositionState({
                        duration: this.audioPlayer.duration || 0,
                        playbackRate: this.audioPlayer.playbackRate || 1,
                        position: this.audioPlayer.currentTime || 0
                    });
                }
            } catch (e) {
                console.warn("MediaSession warning:", e);
            }
        }

        try {
            if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.BackgroundAudio) {
                window.Capacitor.Plugins.BackgroundAudio.startService({
                    title: track.title || "Vibentra Music",
                    artist: track.artist || "Playing...",
                    cover: track.cover || "",
                    isPlaying: this.isPlaying
                });
            }
        } catch (e) {
            console.warn("BackgroundAudio service warning:", e);
        }
    }

    /**
     * Controlled Same-Song Stream Recovery
     */
    async recoverCurrentTrack(expectedRequestId = null) {
        const currentReq = expectedRequestId || this._playbackRequestId;
        if (this._playbackRequestId !== currentReq || !this.currentTrack || this._userRequestedPause) return;

        if (this._errorRetryCount >= 2) {
            console.warn(`[PLAYBACK_ERROR] Max retries (2) reached for track. Advancing queue.`);
            this._errorRetryCount = 0;
            if (this._playbackRequestId === currentReq) {
                this.playNext(true);
            }
            return;
        }

        this._errorRetryCount++;
        const resumeTime = this.audioPlayer.currentTime || 0;
        console.log(`[PLAYBACK_ERROR] Attempting same-song recovery at ${resumeTime.toFixed(1)}s (Attempt ${this._errorRetryCount}/2 for gen ${currentReq})...`);

        try {
            const providerId = this.currentTrack.providerId || (this.currentTrack.provider === 'YouTube Music' || this.currentTrack.provider === 'ytmusic' ? 'ytmusic' : 'jiosaavn');
            const refreshedTrack = await providerManager.getTrack(providerId, this.currentTrack.id);

            if (this._playbackRequestId !== currentReq) return;

            if (refreshedTrack && refreshedTrack.streamUrl) {
                this.currentTrack.streamUrl = refreshedTrack.streamUrl;
                if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
                    this.queue[this.currentIndex].streamUrl = refreshedTrack.streamUrl;
                }

                this.audioPlayer.src = refreshedTrack.streamUrl;
                if (resumeTime > 1) {
                    this.audioPlayer.currentTime = resumeTime;
                }
                await this.audioPlayer.play();

                if (this._playbackRequestId === currentReq) {
                    this._errorRetryCount = 0;
                    this.isPlaying = true;
                    this.playbackState = 'PLAYING';
                    this.updatePlayPauseUI(true);
                    console.log("[PLAYBACK_PLAYING] Same-song recovery succeeded!");
                }
            } else {
                throw new Error("No valid stream URL from provider");
            }
        } catch (err) {
            if (this._playbackRequestId !== currentReq) return;
            console.warn(`[PLAYBACK_ERROR] Recovery attempt ${this._errorRetryCount} failed:`, err);
            if (this._errorRetryCount >= 2) {
                this.playNext(true);
            }
        }
    }

    /**
     * Authoritative Normal Song Completion Handler
     */
    handleTrackEnd(expectedGen = null) {
        const currentGen = expectedGen || this._playbackGeneration;
        if (currentGen !== this._playbackGeneration) {
            console.log(`[TRACK_END] Ignored stale handleTrackEnd call for gen ${currentGen} (current gen: ${this._playbackGeneration}).`);
            return;
        }

        this.audioPlayer.loop = false;
        console.log(`[TRACK_END] Gen ${currentGen}: Processing completion. Index: ${this.currentIndex}, Queue size: ${this.queue?.length}, RepeatMode: ${this.repeatMode}`);

        if (this.repeatMode === 'one') {
            this.audioPlayer.currentTime = 0;
            this.safePlay('repeat_one').catch(e => console.error("Repeat ONE play error:", e));
        } else {
            this.playNext(true);
        }
    }

    /**
     * Authoritative Sequential Queue Advancement
     * Strictly respects Repeat Modes:
     * - 'off': 0 -> 1 -> 2 -> 3 -> STOP at end of queue
     * - 'all': 0 -> 1 -> 2 -> 3 -> 0 -> 1 (Infinite Loop)
     * - 'one': 1 -> 1 -> 1... (Handled in handleTrackEnd)
     */
    playNext(isAutomatic = true) {
        if (!this.queue || this.queue.length === 0) {
            this._isTransitioning = false;
            return;
        }

        let nextIndex = -1;

        if (this.isShuffle) {
            if (this.queue.length > 1) {
                let rand;
                let attempts = 0;
                do {
                    rand = Math.floor(Math.random() * this.queue.length);
                    attempts++;
                } while (rand === this.currentIndex && attempts < 10);
                nextIndex = rand;
            } else {
                nextIndex = 0;
            }
        } else {
            const validCurrentIndex = (this.currentIndex >= 0 && this.currentIndex < this.queue.length) ? this.currentIndex : 0;

            if (validCurrentIndex < this.queue.length - 1) {
                nextIndex = validCurrentIndex + 1;
            } else {
                // Reached end of queue (validCurrentIndex === queue.length - 1)
                if (this.repeatMode === 'all') {
                    nextIndex = 0;
                } else if (this.repeatMode === 'off') {
                    if (isAutomatic) {
                        console.log(`[TRACK_TRANSITION] Reached end of queue with Repeat OFF (index ${validCurrentIndex} of ${this.queue.length}). Stopping playback.`);
                        this._isTransitioning = false;
                        this.isPlaying = false;
                        this.playbackState = 'PAUSED';
                        this.updatePlayPauseUI(false);
                        if ('mediaSession' in navigator) {
                            navigator.mediaSession.playbackState = 'paused';
                        }
                        this.releaseWakeLock();
                        return;
                    } else {
                        nextIndex = 0;
                    }
                } else {
                    nextIndex = 0;
                }
            }
        }

        console.log(`[TRACK_TRANSITION] Gen ${this._playbackGeneration}: Advancing queue from index ${this.currentIndex} to ${nextIndex} ("${this.queue[nextIndex]?.title}") [Automatic: ${isAutomatic}, Repeat: ${this.repeatMode}]`);

        if (nextIndex >= 0 && nextIndex < this.queue.length) {
            this.playSpecificTrack(this.queue[nextIndex], nextIndex);
        } else {
            this._isTransitioning = false;
        }
    }

    async preloadEntireQueue() {
        if (!this.queue || this.queue.length === 0) return;
        for (let i = 0; i < this.queue.length; i++) {
            const t = this.queue[i];
            if (t && (!t.streamUrl || Date.now() - (t._fetchedAt || 0) > 10 * 60 * 1000)) {
                try {
                    const providerId = t.providerId || (t.provider === 'YouTube Music' || t.provider === 'ytmusic' ? 'ytmusic' : 'jiosaavn');
                    const fullTrack = await providerManager.getTrack(providerId, t.id);
                    if (fullTrack && fullTrack.streamUrl) {
                        fullTrack._fetchedAt = Date.now();
                        this.queue[i] = fullTrack;
                        const origIdx = this.originalQueue.findIndex(orig => String(orig.id) === String(t.id));
                        if (origIdx !== -1) this.originalQueue[origIdx] = fullTrack;
                    }
                } catch (err) {
                    console.warn(`Preload entire queue failed for track ${i}:`, err);
                }
            }
        }
    }

    preloadUpcomingTracks() {
        if (!this.queue || this.queue.length === 0) return;

        for (let offset = 1; offset <= 3; offset++) {
            let nextIndex = (this.currentIndex + offset) % this.queue.length;
            if (nextIndex < 0 || nextIndex >= this.queue.length) continue;

            const nextTrack = this.queue[nextIndex];
            if (nextTrack && (!nextTrack.streamUrl || Date.now() - (nextTrack._fetchedAt || 0) > 10 * 60 * 1000)) {
                const providerId = nextTrack.providerId || (nextTrack.provider === 'YouTube Music' || nextTrack.provider === 'ytmusic' ? 'ytmusic' : 'jiosaavn');
                providerManager.getTrack(providerId, nextTrack.id).then(fullTrack => {
                    if (fullTrack && fullTrack.streamUrl) {
                        fullTrack._fetchedAt = Date.now();
                        this.queue[nextIndex] = fullTrack;
                        const origIdx = this.originalQueue.findIndex(t => String(t.id) === String(nextTrack.id));
                        if (origIdx !== -1) this.originalQueue[origIdx] = fullTrack;
                    }
                }).catch(err => console.warn("Failed to preload upcoming track:", err));
            }
        }
    }

    playPrevious() {
        if (!this.queue || this.queue.length === 0) return;

        if (this.audioPlayer.currentTime > 3) {
            this.audioPlayer.currentTime = 0;
            this.updateProgressUI();
            return;
        }

        let prevIndex = -1;
        if (this.currentIndex > 0) {
            prevIndex = this.currentIndex - 1;
        } else {
            prevIndex = this.queue.length - 1;
        }

        console.log(`[QUEUE_PREV] currentIndex=${this.currentIndex}, queueLength=${this.queue.length}, prevIndex=${prevIndex}, prevTrack="${this.queue[prevIndex]?.title}"`);

        if (prevIndex !== -1 && this.queue[prevIndex]) {
            this.playSpecificTrack(this.queue[prevIndex], prevIndex);
        }
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        const shuffleBtns = [document.getElementById('shuffleBtn'), document.getElementById('largeShuffleBtn')];
        shuffleBtns.forEach(b => b?.classList.toggle('active', this.isShuffle));

        if (this.isShuffle) {
            if (this.queue.length > 1) {
                const currentTrack = this.queue[this.currentIndex] || this.currentTrack;
                const remaining = this.queue.filter((_, idx) => idx !== this.currentIndex);
                for (let i = remaining.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
                }
                this.queue = currentTrack ? [currentTrack, ...remaining] : remaining;
                this.currentIndex = 0;
            }
        } else {
            if (this.originalQueue && this.originalQueue.length > 0) {
                this.queue = [...this.originalQueue];
                if (this.currentTrack) {
                    const idx = this.queue.findIndex(t => 
                        (t.id && this.currentTrack.id && String(t.id) === String(this.currentTrack.id)) ||
                        (t.title && this.currentTrack.title && t.title.toLowerCase().trim() === this.currentTrack.title.toLowerCase().trim())
                    );
                    this.currentIndex = idx !== -1 ? idx : 0;
                }
            }
        }
        this.savePlayerState();
    }

    togglePlayPause() {
        if (!this.currentTrack) return;

        this.isPlaying = !this.isPlaying;

        if (this.currentTrack.streamUrl) {
            if (this.isPlaying) {
                this.clearTransientTimers();
                this._userRequestedPause = false;
                this.playbackState = 'PLAYING';
                this.safePlay('togglePlayPause').catch(e => {
                    console.error("Play failed", e);
                    this.isPlaying = false;
                    this.playbackState = 'PAUSED';
                });
            } else {
                this.clearTransientTimers();
                this._userRequestedPause = true;
                this.playbackState = 'PAUSED';
                this.audioPlayer.pause();
            }
        } else {
            if (!this.isPlaying && this.mockInterval) clearInterval(this.mockInterval);
            else if (this.isPlaying) this.mockInterval = setInterval(() => this.updateProgressUI(true), 1000);
        }

        this.updatePlayPauseUI(this.isPlaying);

        if (connectService.isHost) {
            connectService.syncPlaybackState(this.currentTrack, this.isPlaying, this.audioPlayer.currentTime);
        }
    }

    updateVolumeIcon() {
        const icon = document.getElementById('volumeIcon');
        if (!icon) return;

        if (this.audioPlayer.muted || this.audioPlayer.volume === 0) {
            icon.className = 'fa-solid fa-volume-xmark';
        } else if (this.audioPlayer.volume < 0.5) {
            icon.className = 'fa-solid fa-volume-low';
        } else {
            icon.className = 'fa-solid fa-volume-high';
        }
    }

    updatePlayerUI(track) {
        document.getElementById('playerTitle').textContent = track.title;
        document.getElementById('playerImg').src = track.cover;
        document.getElementById('totalTime').textContent = track.duration || "0:00";

        const progressSlider = document.getElementById('progressSlider');
        const largeProgressSlider = document.getElementById('largeProgressSlider');
        const largeProgress = document.getElementById('largeProgress');
        const currentTimeEl = document.getElementById('currentTime');
        const largeCurrTimeEl = document.getElementById('largeCurrTime');

        if (progressSlider) progressSlider.value = 0;
        if (largeProgressSlider) largeProgressSlider.value = 0;
        if (largeProgress) largeProgress.style.width = '0%';
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (largeCurrTimeEl) largeCurrTimeEl.textContent = '0:00';

        const artistEl = document.getElementById('playerArtist');
        if (artistEl) {
            artistEl.textContent = track.artist;
        }

        const likeBtns = [document.getElementById('playerLikeBtn'), document.getElementById('largeLikeBtn')];
        likeBtns.forEach(btn => {
            const icon = btn?.querySelector('i');
            if (btn && icon) {
                if (favoriteService.isFavorite(track.id)) {
                    btn.classList.add('active');
                    icon.className = 'fa-solid fa-heart';
                } else {
                    btn.classList.remove('active');
                    icon.className = 'fa-regular fa-heart';
                }
            }
        });

        const largeTotalTime = document.getElementById('largeTotalTime');
        if (largeTotalTime) largeTotalTime.textContent = track.duration || "0:00";
    }

    updatePlayPauseUI(isPlaying) {
        const btns = [document.getElementById('playPauseBtn'), document.getElementById('largePlayBtn')];
        const playerContainer = document.querySelector('.music-player');
        btns.forEach(btn => {
            if (btn) {
                btn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
            }
        });
        if (playerContainer) {
            if (isPlaying) playerContainer.classList.add('playing');
            else playerContainer.classList.remove('playing');
        }
        const largeModal = document.getElementById('largePlayerModal');
        if (largeModal) {
            if (isPlaying) largeModal.classList.add('playing');
            else largeModal.classList.remove('playing');
        }

        try {
            if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.BackgroundAudio && this.currentTrack) {
                window.Capacitor.Plugins.BackgroundAudio.startService({
                    title: this.currentTrack.title || "Vibentra Music",
                    artist: this.currentTrack.artist || "Playing...",
                    cover: this.currentTrack.cover || "",
                    isPlaying: isPlaying
                });
            }
        } catch (e) {
            console.warn("BackgroundAudio play/pause sync warning:", e);
        }
    }

    updateProgressUI(isMock = false) {
        const progressSlider = document.getElementById('progressSlider');
        const largeProgressSlider = document.getElementById('largeProgressSlider');
        const largeProgress = document.getElementById('largeProgress');
        const currentTimeEl = document.getElementById('currentTime');
        const largeCurrTimeEl = document.getElementById('largeCurrTime');

        if (!isMock && this.audioPlayer.duration) {
            const percent = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            if (progressSlider) progressSlider.value = percent;
            if (largeProgressSlider) largeProgressSlider.value = percent;
            if (largeProgress) largeProgress.style.width = `${percent}%`;

            const mins = Math.floor(this.audioPlayer.currentTime / 60);
            const secs = Math.floor(this.audioPlayer.currentTime % 60).toString().padStart(2, '0');
            const timeStr = `${mins}:${secs}`;
            if (currentTimeEl) currentTimeEl.textContent = timeStr;
            if (largeCurrTimeEl) largeCurrTimeEl.textContent = timeStr;
        } else if (isMock) {
            let currentWidth = parseFloat(progressSlider?.value || 0);
            currentWidth = (currentWidth + 1) % 100;
            if (progressSlider) progressSlider.value = currentWidth;
            if (largeProgressSlider) largeProgressSlider.value = currentWidth;
            if (largeProgress) largeProgress.style.width = `${currentWidth}%`;
        }
    }

    renderLargePlayer() {
        if (!this.currentTrack) return;

        const imgEl = document.getElementById('largePlayerImg');
        if (imgEl) imgEl.src = this.currentTrack.cover;
        const ambientEl = document.getElementById('largePlayerAmbientBg');
        if (ambientEl) ambientEl.src = this.currentTrack.cover;
        document.getElementById('largePlayerTitle').textContent = this.currentTrack.title;
        document.getElementById('largePlayerArtist').textContent = this.currentTrack.artist;

        const upNextList = document.getElementById('upNextList');
        if (!upNextList) return;

        upNextList.innerHTML = '';

        const currentIndex = this.currentIndex >= 0 ? this.currentIndex : this.queue.findIndex(t => String(t.id) === String(this.currentTrack.id));
        if (currentIndex === -1) return;

        const upcomingTracks = this.queue.slice(currentIndex + 1, currentIndex + 11);

        upcomingTracks.forEach((track, idx) => {
            const actualIndex = currentIndex + 1 + idx;
            const el = document.createElement('div');
            el.className = 'up-next-item';
            el.innerHTML = `
                <img src="${track.cover}" alt="Cover">
                <div class="up-next-item-info">
                    <h4>${track.title}</h4>
                    <p>${track.artist}</p>
                </div>
                <div style="margin-left: auto; color: var(--text-muted); font-size: 0.8rem;">
                    <i class="fa-solid fa-play"></i>
                </div>
            `;
            el.addEventListener('click', () => {
                this.playSpecificTrack(track, actualIndex);
            });
            upNextList.appendChild(el);
        });

        if (upcomingTracks.length === 0) {
            upNextList.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">End of queue</p>';
        }
    }

    savePlayerState() {
        if (!this.currentTrack) return;
        const state = {
            currentTrack: this.currentTrack,
            queue: this.queue,
            currentIndex: this.currentIndex,
            history: this.history,
            currentTime: this.audioPlayer.currentTime,
            isShuffle: this.isShuffle,
            repeatMode: this.repeatMode,
            isRepeat: this.isRepeat
        };
        localStorage.setItem('vibentra_player_state', JSON.stringify(state));
    }

    restorePlayerState() {
        const saved = localStorage.getItem('vibentra_player_state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.currentTrack) {
                    this.currentTrack = state.currentTrack;
                    this.queue = state.queue || [];
                    this.currentIndex = typeof state.currentIndex === 'number' ? state.currentIndex : 0;
                    this.history = state.history || [];
                    this.isShuffle = !!state.isShuffle;
                    this.repeatMode = state.repeatMode || (state.isRepeat ? 'one' : 'off');
                    this.isRepeat = (this.repeatMode === 'one');

                    this.updatePlayerUI(this.currentTrack);
                    if (this.currentTrack.streamUrl) {
                        this.audioPlayer.src = this.currentTrack.streamUrl;
                        this.audioPlayer.currentTime = state.currentTime || 0;
                        this.updateProgressUI();
                        this.updateMediaSession(this.currentTrack);
                    }

                    const shuffleBtns = [document.getElementById('shuffleBtn'), document.getElementById('largeShuffleBtn')];
                    shuffleBtns.forEach(b => b?.classList.toggle('active', this.isShuffle));

                    if (this.updateRepeatUI) this.updateRepeatUI();
                }
            } catch(e) {
                console.error("Could not restore player state", e);
            }
        }
    }

    remoteSync(track, isPlaying, remoteTime, updatedAt) {
        if (!track) return;

        const timeOffset = isPlaying && updatedAt ? (Date.now() - updatedAt) / 1000 : 0;
        const targetTime = remoteTime + timeOffset;

        if (!this.currentTrack || this.currentTrack.id !== track.id) {
            this.playSpecificTrack(track).then(() => {
                const syncOnCanPlay = () => {
                    this.audioPlayer.currentTime = targetTime;
                    if (!isPlaying) {
                        this._userRequestedPause = true;
                        this.audioPlayer.pause();
                        this.isPlaying = false;
                        this.playbackState = 'PAUSED';
                        this.updatePlayPauseUI(false);
                    }
                    this.audioPlayer.removeEventListener('canplay', syncOnCanPlay);
                };
                this.audioPlayer.addEventListener('canplay', syncOnCanPlay);

                setTimeout(() => {
                    if (Math.abs(this.audioPlayer.currentTime - targetTime) > 2) {
                        this.audioPlayer.currentTime = targetTime;
                        if (!isPlaying) {
                            this._userRequestedPause = true;
                            this.audioPlayer.pause();
                            this.isPlaying = false;
                            this.playbackState = 'PAUSED';
                            this.updatePlayPauseUI(false);
                        }
                    }
                }, 500);
            });
            return;
        }

        const timeDiff = Math.abs(this.audioPlayer.currentTime - targetTime);
        if (timeDiff > 2) {
            this.audioPlayer.currentTime = targetTime;
        }

        if (isPlaying !== this.isPlaying) {
            if (isPlaying) {
                this._userRequestedPause = false;
                this.playbackState = 'PLAYING';
                this.audioPlayer.play().catch(e => console.error("Guest auto-play failed", e));
                this.isPlaying = true;
            } else {
                this._userRequestedPause = true;
                this.playbackState = 'PAUSED';
                this.audioPlayer.pause();
                this.isPlaying = false;
            }
            this.updatePlayPauseUI(this.isPlaying);
        }
    }
}

export const musicService = new MusicService();
