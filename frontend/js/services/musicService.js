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
        
        // HTML Audio element for playing streamUrl
        this.audioPlayer = new Audio();
        
        this.audioPlayer.addEventListener('ended', () => this.handleTrackEnd());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgressUI());
    }

    initUI() {
        this.setupKeyboardShortcuts();

        // Player Controls
        document.getElementById('playPauseBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });
        document.getElementById('nextBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playNext();
        });
        document.getElementById('prevBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playPrevious();
        });
        
        const shuffleBtn = document.getElementById('shuffleBtn');
        shuffleBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isShuffle = !this.isShuffle;
            shuffleBtn.classList.toggle('active', this.isShuffle);
        });

        const repeatBtn = document.getElementById('repeatBtn');
        repeatBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isRepeat = !this.isRepeat;
            repeatBtn.classList.toggle('active', this.isRepeat);
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
        const progressSlider = document.getElementById('progressSlider');
        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                e.stopPropagation();
                if (this.audioPlayer.duration) {
                    const newTime = (e.target.value / 100) * this.audioPlayer.duration;
                    this.audioPlayer.currentTime = newTime;
                }
            });
        }

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
        const playerLikeBtn = document.getElementById('playerLikeBtn');
        if (playerLikeBtn) {
            playerLikeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.currentTrack) return;
                
                const isNowFav = favoriteService.toggleFavorite(this.currentTrack);
                const icon = playerLikeBtn.querySelector('i');
                if (isNowFav) {
                    playerLikeBtn.classList.add('active');
                    icon.className = 'fa-solid fa-heart';
                } else {
                    playerLikeBtn.classList.remove('active');
                    icon.className = 'fa-regular fa-heart';
                }

                document.dispatchEvent(new CustomEvent('favoritesChanged'));
            });
        }
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
        // Create a hidden anchor element to trigger download
        const a = document.createElement('a');
        a.href = track.streamUrl;
        // Browsers handle cross-origin downloads differently, we use target=_blank
        a.target = '_blank';
        a.download = `${track.title} - Ringtone.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        document.dispatchEvent(new CustomEvent('showNotification', { detail: `Downloading ${track.title} for Ringtone...` }));
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

            if (fullTrack.streamUrl) {
                this.audioPlayer.src = fullTrack.streamUrl;
                this.audioPlayer.play().catch(e => console.error("Playback prevented:", e));
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

            // Sync to room if we are host
            if (connectService.isHost) {
                connectService.syncPlaybackState(fullTrack, this.isPlaying, this.audioPlayer.currentTime);
            }

        } catch (error) {
            console.error("Error playing track:", error);
        }
    }

    handleTrackEnd() {
        if (this.isRepeat) {
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play();
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
        document.getElementById('playerArtist').textContent = track.artist;
        document.getElementById('playerImg').src = track.cover;
        document.getElementById('totalTime').textContent = track.duration || "0:00";

        const playerLikeBtn = document.getElementById('playerLikeBtn');
        const icon = playerLikeBtn?.querySelector('i');
        if (playerLikeBtn && icon) {
            if (favoriteService.isFavorite(track.id)) {
                playerLikeBtn.classList.add('active');
                icon.className = 'fa-solid fa-heart';
            } else {
                playerLikeBtn.classList.remove('active');
                icon.className = 'fa-regular fa-heart';
            }
        }
    }

    updatePlayPauseUI(isPlaying) {
        const btn = document.getElementById('playPauseBtn');
        const playerContainer = document.querySelector('.music-player');
        if (btn) {
            btn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
        }
        if (playerContainer) {
            if (isPlaying) playerContainer.classList.add('playing');
            else playerContainer.classList.remove('playing');
        }
    }

    updateProgressUI(isMock = false) {
        const progressSlider = document.getElementById('progressSlider');
        const currentTimeEl = document.getElementById('currentTime');
        if (!progressSlider || !currentTimeEl) return;
        
        if (!isMock && this.audioPlayer.duration) {
            const percent = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            progressSlider.value = percent;
            
            const mins = Math.floor(this.audioPlayer.currentTime / 60);
            const secs = Math.floor(this.audioPlayer.currentTime % 60).toString().padStart(2, '0');
            currentTimeEl.textContent = `${mins}:${secs}`;
        } else if (isMock) {
            let currentWidth = parseFloat(progressSlider.value) || 0;
            currentWidth = (currentWidth + 1) % 100;
            progressSlider.value = currentWidth;
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
}

export const musicService = new MusicService();
