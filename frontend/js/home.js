import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showNotification } from './app.js';
import { searchService } from './services/searchService.js';
import { musicService } from './services/musicService.js';
import providerManager from './providers/providerManager.js';
import { favoriteService } from './services/favoriteService.js';
import { playlistService } from './services/playlistService.js';
import { historyService } from './services/historyService.js';
import { connectService } from './services/connectService.js';

const initHome = () => {
    // Apply Theme
    const themes = {
        'default': { primary: '#7C3AED', secondary: '#06B6D4', accent: '#EC4899', background: '#0F172A', cards: '#1E293B' },
        'ocean': { primary: '#0284C7', secondary: '#0EA5E9', accent: '#38BDF8', background: '#082F49', cards: '#0C4A6E' },
        'forest': { primary: '#16A34A', secondary: '#22C55E', accent: '#4ADE80', background: '#064E3B', cards: '#065F46' },
        'sunset': { primary: '#EA580C', secondary: '#F97316', accent: '#FB923C', background: '#431407', cards: '#7C2D12' },
        'cherry': { primary: '#E11D48', secondary: '#F43F5E', accent: '#FB7185', background: '#4C0519', cards: '#881337' },
        'cyberpunk': { primary: '#D946EF', secondary: '#8B5CF6', accent: '#06B6D4', background: '#09090B', cards: '#18181B' }
    };
    
    window.applyTheme = function(themeName) {
        const theme = themes[themeName] || themes['default'];
        document.documentElement.style.setProperty('--primary', theme.primary);
        document.documentElement.style.setProperty('--secondary', theme.secondary);
        document.documentElement.style.setProperty('--accent', theme.accent);
        document.documentElement.style.setProperty('--background', theme.background);
        document.documentElement.style.setProperty('--cards', theme.cards);
        localStorage.setItem('vibentra_theme', themeName);
    };
    
    const savedTheme = localStorage.getItem('vibentra_theme') || 'default';
    window.applyTheme(savedTheme);

    // Check Auth State
    musicService.initUI(); // Initialize player UI bindings
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }

        // Load User Data
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const welcomeNameEl = document.getElementById('welcomeName');
                if (welcomeNameEl) welcomeNameEl.textContent = userData.username;
                
                const topUsernameEl = document.getElementById('topUsername');
                if (topUsernameEl) topUsernameEl.textContent = userData.username;
                
                const profileUsername = document.getElementById('profileUsername');
                if (profileUsername) profileUsername.textContent = userData.username;

                if (userData.profileImage) {
                    const topProfileImg = document.getElementById('topProfileImg');
                    if (topProfileImg) topProfileImg.src = userData.profileImage;
                    
                    const profileAvatar = document.getElementById('profileAvatar');
                    if (profileAvatar) profileAvatar.src = userData.profileImage;
                }
            } else {
                const welcomeNameEl = document.getElementById('welcomeName');
                if (welcomeNameEl) welcomeNameEl.textContent = user.displayName || 'User';
                
                const topUsernameEl = document.getElementById('topUsername');
                if (topUsernameEl) topUsernameEl.textContent = user.displayName || 'User';
                
                const profileUsername = document.getElementById('profileUsername');
                if (profileUsername) profileUsername.textContent = user.displayName || 'User';
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    });

    // Mobile Navigation Toggle
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const sidebar = document.getElementById('sidebar');

    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileNavToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'auth.html';
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }

    // Notification Dropdown Toggle
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    
    if (notificationBtn && notificationsDropdown) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsDropdown.classList.toggle('hidden');
        });

        const notifList = document.getElementById('notificationsList');
        notifList.innerHTML = `
            <div class="notification-item unread">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" style="width: 40px; height: 40px; border-radius: 50%;">
                <div style="flex: 1;">
                    <p style="font-size: 0.9rem; line-height: 1.2;"><strong>Sarah Jenkins</strong> accepted your friend request.</p>
                    <span style="font-size: 0.75rem; color: var(--primary);">2m ago</span>
                </div>
            </div>
            <div class="notification-item unread">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(6, 182, 212, 0.2); display: flex; justify-content: center; align-items: center; color: var(--secondary);">
                    <i class="fa-solid fa-list"></i>
                </div>
                <div style="flex: 1;">
                    <p style="font-size: 0.9rem; line-height: 1.2;"><strong>Alex Turner</strong> shared a playlist with you.</p>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">1h ago</span>
                </div>
            </div>
        `;
        document.getElementById('notificationBadge').style.display = 'block';
        document.getElementById('notificationBadge').textContent = '2';

        document.getElementById('markAllReadBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.notification-item').forEach(el => el.classList.remove('unread'));
            document.getElementById('notificationBadge').style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (!notificationsDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
                notificationsDropdown.classList.add('hidden');
            }
        });
    }

    // Profile Dropdown Toggle
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (userProfileBtn && profileDropdown) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
            if (notificationsDropdown) notificationsDropdown.classList.add('hidden');
        });

        // Handle clicks on profile dropdown items
        profileDropdown.querySelectorAll('.option-item[data-target]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = item.getAttribute('data-target');
                profileDropdown.classList.add('hidden');
                
                // Simulate click on the actual nav-item to reuse existing logic
                const navItem = document.querySelector(`.nav-item[data-path="${target}"]`);
                if (navItem) navItem.click();
            });
        });

        // Handle Logout from dropdown
        const dropdownLogout = document.getElementById('dropdownLogout');
        if (dropdownLogout) {
            dropdownLogout.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await signOut(auth);
                    window.location.href = 'auth.html';
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && !userProfileBtn.contains(e.target)) {
                profileDropdown.classList.add('hidden');
            }
        });
    }

    // Navigation and Dynamic Views
    const navItems = document.querySelectorAll('.nav-item[data-path]');
    const dynamicContent = document.getElementById('dynamicContent');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-target]');

    // Handle Android/Mobile Back Button
    window.addEventListener('popstate', (e) => {
        // Check if any modal is open, if so, just close the modal and stay on page
        const openModals = document.querySelectorAll('.large-player-modal.active');
        if (openModals.length > 0) {
            openModals.forEach(m => m.classList.remove('active'));
            // Re-push the current state so the next back press works for navigation
            const currentPath = document.querySelector('.nav-item.active')?.getAttribute('data-path') || 'home';
            history.pushState({ path: currentPath }, '', '#' + currentPath);
            return;
        }

        const path = e.state && e.state.path ? e.state.path : 'home';
        
        navItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-path') === path));
        mobileNavItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-target') === path));
        
        loadView(path, false);
    });

    // Initialize state
    if (!history.state) {
        history.replaceState({ path: 'home' }, '', '#home');
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update Active State
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            mobileNavItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-target') === item.getAttribute('data-path')));

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }

            const path = item.getAttribute('data-path');
            loadView(path);
        });
    });

    // Mobile Bottom Navigation
    mobileNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const path = item.getAttribute('data-target');
            
            mobileNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Sync desktop sidebar active state
            navItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-path') === path));
            
            loadView(path);
        });
    });

    function loadView(path, pushState = true) {
        if (pushState) {
            history.pushState({ path }, '', '#' + path);
        }
        
        switch(path) {
            case 'home':
                renderHome();
                break;
            case 'search':
                renderSearch();
                break;
            case 'playlists':
                renderPlaylists();
                break;
            case 'favorites':
                renderFavorites();
                break;
            case 'connect':
                renderConnect();
                break;
            case 'vibe-ai':
                renderVibeAI();
                break;
            case 'profile':
                renderProfile();
                break;
            case 'settings':
                renderSettings();
                break;
            default:
                renderHome();
        }
    }

    // Listen for favorite changes from player to re-render if on favorites page
    document.addEventListener('favoritesChanged', () => {
        if (document.getElementById('favoritesTrackList')) {
            renderFavorites();
        }
    });

    // Views Rendering
    async function renderHome() {
        dynamicContent.innerHTML = `
            <div class="welcome-banner">
                <div>
                    <h1 style="font-size: 2.5rem; margin-bottom: 10px;">Good evening</h1>
                    <p style="opacity: 0.8;">Ready for some new tunes?</p>
                </div>
            </div>

            <div id="homeRecentSection" style="display: none;">
                <div class="section-header">
                    <h2>Recently Played</h2>
                </div>
                <div class="cards-grid" id="homeRecentGrid">
                </div>
            </div>

            <div class="section-header">
                <h2>Trending Now</h2>
                <select id="langPrefSelect" style="background: var(--cards); color: white; border: 1px solid var(--glass-border); padding: 5px 10px; border-radius: 8px; outline: none; cursor: pointer;">
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Hindi">Hindi</option>
                </select>
            </div>
            <div class="cards-grid" id="homeTrendingGrid">
                <p style="color: var(--primary); padding: 20px;">Loading trending hits...</p>
            </div>

            <div class="section-header" style="margin-top: 2rem;">
                <h2>Popular Artists</h2>
            </div>
            <div class="cards-grid" id="homeArtistsGrid">
                <p style="color: var(--primary); padding: 20px;">Loading artists...</p>
            </div>
        `;

        const history = historyService.getHistory();
        if (history.length > 0) {
            document.getElementById('homeRecentSection').style.display = 'block';
            const recentGrid = document.getElementById('homeRecentGrid');
            recentGrid.innerHTML = '';
            
            history.slice(0, 5).forEach(track => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.innerHTML = `
                    <div class="card-img-wrapper">
                        <img src="${track.cover}" alt="Cover">
                        <div class="play-btn-overlay"><i class="fa-solid fa-play"></i></div>
                    </div>
                    <div class="card-info">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                    </div>
                `;
                card.addEventListener('click', () => {
                    musicService.playContext(history, track);
                });
                recentGrid.appendChild(card);
            });
        }

        const langPrefSelect = document.getElementById('langPrefSelect');
        const storedLang = localStorage.getItem('vibentra_lang_pref') || 'English';
        langPrefSelect.value = storedLang;

        const loadTrendingData = async (language) => {
            const queryMap = {
                'English': 'latest english top hits 2026',
                'Tamil': 'latest tamil top hits 2026',
                'Hindi': 'latest hindi bollywood top hits 2026'
            };
            const searchQuery = queryMap[language] || 'trending hits';
            
            const trendingGrid = document.getElementById('homeTrendingGrid');
            const artistsGrid = document.getElementById('homeArtistsGrid');
            
            if (trendingGrid) trendingGrid.innerHTML = '<p style="color: var(--primary); padding: 20px;">Loading trending hits...</p>';
            if (artistsGrid) artistsGrid.innerHTML = '<p style="color: var(--primary); padding: 20px;">Loading artists...</p>';

            try {
                const trendingResults = await searchService.searchSongs(searchQuery);
                if (!document.getElementById('homeTrendingGrid')) return; // Check if still on home
                
                trendingGrid.innerHTML = '';
                if (trendingResults.length === 0) {
                    trendingGrid.innerHTML = '<p style="color: var(--text-muted);">No trending songs found.</p>';
                    if (artistsGrid) artistsGrid.innerHTML = '<p style="color: var(--text-muted);">No artists found.</p>';
                    return;
                }

                trendingResults.slice(0, 10).forEach(track => {
                    const card = document.createElement('div');
                    card.className = 'music-card';
                    card.innerHTML = `
                        <div class="card-img-wrapper">
                            <img src="${track.cover}" alt="Cover">
                            <div class="play-btn-overlay"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <div class="card-info">
                            <h3>${track.title}</h3>
                            <p>${track.artist}</p>
                        </div>
                    `;
                    card.addEventListener('click', () => {
                        musicService.playContext(trendingResults, track);
                    });
                    trendingGrid.appendChild(card);
                });

                // Extract and render dynamic artists
                if (artistsGrid) {
                    const artistNames = new Set();
                    trendingResults.forEach(track => {
                        if (track.artist) {
                            track.artist.split(',').forEach(a => artistNames.add(a.trim()));
                        }
                    });
                    const topArtists = Array.from(artistNames).filter(a => a.length > 0 && a.toLowerCase() !== 'unknown').slice(0, 4);
                    
                    artistsGrid.innerHTML = '';
                    topArtists.forEach(artistName => {
                        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=random&color=fff&size=150&font-size=0.33`;
                        const card = document.createElement('div');
                        card.className = 'music-card';
                        card.style.cursor = 'pointer';
                        card.innerHTML = `
                            <div class="card-img-wrapper" style="border-radius: 50%; overflow: hidden; margin-bottom: 10px; aspect-ratio: 1;">
                                <img src="${avatarUrl}" alt="Artist" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                            <div class="card-info" style="text-align: center;">
                                <h3 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${artistName}</h3>
                                <p>Artist</p>
                            </div>
                        `;
                        card.addEventListener('click', () => {
                            const searchNavBtn = document.querySelector('.nav-item[data-path="search"]');
                            if (searchNavBtn) {
                                searchNavBtn.click();
                                setTimeout(() => {
                                    const searchInput = document.getElementById('searchInput');
                                    if (searchInput) {
                                        searchInput.value = artistName;
                                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                                    }
                                }, 50);
                            }
                        });
                        artistsGrid.appendChild(card);
                    });
                    if (topArtists.length === 0) artistsGrid.innerHTML = '<p style="color: var(--text-muted);">No artists found.</p>';
                }

            } catch(e) {
                if (trendingGrid) trendingGrid.innerHTML = '<p style="color: var(--text-muted);">Failed to load trending songs.</p>';
                if (artistsGrid) artistsGrid.innerHTML = '<p style="color: var(--text-muted);">Failed to load artists.</p>';
            }
        };

        langPrefSelect.addEventListener('change', (e) => {
            const newLang = e.target.value;
            localStorage.setItem('vibentra_lang_pref', newLang);
            loadTrendingData(newLang); // Update grids instantly without page reload
        });

        // Initial Load
        loadTrendingData(storedLang);
    }

    function renderSearch() {
        dynamicContent.innerHTML = `
            <div class="section-header">
                <h2>Search</h2>
            </div>
            <div class="search-container" style="max-width: 100%; margin-bottom: 2rem; position: relative;">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" class="search-input" id="searchInput" placeholder="Search for songs, artists, across all providers..." style="padding-right: 40px;">
                <button id="voiceSearchBtn" class="btn" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; color: var(--text-muted); border: none; cursor: pointer; font-size: 1.2rem; transition: color 0.3s;" title="Search by humming or singing">
                    <i class="fa-solid fa-microphone"></i>
                </button>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <h3 style="font-size: 1.1rem; margin-bottom: 10px; color: var(--text-muted);">Quick Filters</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;" id="searchFiltersContainer">
                    <button class="btn btn-outline filter-btn" data-genre="romance">Romance</button>
                    <button class="btn btn-outline filter-btn" data-genre="devotional songs">Devotional</button>
                    <button class="btn btn-outline filter-btn" data-genre="love">Love</button>
                    <button class="btn btn-outline filter-btn" data-genre="happy">Happy</button>
                    <button class="btn btn-outline filter-btn" data-genre="sad songs">Sad</button>
                </div>
            </div>

            <div class="cards-grid" id="searchResultsGrid">
                <p style="color: var(--text-muted); grid-column: 1 / -1;">Search for music, or select a quick filter above.</p>
            </div>
        `;

        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            clearTimeout(searchTimeout);
            
            if (!query.trim()) {
                document.getElementById('searchResultsGrid').innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Search for music across Spotify, Deezer, and Local Database.</p>';
                return;
            }

            document.getElementById('searchResultsGrid').innerHTML = '<p style="color: var(--primary); grid-column: 1 / -1;">Searching providers...</p>';
            
            searchTimeout = setTimeout(async () => {
                const results = await searchService.searchAll(query);
                
                const grid = document.getElementById('searchResultsGrid');
                grid.innerHTML = '';

                if ((!results.songs || results.songs.length === 0) && 
                    (!results.albums || results.albums.length === 0) && 
                    (!results.playlists || results.playlists.length === 0)) {
                    grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No results found.</p>';
                    return;
                }
                
                // Render Songs
                if (results.songs && results.songs.length > 0) {
                    const header = document.createElement('h3');
                    header.style.gridColumn = '1 / -1';
                    header.style.marginTop = '10px';
                    header.textContent = 'Songs';
                    grid.appendChild(header);

                    results.songs.forEach(track => {
                        const card = document.createElement('div');
                        card.className = 'music-card';
                        card.innerHTML = `
                            <div class="card-img-wrapper">
                                <img src="${track.cover}" alt="Cover">
                                <div class="play-btn-overlay"><i class="fa-solid fa-play"></i></div>
                            </div>
                            <div class="card-info">
                                <h3>${track.title}</h3>
                                <p>${track.artist}</p>
                                <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display: inline-block; margin-top: 5px; color: var(--text-muted);">${track.provider || 'JioSaavn'}</span>
                            </div>
                        `;
                        
                        card.addEventListener('click', () => {
                            musicService.playContext(results.songs, track);
                        });
                        
                        grid.appendChild(card);
                    });
                }

                // Render Albums
                if (results.albums && results.albums.length > 0) {
                    const header = document.createElement('h3');
                    header.style.gridColumn = '1 / -1';
                    header.style.marginTop = '20px';
                    header.textContent = 'Albums';
                    grid.appendChild(header);

                    results.albums.forEach(album => {
                        const card = document.createElement('div');
                        card.className = 'music-card';
                        card.innerHTML = `
                            <div class="card-img-wrapper" style="position: relative;">
                                <img src="${album.cover}" alt="Cover">
                                <div class="play-btn-overlay"><i class="fa-solid fa-folder-open"></i></div>
                                <button class="save-to-playlist-btn" title="Save as local playlist" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; z-index: 5; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </div>
                            <div class="card-info">
                                <h3>${album.title}</h3>
                                <p>${album.artist}</p>
                                <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display: inline-block; margin-top: 5px; color: var(--text-muted);">Album</span>
                            </div>
                        `;
                        
                        // Play album logic
                        card.querySelector('.play-btn-overlay').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            showNotification('Loading album...');
                            const albumTracks = await providerManager.getAlbum('jiosaavn', album.id);
                            if (albumTracks && albumTracks.length > 0) {
                                musicService.playContext(albumTracks, albumTracks[0]);
                            } else {
                                showNotification('Failed to load album tracks', 'error');
                            }
                        });

                        // Save as playlist logic
                        card.querySelector('.save-to-playlist-btn').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            showNotification(`Saving '${album.title}' to your playlists...`);
                            const albumTracks = await providerManager.getAlbum('jiosaavn', album.id);
                            if (albumTracks && albumTracks.length > 0) {
                                const newPl = playlistService.createPlaylist(album.title, `Saved Album: ${album.artist}`);
                                albumTracks.forEach(track => {
                                    playlistService.addTrackToPlaylist(newPl.id, track);
                                });
                                showNotification(`Saved '${album.title}' as a new playlist!`);
                            } else {
                                showNotification('Failed to load album tracks for saving', 'error');
                            }
                        });

                        grid.appendChild(card);
                    });
                }

                // Render Playlists
                if (results.playlists && results.playlists.length > 0) {
                    const header = document.createElement('h3');
                    header.style.gridColumn = '1 / -1';
                    header.style.marginTop = '20px';
                    header.textContent = 'JioSaavn Playlists';
                    grid.appendChild(header);

                    results.playlists.forEach(pl => {
                        const card = document.createElement('div');
                        card.className = 'music-card';
                        card.innerHTML = `
                            <div class="card-img-wrapper" style="position: relative;">
                                <img src="${pl.cover}" alt="Cover">
                                <div class="play-btn-overlay"><i class="fa-solid fa-folder-open"></i></div>
                                <button class="save-to-playlist-btn" title="Save as local playlist" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; z-index: 5; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </div>
                            <div class="card-info">
                                <h3>${pl.title}</h3>
                                <p>${pl.artist}</p>
                                <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display: inline-block; margin-top: 5px; color: var(--text-muted);">Playlist</span>
                            </div>
                        `;
                        
                        // Play playlist logic
                        card.querySelector('.play-btn-overlay').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            showNotification('Loading playlist...');
                            const plTracks = await providerManager.getPlaylist('jiosaavn', pl.id);
                            if (plTracks && plTracks.length > 0) {
                                musicService.playContext(plTracks, plTracks[0]);
                            } else {
                                showNotification('Failed to load playlist tracks', 'error');
                            }
                        });

                        // Save as local playlist logic
                        card.querySelector('.save-to-playlist-btn').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            showNotification(`Saving '${pl.title}' to your playlists...`);
                            const plTracks = await providerManager.getPlaylist('jiosaavn', pl.id);
                            if (plTracks && plTracks.length > 0) {
                                const newPl = playlistService.createPlaylist(pl.title, `Saved JioSaavn Playlist`);
                                plTracks.forEach(track => {
                                    playlistService.addTrackToPlaylist(newPl.id, track);
                                });
                                showNotification(`Saved '${pl.title}' as a new playlist!`);
                            } else {
                                showNotification('Failed to load playlist tracks for saving', 'error');
                            }
                        });

                        grid.appendChild(card);
                    });
                }
            }, 500);
        });

        // Quick Filters Logic
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const genre = e.target.getAttribute('data-genre');
                const storedLang = localStorage.getItem('vibentra_lang_pref') || 'English';
                const searchQuery = `${storedLang} ${genre}`;
                
                searchInput.value = searchQuery;
                
                // Trigger the input event to run the search
                const event = new Event('input', { bubbles: true });
                searchInput.dispatchEvent(event);
            });
        });

        // Voice Search Logic
        const voiceSearchBtn = document.getElementById('voiceSearchBtn');
        let isRecording = false;
        let mediaRecorder;
        let audioChunks = [];

        voiceSearchBtn.addEventListener('click', async () => {
            if (isRecording) {
                // Stop recording
                mediaRecorder.stop();
                isRecording = false;
                voiceSearchBtn.style.color = 'var(--text-muted)';
                voiceSearchBtn.querySelector('i').classList.remove('fa-beat-fade');
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        audioChunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    
                    // Stop all tracks to release mic
                    stream.getTracks().forEach(track => track.stop());

                    // Convert to base64
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = reader.result;
                        
                        showNotification('Recognizing song...', 'success');
                        
                        try {
                            const response = await fetch('http://localhost:5000/api/jiosaavn/recognize', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ audioData: base64Audio })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success && data.track) {
                                showNotification('Song recognized!');
                                searchInput.value = data.track.title;
                                const event = new Event('input', { bubbles: true });
                                searchInput.dispatchEvent(event);
                            } else {
                                showNotification('Could not recognize the song', 'error');
                            }
                        } catch (err) {
                            showNotification('Error recognizing audio', 'error');
                        }
                    };
                };

                // Start recording
                mediaRecorder.start();
                isRecording = true;
                voiceSearchBtn.style.color = '#ef4444'; // Red to indicate recording
                voiceSearchBtn.querySelector('i').classList.add('fa-beat-fade');
                showNotification('Listening... Sing or hum a song!', 'success');
                
                // Auto stop after 5 seconds
                setTimeout(() => {
                    if (isRecording) {
                        voiceSearchBtn.click();
                    }
                }, 5000);

            } catch (err) {
                console.error("Microphone access error:", err);
                showNotification('Microphone access denied or unavailable', 'error');
            }
        });
    }

    function renderPlaylists() {
        const playlists = playlistService.getPlaylists();
        
        let html = `
            <div class="section-header">
                <h2>Your Playlists</h2>
                <button class="btn btn-primary" id="openCreatePlaylistBtn">
                    <i class="fa-solid fa-plus"></i> Create Playlist
                </button>
            </div>
            <div class="playlist-list-container" style="display: flex; flex-direction: column; gap: 15px;">
        `;
        
        playlists.forEach(pl => {
            html += `
                <div class="music-card playlist-card" data-id="${pl.id}" style="display: flex; align-items: center; gap: 20px; padding: 15px; width: 100%; border-radius: 16px; background: rgba(255,255,255,0.02);">
                    <div class="playlist-img-wrapper" style="width: 70px; height: 70px; flex-shrink: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                        <div style="width: 100%; height: 100%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; justify-content: center; align-items: center;">
                            <i class="fa-solid fa-music" style="font-size: 2rem; color: rgba(255,255,255,0.8);"></i>
                        </div>
                    </div>
                    <div class="playlist-info" style="flex: 1; display: flex; flex-direction: column; justify-content: center; position: static;">
                        <h3 style="margin: 0 0 5px 0; font-size: 1.2rem; color: white;">${pl.name}</h3>
                        <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">${pl.tracks.length} Tracks</p>
                    </div>
                    <div class="playlist-actions" style="display: flex; gap: 12px; align-items: center; margin-left: auto;">
                        <button class="btn edit-pl-btn" data-id="${pl.id}" style="background: rgba(255,255,255,0.1); border-radius: 50%; width: 40px; height: 40px; border: none; color: white; cursor: pointer; transition: background 0.3s; display: flex; justify-content: center; align-items: center;"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn delete-pl-btn" data-id="${pl.id}" style="background: rgba(239, 68, 68, 0.15); border-radius: 50%; width: 40px; height: 40px; border: none; color: #ef4444; cursor: pointer; transition: background 0.3s; display: flex; justify-content: center; align-items: center;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        dynamicContent.innerHTML = html;

        // Add Event Listeners
        document.getElementById('openCreatePlaylistBtn').addEventListener('click', () => {
            document.getElementById('playlistModalTitle').textContent = 'Create Playlist';
            document.getElementById('editingPlaylistId').value = '';
            document.getElementById('playlistNameInput').value = '';
            document.getElementById('playlistDescInput').value = '';
            document.getElementById('playlistModal').classList.add('active');
        });

        document.querySelectorAll('.edit-pl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const pl = playlistService.getPlaylist(id);
                if (pl) {
                    document.getElementById('playlistModalTitle').textContent = 'Edit Playlist';
                    document.getElementById('editingPlaylistId').value = pl.id;
                    document.getElementById('playlistNameInput').value = pl.name;
                    document.getElementById('playlistDescInput').value = pl.description;
                    document.getElementById('playlistModal').classList.add('active');
                }
            });
        });

        document.querySelectorAll('.delete-pl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this playlist?')) {
                    playlistService.deletePlaylist(id);
                    renderPlaylists();
                }
            });
        });

        document.querySelectorAll('.playlist-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                renderPlaylistDetail(id);
            });
        });
    }

    function renderPlaylistDetail(id) {
        const pl = playlistService.getPlaylist(id);
        if (!pl) return;
        
        let html = `
            <div class="section-header" style="display: flex; align-items: center; gap: 15px;">
                <button class="btn btn-outline" id="backToPlaylistsBtn" style="border-radius: 50%; width: 40px; height: 40px; padding: 0; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-arrow-left"></i></button>
                <div>
                    <h2 style="margin-bottom: 5px;">${pl.name}</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${pl.description || 'Custom Playlist'} • ${pl.tracks.length} Tracks</p>
                </div>
            </div>
            <div class="track-list" id="playlistDetailTrackList">
        `;
        
        if (pl.tracks.length === 0) {
            html += `<p style="color: var(--text-muted);">No tracks in this playlist yet. Add some from the player!</p>`;
        } else {
            pl.tracks.forEach((track, index) => {
                html += `
                <div class="track-item" data-id="${track.id}" style="cursor: pointer;">
                    <div class="track-number">${index + 1}</div>
                    <div class="track-info-row">
                        <img src="${track.cover}" class="track-img" alt="cover">
                        <div class="track-details">
                            <span style="font-weight: 500;">${track.title}</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${track.artist}</span>
                        </div>
                    </div>
                    <div class="track-album">${track.album || 'Single'}</div>
                    <div class="track-duration">${track.duration}</div>
                    <button class="btn remove-from-pl-btn" data-id="${track.id}" style="background: transparent; color: var(--text-muted); border: none; cursor: pointer; padding: 5px; margin-left: 10px;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                `;
            });
        }
        
        html += `</div>`;
        dynamicContent.innerHTML = html;

        // Event Listeners
        document.getElementById('backToPlaylistsBtn').addEventListener('click', () => {
            renderPlaylists();
        });

        document.querySelectorAll('#playlistDetailTrackList .track-item').forEach((item, idx) => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.remove-from-pl-btn')) return; 
                musicService.playContext(pl.tracks, pl.tracks[idx]);
            });
        });

        document.querySelectorAll('.remove-from-pl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = btn.getAttribute('data-id');
                playlistService.removeTrackFromPlaylist(pl.id, trackId);
                renderPlaylistDetail(pl.id); // Re-render
                showNotification('Track removed from playlist');
            });
        });
    }

    function renderFavorites() {
        const favs = favoriteService.getFavorites();
        let html = `
            <div class="section-header">
                <h2>Liked Songs</h2>
            </div>
            <div class="track-list" id="favoritesTrackList">
        `;
        
        if (favs.length === 0) {
            html += `<p style="color: var(--text-muted);">No favorite songs yet. Start liking some tracks!</p>`;
        } else {
            favs.forEach((track, index) => {
                html += `
                <div class="track-item" data-id="${track.id}" style="cursor: pointer;">
                    <div class="track-number">${index + 1}</div>
                    <div class="track-info-row">
                        <img src="${track.cover}" class="track-img" alt="cover">
                        <div class="track-details">
                            <span style="font-weight: 500;">${track.title}</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${track.artist}</span>
                        </div>
                    </div>
                    <div class="track-album">${track.album || 'Single'}</div>
                    <div class="track-duration">${track.duration}</div>
                    <button class="like-btn active fav-page-like-btn" data-id="${track.id}"><i class="fa-solid fa-heart"></i></button>
                </div>
                `;
            });
        }
        
        html += `</div>`;
        dynamicContent.innerHTML = html;

        // Add event listeners
        document.querySelectorAll('#favoritesTrackList .track-item').forEach((item, idx) => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.fav-page-like-btn')) return; // Ignore if clicking heart
                // Play track and pass favs as queue
                musicService.playContext(favs, favs[idx]);
            });
        });

        document.querySelectorAll('.fav-page-like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = btn.getAttribute('data-id');
                const track = favs.find(t => t.id === trackId);
                if (track) {
                    favoriteService.toggleFavorite(track);
                    renderFavorites(); // Re-render to remove it
                    
                    // Update main player heart icon if it's currently playing
                    if (musicService.currentTrack && musicService.currentTrack.id === trackId) {
                        const icon = document.querySelector('#playerLikeBtn i');
                        const playerLikeBtn = document.getElementById('playerLikeBtn');
                        if (icon && playerLikeBtn) {
                            icon.className = 'fa-regular fa-heart';
                            playerLikeBtn.classList.remove('active');
                        }
                    }
                }
            });
        });
    }

    async function renderVibeAI() {
        dynamicContent.innerHTML = `
            <div class="section-header">
                <h2>Vibe AI <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--primary);"></i></h2>
            </div>
            
            <!-- Listening Analytics -->
            <div class="glass-panel" style="padding: 25px; border-radius: 16px; margin-bottom: 2rem;">
                <h3 style="margin-bottom: 15px;"><i class="fa-solid fa-chart-simple" style="color: var(--secondary);"></i> Listening Analytics</h3>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;" id="analyticsContainer">
                    <p style="color: var(--text-muted);">Analyzing your recent vibes...</p>
                </div>
            </div>

            <!-- Mood-Based Recommendations -->
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 15px;"><i class="fa-solid fa-masks-theater" style="color: var(--accent);"></i> Mood Matcher</h3>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
                    <button class="btn btn-outline mood-btn" data-mood="Happy Vibes">😊 Happy</button>
                    <button class="btn btn-outline mood-btn" data-mood="Chill Lofi">☕ Chill</button>
                    <button class="btn btn-outline mood-btn" data-mood="Workout Hype">💪 Workout</button>
                    <button class="btn btn-outline mood-btn" data-mood="Deep Focus Study">🧠 Focus</button>
                    <button class="btn btn-outline mood-btn" data-mood="Late Night Drives">🌙 Late Night</button>
                </div>
                <div class="cards-grid" id="moodResultsGrid"></div>
            </div>

            <!-- Smart Playlists -->
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 15px;"><i class="fa-solid fa-bolt" style="color: #eab308;"></i> Smart Generated Mixes</h3>
                <div class="cards-grid" id="smartMixGrid">
                    <p style="color: var(--text-muted);">Generating your personalized mixes...</p>
                </div>
            </div>

            <!-- AI DJ -->
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 15px;"><i class="fa-solid fa-robot" style="color: #3b82f6;"></i> AI DJ</h3>
                <div style="display: flex; gap: 10px; margin-bottom: 20px; max-width: 600px;">
                    <input type="text" id="aiDjInput" class="search-input" placeholder="e.g. Create a late-night Tamil playlist" style="padding-left: 20px; flex: 1;">
                    <button class="btn btn-primary" id="aiDjBtn" style="border-radius: 20px; white-space: nowrap; padding: 0 25px;"><i class="fa-solid fa-magic"></i> Generate</button>
                </div>
                <div class="cards-grid" id="aiDjResultsGrid"></div>
            </div>

            <!-- Vibentra Wrapped -->
            <div style="margin-bottom: 3rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <h3 style="margin-bottom: 10px; color: white; font-size: 2.2rem;"><i class="fa-solid fa-gift"></i> Vibentra Wrapped</h3>
                <p style="color: rgba(255,255,255,0.8); margin-bottom: 25px; font-size: 1.1rem;">Your ultimate listening summary.</p>
                <button class="btn btn-primary" id="generateWrappedBtn" style="background: white; color: var(--primary); font-weight: bold; border-radius: 30px; padding: 15px 40px; border: none; font-size: 1.1rem; cursor: pointer; transition: transform 0.2s;"><i class="fa-solid fa-play"></i> Reveal My Year</button>
                <div id="wrappedResults" style="display: none; margin-top: 30px; text-align: center; background: rgba(0,0,0,0.2); padding: 30px; border-radius: 16px; color: white;"></div>
            </div>
        `;

        // 1. Render Analytics
        const history = historyService.getHistory();
        const analyticsContainer = document.getElementById('analyticsContainer');
        if (history.length === 0) {
            analyticsContainer.innerHTML = `<p style="color: var(--text-muted);">Listen to some songs to generate analytics!</p>`;
        } else {
            // Count artist frequencies
            const artistCounts = {};
            history.forEach(t => {
                artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
            });
            const topArtist = Object.keys(artistCounts).reduce((a, b) => artistCounts[a] > artistCounts[b] ? a : b);
            
            analyticsContainer.innerHTML = `
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; flex: 1; min-width: 200px; text-align: center;">
                    <h4 style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Top Artist (Recent)</h4>
                    <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${topArtist}</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; flex: 1; min-width: 200px; text-align: center;">
                    <h4 style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Recent Tracks</h4>
                    <p style="font-size: 1.5rem; font-weight: bold; color: var(--secondary);">${history.length}</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; flex: 1; min-width: 200px; text-align: center;">
                    <h4 style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Current Vibe</h4>
                    <p style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">Eclectic Mix</p>
                </div>
            `;
        }

        // 2. Mood Matcher Logic
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Highlight active button
                document.querySelectorAll('.mood-btn').forEach(b => b.classList.replace('btn-primary', 'btn-outline'));
                e.target.classList.replace('btn-outline', 'btn-primary');
                
                const rawMood = e.target.getAttribute('data-mood');
                const userLang = localStorage.getItem('vibentra_language') || 'english';
                
                // Map moods to better JioSaavn search queries
                let searchKeyword = rawMood;
                if (rawMood.includes("Happy")) searchKeyword = "Happy";
                if (rawMood.includes("Chill")) searchKeyword = "Chill Relax";
                if (rawMood.includes("Workout")) searchKeyword = "Workout Gym";
                if (rawMood.includes("Focus")) searchKeyword = "Focus Study";
                if (rawMood.includes("Late Night")) searchKeyword = "Late Night";

                const moodQuery = `${userLang} ${searchKeyword}`;
                
                const grid = document.getElementById('moodResultsGrid');
                grid.innerHTML = '<p style="color: var(--text-muted);">Finding the perfect vibe...</p>';
                
                try {
                    const results = await providerManager.searchSongs(moodQuery);
                    grid.innerHTML = '';
                    
                    // Filter out duplicate covers to ensure variety
                    const uniqueResults = [];
                    const seenCovers = new Set();
                    for (const t of results) {
                        if (!seenCovers.has(t.cover)) {
                            seenCovers.add(t.cover);
                            uniqueResults.push(t);
                        }
                    }
                    
                    // Display top 4 varied mood matches
                    const finalResults = uniqueResults.length >= 4 ? uniqueResults.slice(0, 4) : results.slice(0, 4);
                    
                    finalResults.forEach(track => {
                        const card = document.createElement('div');
                        card.className = 'music-card';
                        card.innerHTML = `
                            <div class="card-img-wrapper">
                                <img src="${track.cover || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=500&q=80'}" alt="${track.title}">
                                <div class="play-btn"><i class="fa-solid fa-play"></i></div>
                            </div>
                            <h3>${track.title}</h3>
                            <p>${track.artist}</p>
                        `;
                        card.querySelector('.play-btn').addEventListener('click', () => {
                            musicService.playContext(results, track);
                        });
                        grid.appendChild(card);
                    });
                } catch (err) {
                    grid.innerHTML = '<p style="color: #ef4444;">Error fetching mood results.</p>';
                }
            });
        });

        // 3. Smart Playlists Logic
        const smartGrid = document.getElementById('smartMixGrid');
        if (history.length > 0) {
            // Pick a random track from history to seed the smart mix
            const seedTrack = history[Math.floor(Math.random() * history.length)];
            const userLang = localStorage.getItem('vibentra_language') || 'english';
            
            try {
                // Fetch recommended/similar tracks by doing a broad search on the artist + "radio" + language
                const results = await providerManager.searchSongs(`${seedTrack.artist} Best Hits ${userLang}`);
                smartGrid.innerHTML = '';
                
                // Card 1: Artist Radio
                const card1 = document.createElement('div');
                card1.className = 'music-card';
                card1.innerHTML = `
                    <div class="card-img-wrapper">
                        <img src="${seedTrack.cover}" alt="Mix">
                        <div class="play-btn"><i class="fa-solid fa-play"></i></div>
                    </div>
                    <h3>${seedTrack.artist} Mix</h3>
                    <p>AI Generated for You</p>
                `;
                card1.querySelector('.play-btn').addEventListener('click', () => {
                    musicService.playContext(results, results[0]);
                });
                smartGrid.appendChild(card1);

            } catch (e) {
                smartGrid.innerHTML = '<p style="color: var(--text-muted);">Could not generate mixes right now.</p>';
            }
        } else {
            smartGrid.innerHTML = '<p style="color: var(--text-muted);">Start listening to songs so AI can build your Smart Mixes!</p>';
        }

        // 4. AI DJ Logic
        const aiDjBtn = document.getElementById('aiDjBtn');
        const aiDjInput = document.getElementById('aiDjInput');
        const aiDjGrid = document.getElementById('aiDjResultsGrid');

        aiDjBtn.addEventListener('click', async () => {
            const prompt = aiDjInput.value.trim();
            if (!prompt) return;

            aiDjGrid.innerHTML = '<p style="color: var(--text-muted);">AI is analyzing your prompt and digging through the database...</p>';
            
            // Extract keywords manually for a simple NLP simulation
            let searchKeywords = prompt.toLowerCase()
                .replace(/create a|give me|play songs similar to|playlist|songs/g, '')
                .replace(/late-night|late night/g, 'Late Night')
                .replace(/-/g, ' ')
                .trim();
                
            // Inject language preference to ensure regional hits
            const userLang = localStorage.getItem('vibentra_language') || 'tamil';
            
            // JioSaavn specifically struggles with "Anirudh" + mood. We map it to his full name.
            if (searchKeywords.includes('anirudh')) {
                searchKeywords = searchKeywords.replace(/anirudh/g, 'Anirudh Ravichander');
            }
            
            // Build the final optimized query
            const optimizedQuery = `${searchKeywords} ${userLang}`;
            
            try {
                const results = await providerManager.searchSongs(optimizedQuery);
                aiDjGrid.innerHTML = '';
                
                // Filter out duplicate covers to ensure variety
                const uniqueResults = [];
                const seenCovers = new Set();
                for (const t of results) {
                    if (!seenCovers.has(t.cover)) {
                        seenCovers.add(t.cover);
                        uniqueResults.push(t);
                    }
                }
                
                // Render top 8
                const djTracks = uniqueResults.slice(0, 8);
                if (djTracks.length === 0) {
                    aiDjGrid.innerHTML = '<p style="color: var(--text-muted);">AI could not find matching songs. Try a different prompt!</p>';
                    return;
                }

                djTracks.forEach(track => {
                    const card = document.createElement('div');
                    card.className = 'music-card';
                    card.innerHTML = `
                        <div class="card-img-wrapper">
                            <img src="${track.cover || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=500&q=80'}" alt="${track.title}">
                            <div class="play-btn"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <h3 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.title}</h3>
                        <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.artist}</p>
                    `;
                    card.querySelector('.play-btn').addEventListener('click', () => {
                        musicService.playContext(djTracks, track);
                    });
                    aiDjGrid.appendChild(card);
                });
            } catch (error) {
                aiDjGrid.innerHTML = '<p style="color: #ef4444;">AI DJ encountered an error.</p>';
            }
        });

        // Allow pressing Enter for AI DJ
        aiDjInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') aiDjBtn.click();
        });

        // 5. Vibentra Wrapped Logic
        const wrappedBtn = document.getElementById('generateWrappedBtn');
        const wrappedResults = document.getElementById('wrappedResults');
        
        wrappedBtn.addEventListener('click', () => {
            if (history.length === 0) {
                wrappedResults.style.display = 'block';
                wrappedResults.innerHTML = `<h3>You haven't listened to any songs yet!</h3><p>Come back when you've started vibing.</p>`;
                return;
            }

            wrappedBtn.style.transform = 'scale(0.95)';
            setTimeout(() => { wrappedBtn.style.display = 'none'; }, 200);

            // Calculate Wrapped Stats
            const artistCounts = {};
            history.forEach(t => {
                artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
            });
            const topArtist = Object.keys(artistCounts).reduce((a, b) => artistCounts[a] > artistCounts[b] ? a : b);
            
            // Calculate total minutes (fake estimation based on average 3 mins per track stored in history)
            const totalMinutes = history.length * 3;

            wrappedResults.style.display = 'block';
            wrappedResults.innerHTML = `
                <div style="animation: fadeIn 1s ease;">
                    <h2 style="font-size: 2.5rem; margin-bottom: 20px; color: #FDE047;">That's a Wrap! 🎉</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px;">
                            <p style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.7);">Top Artist</p>
                            <p style="font-size: 1.5rem; font-weight: bold;">${topArtist}</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px;">
                            <p style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.7);">Tracks Played</p>
                            <p style="font-size: 1.5rem; font-weight: bold;">${history.length}</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px;">
                            <p style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.7);">Minutes Vibe'd</p>
                            <p style="font-size: 1.5rem; font-weight: bold;">${totalMinutes}</p>
                        </div>
                    </div>
                    <p style="font-style: italic; color: rgba(255,255,255,0.8);">"You are in the top 1% of listeners for ${topArtist}!"</p>
                </div>
            `;
        });
    }

    function renderProfile() {
        const user = auth.currentUser;
        const email = user ? user.email : 'user@example.com';
        const uid = user ? user.uid : 'guest';
        const profileUrl = window.location.origin + '/?user=' + uid;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(profileUrl)}&color=7C3AED&bgcolor=111827`;

        dynamicContent.innerHTML = `
            <div class="section-header">
                <h2>Your Profile</h2>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 300px; gap: 30px; margin-top: 20px;">
                <!-- Profile Settings Form -->
                <div class="glass-panel" style="padding: 30px; border-radius: 16px;">
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                        <img src="${document.getElementById('topProfileImg').src}" id="profileAvatar" alt="Profile" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--primary);">
                        <div>
                            <h2 id="profileUsername" style="font-size: 2rem;">${document.getElementById('topUsername').textContent}</h2>
                            <p style="color: var(--text-muted);">Vibentra Member</p>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 0.9rem;">Email Address (Locked)</label>
                        <div style="position: relative;">
                            <i class="fa-solid fa-envelope" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                            <input type="email" value="${email}" disabled style="width: 100%; padding: 15px 15px 15px 45px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-muted); cursor: not-allowed; outline: none;">
                            <i class="fa-solid fa-lock" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 0.9rem;">Password</label>
                        <div style="position: relative; display: flex; gap: 10px;">
                            <div style="position: relative; flex: 1;">
                                <i class="fa-solid fa-key" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                                <input type="password" id="profilePasswordInput" value="••••••••" disabled style="width: 100%; padding: 15px 15px 15px 45px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 12px; color: white; outline: none; transition: all 0.3s;">
                            </div>
                            <button id="enablePasswordBtn" class="btn btn-outline" style="white-space: nowrap;"><i class="fa-solid fa-pen"></i> Change</button>
                        </div>
                        <div id="passwordActions" style="display: none; margin-top: 15px; text-align: right;">
                            <button id="cancelPasswordBtn" class="btn btn-outline" style="margin-right: 10px;">Cancel</button>
                            <button id="savePasswordBtn" class="btn btn-primary">Save New Password</button>
                        </div>
                    </div>
                </div>

                <!-- QR Share Panel -->
                <div class="glass-panel" style="padding: 30px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                    <h3 style="margin-bottom: 10px;">Share Profile</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 25px;">Let others scan this QR code to view your music taste and public playlists.</p>
                    
                    <div style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                        <img src="${qrUrl}" alt="Profile QR Code" style="display: block; width: 150px; height: 150px;">
                    </div>
                    
                    <button class="btn btn-outline" style="width: 100%;"><i class="fa-solid fa-share-nodes"></i> Copy Share Link</button>
                </div>
            </div>
        `;

        // Password change logic
        const passwordInput = document.getElementById('profilePasswordInput');
        const enableBtn = document.getElementById('enablePasswordBtn');
        const actionsDiv = document.getElementById('passwordActions');
        const cancelBtn = document.getElementById('cancelPasswordBtn');
        const saveBtn = document.getElementById('savePasswordBtn');

        enableBtn.addEventListener('click', () => {
            passwordInput.disabled = false;
            passwordInput.value = '';
            passwordInput.focus();
            passwordInput.style.background = 'rgba(255,255,255,0.05)';
            passwordInput.style.borderColor = 'var(--primary)';
            enableBtn.style.display = 'none';
            actionsDiv.style.display = 'block';
        });

        cancelBtn.addEventListener('click', () => {
            passwordInput.disabled = true;
            passwordInput.value = '••••••••';
            passwordInput.style.background = 'rgba(0,0,0,0.2)';
            passwordInput.style.borderColor = 'var(--glass-border)';
            enableBtn.style.display = 'block';
            actionsDiv.style.display = 'none';
        });

        saveBtn.addEventListener('click', async () => {
            const newPassword = passwordInput.value;
            if (newPassword.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }
            
            try {
                if (auth.currentUser) {
                    await updatePassword(auth.currentUser, newPassword);
                    alert('Password updated successfully!');
                    cancelBtn.click(); // Reset UI
                } else {
                    alert('You must be logged in to change your password.');
                }
            } catch (error) {
                console.error('Error updating password:', error);
                if (error.code === 'auth/requires-recent-login') {
                    alert('For security reasons, please log out and log back in before changing your password.');
                } else {
                    alert('Failed to update password: ' + error.message);
                }
            }
        });
    }

    function renderConnect() {
        if (!connectService.currentRoomId) {
            // Lobby View
            dynamicContent.innerHTML = `
                <div class="section-header">
                    <h2>Listening Rooms</h2>
                </div>
                <div class="glass-panel" style="padding: 40px; text-align: center; border-radius: 16px; margin-bottom: 2rem;">
                    <i class="fa-solid fa-satellite-dish" style="font-size: 4rem; color: var(--primary); margin-bottom: 20px;"></i>
                    <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Sync & Listen Together</h3>
                    <p style="color: var(--text-muted); margin-bottom: 30px; max-width: 400px; margin-left: auto; margin-right: auto;">Create a room to listen to music in perfect sync with your friends, or join an existing room using a code.</p>
                    
                    <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-primary" id="createRoomBtn" style="padding: 12px 30px; font-size: 1.1rem;">
                            <i class="fa-solid fa-plus"></i> Create Room
                        </button>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="joinRoomCode" class="search-input" placeholder="Room Code (e.g. A1B2C3)" style="width: 200px; text-transform: uppercase;">
                            <button class="btn btn-outline" id="joinRoomBtn" style="padding: 12px 30px; font-size: 1.1rem;">Join</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('createRoomBtn').addEventListener('click', async () => {
                try {
                    const topUsernameEl = document.getElementById('topUsername');
                    const username = topUsernameEl ? topUsernameEl.textContent : 'Guest';
                    const code = await connectService.createRoom(username);
                    showNotification(`Room ${code} created successfully!`);
                    renderConnect();
                } catch (e) {
                    showNotification(e.message, 'error');
                }
            });

            document.getElementById('joinRoomBtn').addEventListener('click', async () => {
                const code = document.getElementById('joinRoomCode').value.trim();
                if (!code) return showNotification('Enter a room code', 'error');
                try {
                    const topUsernameEl = document.getElementById('topUsername');
                    const username = topUsernameEl ? topUsernameEl.textContent : 'Guest';
                    await connectService.joinRoom(code, username);
                    showNotification(`Joined room ${code}!`);
                    renderConnect();
                } catch (e) {
                    showNotification(e.message, 'error');
                }
            });

        } else {
            // Active Room View
            dynamicContent.innerHTML = `
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>Live Room <span style="color: var(--primary); font-family: monospace;">${connectService.currentRoomId}</span></h2>
                    <button class="btn btn-outline" id="leaveRoomBtn" style="border-color: #ef4444; color: #ef4444;">
                        <i class="fa-solid fa-right-from-bracket"></i> Leave Room
                    </button>
                </div>
                
                <div class="room-grid" style="display: grid; gap: 20px;">
                    <!-- Room Main -->
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div class="glass-panel" style="padding: 30px; border-radius: 16px; text-align: center;">
                            <h3 style="margin-bottom: 20px; color: var(--text-muted);">Currently Playing for Everyone</h3>
                            <div id="roomCurrentTrack">
                                <i class="fa-solid fa-music" style="font-size: 3rem; color: var(--text-muted); opacity: 0.5;"></i>
                                <p style="margin-top: 15px; color: var(--text-muted);">Nothing playing right now</p>
                            </div>
                        </div>
                        
                        <div class="glass-panel" style="padding: 20px; border-radius: 16px; flex: 1;">
                            <h3 style="margin-bottom: 15px;">Shared Queue</h3>
                            <div id="roomQueueList" style="display: flex; flex-direction: column; gap: 10px;">
                                <p style="color: var(--text-muted);">Queue is empty</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Room Chat & Sidebar -->
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div class="glass-panel" style="padding: 20px; border-radius: 16px;">
                            <h3 style="margin-bottom: 15px;">Participants</h3>
                            <div id="roomParticipants" style="display: flex; flex-direction: column; gap: 10px;">
                                <p style="color: var(--text-muted);">Loading...</p>
                            </div>
                        </div>
                        
                        <div class="glass-panel" style="padding: 20px; border-radius: 16px; flex: 1; display: flex; flex-direction: column; min-height: 300px;">
                            <h3 style="margin-bottom: 15px;">Room Chat</h3>
                            <div id="roomChatMessages" style="flex: 1; overflow-y: auto; margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px;">
                                <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">Welcome to the chat!</p>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="roomChatInput" class="search-input" placeholder="Type a message..." style="flex: 1;">
                                <button class="btn btn-primary" id="roomChatSendBtn"><i class="fa-solid fa-paper-plane"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('leaveRoomBtn').addEventListener('click', () => {
                connectService.leaveRoom();
                renderConnect();
            });

            document.getElementById('roomChatSendBtn').addEventListener('click', () => {
                const input = document.getElementById('roomChatInput');
                if (input.value.trim()) {
                    const topUsernameEl = document.getElementById('topUsername');
                    const username = topUsernameEl ? topUsernameEl.textContent : 'Guest';
                    connectService.sendMessage(input.value.trim(), username);
                    input.value = '';
                }
            });

            document.getElementById('roomChatInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') document.getElementById('roomChatSendBtn').click();
            });

            // Set up real-time UI updaters
            connectService.onRoomUpdate = (roomData) => {
                const participantsDiv = document.getElementById('roomParticipants');
                if (participantsDiv && roomData.participants) {
                    participantsDiv.innerHTML = roomData.participants.map(p => `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 30px; height: 30px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
                                ${p.name.charAt(0).toUpperCase()}
                            </div>
                            <span>${p.name} ${roomData.hostId === p.uid ? '<i class="fa-solid fa-crown" style="color: #fbbf24; font-size: 0.8rem; margin-left: 5px;"></i>' : ''}</span>
                        </div>
                    `).join('');
                }
                
                const trackDiv = document.getElementById('roomCurrentTrack');
                if (trackDiv && roomData.currentTrack) {
                    const track = roomData.currentTrack;
                    trackDiv.innerHTML = `
                        <img src="${track.cover}" style="width: 150px; height: 150px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                        <h4 style="font-size: 1.3rem;">${track.title}</h4>
                        <p style="color: var(--text-muted);">${track.artist}</p>
                        <p style="color: ${roomData.isPlaying ? 'var(--primary)' : 'var(--text-muted)'}; margin-top: 10px; font-weight: bold;">
                            <i class="fa-solid ${roomData.isPlaying ? 'fa-volume-high' : 'fa-pause'}"></i> ${roomData.isPlaying ? 'Playing in Sync' : 'Paused'}
                        </p>
                    `;
                    
                    // Trigger actual music service sync if we are not the host
                    if (!connectService.isHost) {
                        // Play the track silently if needed, or handle syncing elsewhere
                        // Real sync logic would require deep integration with MusicService
                    }
                }
            };

            connectService.onMessageReceived = (messages) => {
                const chatDiv = document.getElementById('roomChatMessages');
                if (chatDiv) {
                    chatDiv.innerHTML = messages.map(m => `
                        <div style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px;">
                            <span style="font-weight: bold; font-size: 0.8rem; color: var(--primary);">${m.senderName}</span>
                            <p style="font-size: 0.9rem; margin-top: 2px;">${m.text}</p>
                        </div>
                    `).join('');
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                }
            };
        }
    }

    function renderSettings() {
        let providersHtml = providerManager.getAllProviders().map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--glass-border);">
                <div>
                    <h4 style="font-size: 1.1rem; margin-bottom: 5px;">${p.name}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">Status: <span style="color: ${p.enabled ? '#10b981' : '#ef4444'}">${p.enabled ? 'Enabled' : 'Disabled'}</span></p>
                </div>
                <button class="btn ${p.enabled ? 'btn-outline' : 'btn-primary'} toggle-provider-btn" data-id="${p.id}">
                    ${p.enabled ? 'Disable' : 'Enable'}
                </button>
            </div>
        `).join('');

        const currentTheme = localStorage.getItem('vibentra_theme') || 'default';

        dynamicContent.innerHTML = `
            <div class="section-header">
                <h2>Settings</h2>
            </div>
            
            <div class="glass-panel" style="border-radius: 16px; overflow: hidden; margin-bottom: 2rem;">
                <div style="padding: 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--glass-border);">
                    <h3>Appearance & Theme</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 5px;">Customize the visual aesthetic of your Vibentra experience.</p>
                </div>
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;">
                        <button class="btn ${currentTheme === 'default' ? 'btn-primary' : 'btn-outline'} theme-select-btn" data-theme="default">Midnight Purple</button>
                        <button class="btn ${currentTheme === 'ocean' ? 'btn-primary' : 'btn-outline'} theme-select-btn" data-theme="ocean">Ocean Blue</button>
                        <button class="btn ${currentTheme === 'forest' ? 'btn-primary' : 'btn-outline'} theme-select-btn" data-theme="forest">Forest Green</button>
                        <button class="btn ${currentTheme === 'sunset' ? 'btn-primary' : 'btn-outline'} theme-select-btn" data-theme="sunset">Sunset Orange</button>
                        <button class="btn ${currentTheme === 'cherry' ? 'btn-primary' : 'btn-outline'} theme-select-btn" data-theme="cherry">Cherry Red</button>
                        <button class="btn ${currentTheme === 'cyberpunk' ? 'btn-primary' : 'btn-outline'} theme-select-btn" data-theme="cyberpunk">Cyberpunk</button>
                    </div>
                </div>
            </div>

            <div class="glass-panel" style="border-radius: 16px; overflow: hidden; margin-bottom: 2rem;">
                <div style="padding: 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--glass-border);">
                    <h3>Music Providers</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 5px;">Manage the sources where Vibentra searches for music.</p>
                </div>
                <div>
                    ${providersHtml}
                </div>
            </div>
        `;

        document.querySelectorAll('.toggle-provider-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const providerId = e.target.getAttribute('data-id');
                const provider = providerManager.getProvider(providerId);
                if (provider) {
                    await providerManager.saveProviderSettings(providerId, !provider.enabled);
                    renderSettings(); 
                    showNotification(`${provider.name} ${provider.enabled ? 'enabled' : 'disabled'}`);
                }
            });
        });

        document.querySelectorAll('.theme-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const themeName = e.target.getAttribute('data-theme');
                window.applyTheme(themeName);
                renderSettings(); // Re-render to update the active button state
                showNotification('Theme updated successfully!');
            });
        });
    }

    // Initial Load
    loadView('home');

    // Playlist Modal Logic
    const playlistModal = document.getElementById('playlistModal');
    const closePlaylistModal = document.getElementById('closePlaylistModal');
    const savePlaylistBtn = document.getElementById('savePlaylistBtn');

    if (closePlaylistModal) {
        closePlaylistModal.addEventListener('click', () => {
            playlistModal.classList.remove('active');
        });
    }

    if (savePlaylistBtn) {
        savePlaylistBtn.addEventListener('click', () => {
            const id = document.getElementById('editingPlaylistId').value;
            const name = document.getElementById('playlistNameInput').value;
            const desc = document.getElementById('playlistDescInput').value;
            
            if (!name.trim()) {
                showNotification('Playlist name cannot be empty', 'error');
                return;
            }
            
            if (id) {
                playlistService.editPlaylist(id, name, desc);
                showNotification('Playlist updated successfully!');
            } else {
                playlistService.createPlaylist(name, desc);
                showNotification('Playlist created successfully!');
            }
            
            playlistModal.classList.remove('active');
            if (document.querySelector('#openCreatePlaylistBtn')) {
                loadView('playlists');
            }
        });
    }

    // Basic Player Logic
    // (playPauseBtn is now handled inside musicService.initUI())

    // Like Button Logic is now handled by musicService.js
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
} else {
    initHome();
}
