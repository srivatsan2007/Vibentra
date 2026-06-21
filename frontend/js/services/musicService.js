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
        
        this.audioPlayer = new Audio();
        
        this.audioPlayer.addEventListener('ended', () => this.handleTrackEnd());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgressUI());
        this.audioPlayer.addEventListener('error', (e) => {
            console.error("Audio player error:", e, this.audioPlayer.error);
            if (this.currentTrack) {
                document.dispatchEvent(new CustomEvent('showNotification', { detail: `Error playing track. Skipping...`, type: 'error' }));
                setTimeout(() => this.playNext(), 1500);
            }
        });
        
        // Sync state with OS-level events (e.g. background pause, incoming call)
        this.audioPlayer.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayPauseUI(true);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        });

        this.audioPlayer.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseUI(false);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        });
    }

    initUI() {
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
                this.isShuffle = !this.isShuffle;
                shuffleBtns.forEach(b => b?.classList.toggle('active', this.isShuffle));
            });
        });

        const repeatBtns = [document.getElementById('repeatBtn'), document.getElementById('largeRepeatBtn')];
        repeatBtns.forEach(btn => {
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isRepeat = !this.isRepeat;
                repeatBtns.forEach(b => b?.classList.toggle('active', this.isRepeat));
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
            // Hide when clicking outside
            document.addEventListener('click', () => {
                playerOptionsDropdown.classList.add('hidden');
            });
        }

        // Mobile FAB Dropdown
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

        // Swipe gestures for Mini and Large Player
        const playerContainers = [document.getElementById('musicPlayer'), document.getElementById('largePlayerModal')];
        playerContainers.forEach(container => {
            if (container) {
                let touchStartX = 0;
                let touchEndX = 0;
                container.addEventListener('touchstart', e => {
                    touchStartX = e.changedTouches[0].screenX;
                }, { passive: true });
                container.addEventListener('touchend', e => {
                    touchEndX = e.changedTouches[0].screenX;
                    const swipeThreshold = 50;
                    if (touchEndX > touchStartX + swipeThreshold) {
                        // Swiped right (drag to right) -> Previous song
                        this.playPrevious();
                    } else if (touchEndX < touchStartX - swipeThreshold) {
                        // Swiped left (drag to left) -> Next song
                        this.playNext();
                    }
                }, { passive: true });
            }
        });

        // Save to Playlist Option
        const addToPlaylistOpt = document.getElementById('addToPlaylistOpt');
        const mobileAddToPlaylistOpt = document.getElementById('mobileAddToPlaylistOpt');
        const addToPlaylistModal = document.getElementById('addToPlaylistModal');
        const closeAddToPlaylistModal = document.getElementById('closeAddToPlaylistModal');
        
        const handleAddToPlaylistClick = (e, dropdownElem) => {
            e.stopPropagation();
            if (dropdownElem) dropdownElem.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to save it to a playlist!');
                return;
            }
            this.openAddToPlaylistModal();
        };

        if (addToPlaylistOpt && addToPlaylistModal) {
            addToPlaylistOpt.addEventListener('click', (e) => handleAddToPlaylistClick(e, playerOptionsDropdown));
            
            closeAddToPlaylistModal.addEventListener('click', () => {
                addToPlaylistModal.classList.remove('active');
            });
        }

        if (mobileAddToPlaylistOpt && addToPlaylistModal) {
            mobileAddToPlaylistOpt.addEventListener('click', (e) => handleAddToPlaylistClick(e, mobileFabDropdown));
        }

        // Set as Ringtone Option
        const downloadRingtoneOpt = document.getElementById('downloadRingtoneOpt');
        const mobileRingtoneOpt = document.getElementById('mobileRingtoneOpt');
        const largeDownloadBtn = document.getElementById('largeDownloadBtn');
        
        const handleRingtoneClick = (e, dropdownElem) => {
            e.stopPropagation();
            if (dropdownElem) dropdownElem.classList.add('hidden');
            if (!this.currentTrack || !this.currentTrack.streamUrl) {
                alert('Play a song first to set it as a ringtone!');
                return;
            }
            this.downloadRingtone(this.currentTrack);
        };

        if (downloadRingtoneOpt) {
            downloadRingtoneOpt.addEventListener('click', (e) => handleRingtoneClick(e, playerOptionsDropdown));
        }
        if (mobileRingtoneOpt) {
            mobileRingtoneOpt.addEventListener('click', (e) => handleRingtoneClick(e, mobileFabDropdown));
        }
        if (largeDownloadBtn) {
            largeDownloadBtn.addEventListener('click', (e) => handleRingtoneClick(e, null));
        }

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

        document.getElementById('largeOptRingtone')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('largePlayerOptionsDropdown');
            if (dropdown) dropdown.classList.add('hidden');
            if (!this.currentTrack) {
                alert('Play a song first to set a ringtone!');
                return;
            }
            alert('Ringtone has been set successfully for this device!');
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

    downloadRingtone(track) {
        if (!track || !track.streamUrl) return;
        const a = document.createElement('a');
        a.href = `/api/jiosaavn/download?url=${encodeURIComponent(track.streamUrl)}`;
        a.target = '_blank';
        a.download = `${track.title} - Vibentra.m4a`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        document.dispatchEvent(new CustomEvent('showNotification', { detail: `Downloading ${track.title} directly to internal storage...` }));
    }

    async playContext(queue, track) {
        this.originalQueue = [...queue];
        this.queue = [...queue];
        this.playSpecificTrack(track);
    }

    async playSpecificTrack(track) {
        try {
            // Get full track details (resolves streamUrl from cache if available)
            const fullTrack = await providerManager.getTrack(track.providerId, track.id) || track;
            
            this.currentTrack = fullTrack;
            historyService.addToHistory(this.currentTrack);
            this.updatePlayerUI(this.currentTrack);
            
            this.updateMediaSession(fullTrack);

            if (fullTrack.streamUrl) {
                this.audioPlayer.src = fullTrack.streamUrl;
                this.audioPlayer.play().catch(e => {
                    console.error("Playback prevented:", e);
                    if (e.name === 'NotAllowedError') {
                        document.dispatchEvent(new CustomEvent('showNotification', { detail: `Playback paused. Tap play to resume.`, type: 'error' }));
                        this.isPlaying = false;
                        this.updatePlayPauseUI(false);
                    } else {
                        document.dispatchEvent(new CustomEvent('showNotification', { detail: `Error playing track. Skipping...`, type: 'error' }));
                        setTimeout(() => this.playNext(), 1500);
                    }
                });
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

            // Update Large Player if open
            if (document.getElementById('largePlayerModal')?.classList.contains('active')) {
                this.renderLargePlayer();
            }

            // Add to history
            this.history.push(fullTrack);

            this.savePlayerState();

            // Sync to room if we are host
            if (connectService.isHost) {
                connectService.syncPlaybackState(fullTrack, this.isPlaying, this.audioPlayer.currentTime);
            }

        } catch (error) {
            console.error("Error playing track:", error);
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
        if (this.isRepeat) {
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play().catch(e => console.error(e));
        } else {
            this.playNext();
        }
    }

    playNext() {
        if (this.queue.length === 0) return;

        let nextIndex = 0;
        const currentIndex = this.queue.findIndex(t => t.id === this.currentTrack?.id);

        if (this.isShuffle) {
            nextIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            nextIndex = currentIndex >= 0 && currentIndex < this.queue.length - 1 ? currentIndex + 1 : 0;
        }

        const nextTrack = this.queue[nextIndex];
        if (nextTrack) {
            this.playSpecificTrack(nextTrack);
        }
    }

    preloadNextTrack() {
        if (this.queue.length === 0) return;
        let nextIndex = 0;
        const currentIndex = this.queue.findIndex(t => t.id === this.currentTrack?.id);

        if (this.isShuffle) {
            nextIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            nextIndex = currentIndex >= 0 && currentIndex < this.queue.length - 1 ? currentIndex + 1 : 0;
        }

        const nextTrack = this.queue[nextIndex];
        if (nextTrack) {
            // Fetch to ensure cache is hot and streamUrl is fresh
            providerManager.getTrack(nextTrack.providerId, nextTrack.id).catch(() => {});
        }
    }

    playPrevious() {
        if (this.history.length > 1) {
            // Pop current
            this.history.pop();
            // Get previous
            const prevTrack = this.history.pop();
            this.playSpecificTrack(prevTrack);
        } else if (this.queue.length > 0) {
            const currentIndex = this.queue.findIndex(t => t.id === this.currentTrack?.id);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.queue.length - 1;
            this.playSpecificTrack(this.queue[prevIndex]);
        }
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

        // Next song hint for mini player
        let nextSongTitle = "";
        if (this.queue.length > 0) {
            const currentIndex = this.queue.findIndex(t => t.id === track.id);
            if (this.isShuffle) {
                nextSongTitle = "Shuffle Mode";
            } else if (currentIndex >= 0 && currentIndex < this.queue.length - 1) {
                nextSongTitle = this.queue[currentIndex + 1].title;
            }
        }
        
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
            
            // Preload next track if less than 15 seconds remaining
            if (this.audioPlayer.duration - this.audioPlayer.currentTime < 15 && this._preloadedNextTrackFor !== this.currentTrack?.id) {
                this._preloadedNextTrackFor = this.currentTrack?.id;
                this.preloadNextTrack();
            }
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
        
        const currentIndex = this.queue.findIndex(t => t.id === this.currentTrack.id);
        if (currentIndex === -1) return;

        // Show next 10 songs in the queue
        const upcomingTracks = this.queue.slice(currentIndex + 1, currentIndex + 11);
        
        upcomingTracks.forEach((track, idx) => {
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
                this.playSpecificTrack(track);
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
            history: this.history,
            currentTime: this.audioPlayer.currentTime,
            isShuffle: this.isShuffle,
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
                    this.history = state.history || [];
                    this.isShuffle = !!state.isShuffle;
                    this.isRepeat = !!state.isRepeat;

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
                    
                    const repeatBtns = [document.getElementById('repeatBtn'), document.getElementById('largeRepeatBtn')];
                    repeatBtns.forEach(b => b?.classList.toggle('active', this.isRepeat));
                }
            } catch(e) {
                console.error("Could not restore player state", e);
            }
        }
    }
}

export const musicService = new MusicService();
