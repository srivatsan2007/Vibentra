import providerManager from '../providers/providerManager.js';
import { favoriteService } from './favoriteService.js';
import { playlistService } from './playlistService.js';
import { historyService } from './historyService.js';
import { connectService } from './connectService.js';

class MusicService {
    constructor() {
        this.currentTrack = null;
        this.queue = [];
        this.originalQueue = [];
        this.history = [];
        this.isPlaying = false;
        this.isShuffle = false;
        this.isRepeat = false;
        this.repeatMode = 'off'; // 'off', 'all', 'one'
        this.currentIndex = -1;
        this._isTransitioning = false;
        
        this.audioPlayer = new Audio();
        this.audioPlayer.crossOrigin = "anonymous";
        this.audioPlayer.preload = 'auto';
        this.audioPlayer.playsInline = true;
        this.audioPlayer.loop = false;
        this.audioPlayer.setAttribute('playsinline', 'true');
        this.audioPlayer.setAttribute('webkit-playsinline', 'true');
        
        this.audioPlayer.addEventListener('ended', () => this.handleTrackEnd());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgressUI());
        
        // Advanced error and stall recovery for background playback
        this.audioPlayer.addEventListener('error', (e) => {
            console.error("Audio player error:", e, this.audioPlayer.error);
            if (this.currentTrack) {
                document.dispatchEvent(new CustomEvent('showNotification', { detail: `Error playing track. Skipping...`, type: 'error' }));
                setTimeout(() => this.playNext(), 1000); // Small delay to prevent infinite error loops
            }
        });

        this.audioPlayer.addEventListener('stalled', () => {
            console.warn("Audio stream stalled. Attempting recovery...");
            if (this.isPlaying && this.currentTrack && this.audioPlayer.currentTime > 0) {
                const currentTime = this.audioPlayer.currentTime;
                this.audioPlayer.load();
                this.audioPlayer.currentTime = currentTime;
                this.audioPlayer.play().catch(e => console.error("Recovery failed:", e));
            }
        });
        
        // Sync state with OS-level events (e.g. background pause, incoming call)
        this.audioPlayer.addEventListener('play', () => {
            this._isTransitioning = false;
            this.isPlaying = true;
            this.updatePlayPauseUI(true);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
            this.requestWakeLock();
        });

        this.audioPlayer.addEventListener('pause', () => {
            if (this._isTransitioning) return;
            this.isPlaying = false;
            this.updatePlayPauseUI(false);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
            this.releaseWakeLock();
        });

        // Wake Lock API for preventing device sleep when in foreground
        this.wakeLock = null;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.isPlaying) {
                this.requestWakeLock();
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
            console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock) {
            await this.wakeLock.release().catch(() => {});
            this.wakeLock = null;
        }
    }

    initUI() {
        if (this.audioPlayer && !this.audioPlayer.parentNode && typeof document !== 'undefined' && document.body) {
            this.audioPlayer.style.display = 'none';
            document.body.appendChild(this.audioPlayer);
        }
        
        this.setupKeyboardShortcuts();

        // Player Controls
        const handlePlayPause = (e) => { e.stopPropagation(); this.togglePlayPause(); };
        const handleNext = (e) => { e.stopPropagation(); this.playNext(); };
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
        const volumeIcon = document.getElementById('volumeIcon');

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

        // Set as Ringtone Option
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

        // Show Lyrics Option
        const showLyricsOpt = document.getElementById('showLyricsOpt');
        const mobileLyricsOpt = document.getElementById('mobileLyricsOpt');
        const lyricsModal = document.getElementById('lyricsModal');
        const closeLyricsModal = document.getElementById('closeLyricsModal');
        
        const handleLyricsClick = (e, dropdownElem) => {
            e.stopPropagation();
            if (dropdownElem) dropdownElem.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to view lyrics!');
                return;
            }
            this.showLyricsModal();
        };

        if (showLyricsOpt && lyricsModal) {
            showLyricsOpt.addEventListener('click', (e) => handleLyricsClick(e, playerOptionsDropdown));
        }
        if (mobileLyricsOpt && lyricsModal) {
            mobileLyricsOpt.addEventListener('click', (e) => handleLyricsClick(e, mobileFabDropdown));
        }
        
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
            if (!this.currentTrack) return;
            this.openAddToPlaylistModal();
        });
        
        document.getElementById('largeMoreBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('largePlayerOptionsDropdown');
            if (dropdown) dropdown.classList.toggle('hidden');
        });
        
        // Hide large player options on click outside
        document.addEventListener('click', () => {
            const dropdown = document.getElementById('largePlayerOptionsDropdown');
            if (dropdown) dropdown.classList.add('hidden');
        });

        // Large Player Dropdown Options
        document.getElementById('largeOptPlaylist')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('largePlayerOptionsDropdown');
            if (dropdown) dropdown.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to save it to a playlist!');
                return;
            }
            this.openAddToPlaylistModal();
        });

        document.getElementById('largeOptLyrics')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('largePlayerOptionsDropdown');
            if (dropdown) dropdown.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to view lyrics!');
                return;
            }
            this.showLyricsModal();
        });

        // Dedicated Ringtone Studio Button on player card
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

        document.getElementById('largeOptRingtone')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('largePlayerOptionsDropdown');
            if (dropdown) dropdown.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to set a ringtone!');
                return;
            }
            this.openRingtoneModal(this.currentTrack);
        });

        // Save state when user leaves or hides the app
        window.addEventListener('beforeunload', () => this.savePlayerState());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') this.savePlayerState();
        });

        // Restore the last played state
        this.restorePlayerState();
    }

    openAddToPlaylistModal() {
        const modal = document.getElementById('addToPlaylistModal');
        const listContainer = document.getElementById('playlistSelectionList');
        if (!modal || !listContainer) return;
        
        const playlists = playlistService.getPlaylists();
        listContainer.innerHTML = '';
        
        if (playlists.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--text-muted);">You have no playlists yet.</p>';
        } else {
            playlists.forEach(pl => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-outline';
                btn.style.width = '100%';
                btn.style.justifyContent = 'flex-start';
                btn.style.textAlign = 'left';
                btn.style.padding = '10px 20px';
                btn.textContent = pl.name;
                btn.addEventListener('click', () => {
                    playlistService.addTrackToPlaylist(pl.id, this.currentTrack);
                    modal.classList.remove('active');
                    // Trigger a custom event to show a notification
                    document.dispatchEvent(new CustomEvent('showNotification', { detail: `Added to ${pl.name}` }));
                });
                listContainer.appendChild(btn);
            });
        }
        
        modal.classList.add('active');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault(); // Prevent scrolling
                    this.togglePlayPause();
                    break;
                case 'ArrowRight':
                    this.playNext();
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

    async showLyricsModal() {
        const modal = document.getElementById('lyricsModal');
        const content = document.getElementById('lyricsContent');
        const title = document.getElementById('lyricsTitle');
        if (!modal || !content) return;

        title.textContent = `Lyrics: ${this.currentTrack.title}`;
        content.innerHTML = '<p style="color: var(--text-muted);">Loading lyrics...</p>';
        modal.classList.add('active');

        const lyrics = await providerManager.getLyrics(this.currentTrack.providerId, this.currentTrack.id);
        if (lyrics) {
            content.textContent = lyrics;
        } else {
            content.innerHTML = '<p style="color: var(--text-muted);">No lyrics available for this song.</p>';
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

        let selectedDuration = 30; // Default 30s ringtone clip

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

    async playContext(queue, track) {
        if (!queue || queue.length === 0) return;
        this.originalQueue = queue.map(t => ({...t}));
        this.queue = queue.map(t => ({...t}));
        
        let targetIndex = -1;
        if (track) {
            targetIndex = this.queue.findIndex(t => 
                (t.id && track.id && String(t.id) === String(track.id)) ||
                (t.title && track.title && t.title.toLowerCase().trim() === track.title.toLowerCase().trim())
            );
        }
        if (targetIndex === -1) targetIndex = 0;

        this.currentIndex = targetIndex;
        await this.playSpecificTrack(this.queue[this.currentIndex], this.currentIndex);
    }

    async playSpecificTrack(track, queueIndex = null) {
        try {
            if (!track) return;
            this._isTransitioning = true;
            this.audioPlayer.loop = false;

            if (queueIndex !== null && queueIndex >= 0 && queueIndex < this.queue.length) {
                this.currentIndex = queueIndex;
            } else if (this.queue.length > 0) {
                const idx = this.queue.findIndex(t => 
                    (t.id && track.id && String(t.id) === String(track.id)) ||
                    (t.title && track.title && t.title.toLowerCase().trim() === track.title.toLowerCase().trim())
                );
                if (idx !== -1) {
                    this.currentIndex = idx;
                } else {
                    // Append track to queue instead of wiping existing queue
                    this.queue.push(track);
                    this.currentIndex = this.queue.length - 1;
                }
            } else {
                this.queue = [track];
                this.currentIndex = 0;
            }

            // Instant UI feedback on click
            this.currentTrack = track;
            this.updatePlayerUI(this.currentTrack);
            this.updatePlayPauseUI(true);

            // Fetch full track if streamUrl is missing
            let fullTrack = track;
            if (!fullTrack.streamUrl) {
                fullTrack = (await providerManager.getTrack(track.providerId || 'jiosaavn', track.id)) || track;
            }
            
            if (fullTrack && track) {
                if (!fullTrack.id) fullTrack.id = track.id;
            }

            this.currentTrack = fullTrack;

            // Keep the queue item updated with the full track details (streamUrl, etc.)
            if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
                this.queue[this.currentIndex] = fullTrack;
            }

            historyService.addToHistory(this.currentTrack);
            this.updatePlayerUI(this.currentTrack);
            this.updateMediaSession(fullTrack);

            if (fullTrack.streamUrl) {
                // Synchronously set src and initiate playback for mobile gesture retention
                this.audioPlayer.src = fullTrack.streamUrl;
                const playPromise = this.audioPlayer.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        this._isTransitioning = false;
                        console.error("Playback prevented:", e);
                        if (e.name === 'NotAllowedError') {
                            // On mobile, if autoplay is blocked, prompt user once
                            this.isPlaying = false;
                            this.updatePlayPauseUI(false);
                        } else {
                            // If audio URL failed, try skipping to next track automatically
                            setTimeout(() => this.playNext(), 1000);
                        }
                    });
                }
                this.isPlaying = true;
                this.updatePlayPauseUI(true);
                if (this.mockInterval) {
                    clearInterval(this.mockInterval);
                    this.mockInterval = null;
                }
            } else {
                console.warn(`No stream URL for ${fullTrack.title}. Playing mock mode.`);
                this.isPlaying = true;
                this.updatePlayPauseUI(true);
                if (this.mockInterval) clearInterval(this.mockInterval);
                this.mockInterval = setInterval(() => this.updateProgressUI(true), 1000);
            }

            // Update Large Player if active
            if (document.getElementById('largePlayerModal')?.classList.contains('active')) {
                this.renderLargePlayer();
            }

            // Add to history stack
            this.history.push(fullTrack);
            this.savePlayerState();

            // Sync to connect room if host
            if (connectService.isHost) {
                connectService.syncPlaybackState(fullTrack, this.isPlaying, this.audioPlayer.currentTime);
            }

            // Immediately preload next track's streamUrl in background for seamless auto-play
            this.preloadNextTrack();

        } catch (error) {
            console.error("Error playing track:", error);
            this._isTransitioning = false;
        }
    }

    updateMediaSession(track) {
        // Update document title for background notification fallback
        document.title = `${track.title} - ${track.artist || 'Unknown Artist'} | Vibentra`;

        if ('mediaSession' in navigator) {
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
                this.audioPlayer.play().catch(e => console.error(e));
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                this.audioPlayer.pause();
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                this.playPrevious();
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                this.playNext();
            });
        }
    }

    handleTrackEnd() {
        this.audioPlayer.loop = false;
        if (this.repeatMode === 'one') {
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play().catch(e => console.error("Repeat track error:", e));
        } else {
            console.log(`[Vibentra Player] Track ended. Current index: ${this.currentIndex}, Queue size: ${this.queue?.length}. Advancing next...`);
            this.playNext();
        }
    }

    playNext() {
        if (!this.queue || this.queue.length === 0) return;

        let nextIndex = 0;

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
        } else if (this.currentIndex >= 0 && this.currentIndex < this.queue.length - 1) {
            nextIndex = this.currentIndex + 1;
        } else if (this.repeatMode === 'all') {
            nextIndex = 0;
        } else {
            // End of queue reached and repeat is OFF
            if (this.queue.length === 1) {
                // If queue only has 1 track and repeat is off, stop playback at end
                this.isPlaying = false;
                this.updatePlayPauseUI(false);
                this.audioPlayer.currentTime = 0;
                this.updateProgressUI();
                return;
            }
            nextIndex = 0;
        }

        const nextTrack = this.queue[nextIndex];
        if (nextTrack) {
            this.playSpecificTrack(nextTrack, nextIndex);
        }
    }

    preloadNextTrack() {
        if (!this.queue || this.queue.length === 0) return;

        let nextIndex = (this.currentIndex >= 0 ? this.currentIndex + 1 : 1) % this.queue.length;
        if (this.isShuffle && this.queue.length > 1) {
            nextIndex = Math.floor(Math.random() * this.queue.length);
        }

        const nextTrack = this.queue[nextIndex];
        if (nextTrack && (!nextTrack.streamUrl || Date.now() - (nextTrack._fetchedAt || 0) > 10 * 60 * 1000)) {
            providerManager.getTrack(nextTrack.providerId || 'jiosaavn', nextTrack.id).then(fullTrack => {
                if (fullTrack && fullTrack.streamUrl) {
                    fullTrack._fetchedAt = Date.now();
                    this.queue[nextIndex] = fullTrack;
                    const origIdx = this.originalQueue.findIndex(t => String(t.id) === String(nextTrack.id));
                    if (origIdx !== -1) this.originalQueue[origIdx] = fullTrack;
                }
            }).catch(err => console.warn("Failed to preload next track:", err));
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
        } else if (this.repeatMode === 'all') {
            prevIndex = this.queue.length - 1;
        } else {
            prevIndex = 0;
        }

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
                this.audioPlayer.play().catch(e => {
                    console.error("Play failed", e);
                    this.isPlaying = false;
                });
            } else {
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
        
        document.getElementById('largePlayerImg').src = this.currentTrack.cover;
        document.getElementById('largePlayerTitle').textContent = this.currentTrack.title;
        document.getElementById('largePlayerArtist').textContent = this.currentTrack.artist;

        const upNextList = document.getElementById('upNextList');
        if (!upNextList) return;

        upNextList.innerHTML = '';
        
        const currentIndex = this.currentIndex >= 0 ? this.currentIndex : this.queue.findIndex(t => String(t.id) === String(this.currentTrack.id));
        if (currentIndex === -1) return;

        // Show next 10 songs in the queue
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

                    // Update UI without playing immediately (browser autoplay restrictions)
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
                        this.audioPlayer.pause();
                        this.isPlaying = false;
                        this.updatePlayPauseUI(false);
                    }
                    this.audioPlayer.removeEventListener('canplay', syncOnCanPlay);
                };
                this.audioPlayer.addEventListener('canplay', syncOnCanPlay);
                
                // Fallback in case canplay was already fired
                setTimeout(() => {
                    if (Math.abs(this.audioPlayer.currentTime - targetTime) > 2) {
                        this.audioPlayer.currentTime = targetTime;
                        if (!isPlaying) {
                            this.audioPlayer.pause();
                            this.isPlaying = false;
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
                this.audioPlayer.play().catch(e => console.error("Guest auto-play failed", e));
                this.isPlaying = true;
            } else {
                this.audioPlayer.pause();
                this.isPlaying = false;
            }
            this.updatePlayPauseUI(this.isPlaying);
        }
    }
}

export const musicService = new MusicService();
