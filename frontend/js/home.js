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
        'default': {
            primary: '#7C3AED', secondary: '#06B6D4', accent: '#EC4899', background: '#0F172A', cards: 'rgba(30, 41, 59, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #1A1F4C 0%, #0C102B 50%, #07091B 100%)',
            orb1: '#7C3AED', orb2: '#06B6D4', orb3: '#EC4899', orb4: '#3B82F6'
        },
        'ocean': {
            primary: '#0284C7', secondary: '#0EA5E9', accent: '#38BDF8', background: '#082F49', cards: 'rgba(12, 74, 110, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #0C4A6E 0%, #082F49 50%, #031B2E 100%)',
            orb1: '#0284C7', orb2: '#0EA5E9', orb3: '#38BDF8', orb4: '#06B6D4'
        },
        'forest': {
            primary: '#16A34A', secondary: '#22C55E', accent: '#4ADE80', background: '#064E3B', cards: 'rgba(6, 95, 70, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #065F46 0%, #064E3B 50%, #022C22 100%)',
            orb1: '#16A34A', orb2: '#22C55E', orb3: '#4ADE80', orb4: '#10B981'
        },
        'sunset': {
            primary: '#EA580C', secondary: '#F97316', accent: '#FB923C', background: '#431407', cards: 'rgba(124, 45, 18, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #7C2D12 0%, #431407 50%, #270903 100%)',
            orb1: '#EA580C', orb2: '#F97316', orb3: '#FB923C', orb4: '#EF4444'
        },
        'cherry': {
            primary: '#E11D48', secondary: '#F43F5E', accent: '#FB7185', background: '#4C0519', cards: 'rgba(136, 19, 55, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #881337 0%, #4C0519 50%, #28030E 100%)',
            orb1: '#E11D48', orb2: '#F43F5E', orb3: '#FB7185', orb4: '#DB2777'
        },
        'cyberpunk': {
            primary: '#D946EF', secondary: '#8B5CF6', accent: '#06B6D4', background: '#09090B', cards: 'rgba(24, 24, 27, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #27272A 0%, #09090B 50%, #000000 100%)',
            orb1: '#D946EF', orb2: '#8B5CF6', orb3: '#06B6D4', orb4: '#F43F5E'
        },
        'india': {
            primary: '#F97316', secondary: '#10B981', accent: '#3B82F6', background: '#0B132B', cards: 'rgba(15, 23, 42, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #1E1B4B 0%, #0B132B 50%, #020617 100%)',
            orb1: '#F97316', orb2: '#10B981', orb3: '#3B82F6', orb4: '#F97316'
        }
    };

    window.applyTheme = function (themeName, customObj = null) {
        let theme;
        if (themeName === 'custom') {
            const savedCustom = customObj || JSON.parse(localStorage.getItem('vibentra_custom_theme') || 'null');
            if (savedCustom && savedCustom.primary) {
                theme = savedCustom;
            } else {
                theme = themes['default'];
            }
        } else {
            theme = themes[themeName] || themes['default'];
        }

        document.documentElement.style.setProperty('--primary', theme.primary);
        document.documentElement.style.setProperty('--secondary', theme.secondary);
        document.documentElement.style.setProperty('--accent', theme.accent);
        document.documentElement.style.setProperty('--background', theme.background);
        document.documentElement.style.setProperty('--cards', theme.cards);

        document.body.style.background = theme.bgGradient || `radial-gradient(circle at 20% 20%, ${theme.primary}33 0%, ${theme.background} 60%, #000000 100%)`;

        const orb1 = document.querySelector('.orb-1');
        if (orb1) orb1.style.background = theme.orb1 || theme.primary;
        const orb2 = document.querySelector('.orb-2');
        if (orb2) orb2.style.background = theme.orb2 || theme.secondary;
        const orb3 = document.querySelector('.orb-3');
        if (orb3) orb3.style.background = theme.orb3 || theme.accent;
        const orb4 = document.querySelector('.orb-4');
        if (orb4) orb4.style.background = theme.orb4 || theme.primary;

        localStorage.setItem('vibentra_theme', themeName);
        if (themeName === 'custom' && customObj) {
            localStorage.setItem('vibentra_custom_theme', JSON.stringify(customObj));
        }
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
            const fallbackName = user.displayName || user.email?.split('@')[0] || 'User';
            const welcomeNameEl = document.getElementById('welcomeName');
            if (welcomeNameEl) welcomeNameEl.textContent = fallbackName;

            const topUsernameEl = document.getElementById('topUsername');
            if (topUsernameEl) topUsernameEl.textContent = fallbackName;

            const profileUsername = document.getElementById('profileUsername');
            if (profileUsername) profileUsername.textContent = fallbackName;
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

    // Desktop Search & Home Topbar Navigation
    const desktopSearchInput = document.getElementById('desktopSearchInput');
    const desktopHomeBtn = document.getElementById('desktopHomeBtn');
    const desktopBrowseBtn = document.getElementById('desktopBrowseBtn');

    if (desktopHomeBtn) {
        desktopHomeBtn.addEventListener('click', () => {
            loadView('home');
        });
    }

    if (desktopBrowseBtn) {
        desktopBrowseBtn.addEventListener('click', () => {
            loadView('search');
        });
    }

    if (desktopSearchInput) {
        desktopSearchInput.addEventListener('focus', () => {
            if (currentView !== 'search') {
                loadView('search');
            }
        });

        desktopSearchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const mobileSearchInput = document.getElementById('searchInput');
            if (mobileSearchInput) {
                mobileSearchInput.value = query;
                mobileSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

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

    // Touch Pull-To-Refresh Engine
    const mainContentEl = document.getElementById('mainContent');
    if (mainContentEl) {
        let touchStartY = 0;
        let touchMoveY = 0;
        let isPulling = false;

        // Fullscreen Mode Handler
        const triggerFullScreenMode = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const docEl = document.documentElement;
                if (docEl.requestFullscreen) {
                    docEl.requestFullscreen().catch(() => {});
                } else if (docEl.webkitRequestFullscreen) {
                    docEl.webkitRequestFullscreen().catch(() => {});
                }
            }
        };

        const fullScreenToggleBtn = document.getElementById('fullScreenToggleBtn');
        if (fullScreenToggleBtn) {
            fullScreenToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    triggerFullScreenMode();
                    fullScreenToggleBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                    showNotification('Entered Fullscreen Mode', 'info');
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen().catch(() => {});
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen().catch(() => {});
                    }
                    fullScreenToggleBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                    showNotification('Exited Fullscreen Mode', 'info');
                }
            });
        }

        const refreshIndicator = document.createElement('div');
        refreshIndicator.id = 'pullToRefreshIndicator';
        refreshIndicator.style.cssText = `
            width: 100%; height: 0px; overflow: hidden; display: flex;
            align-items: center; justify-content: center; background: rgba(124, 58, 237, 0.15);
            color: white; font-size: 0.9rem; font-weight: 600; transition: height 0.2s ease, opacity 0.2s ease;
            gap: 10px; opacity: 0; border-bottom: 1px solid var(--glass-border);
        `;
        refreshIndicator.innerHTML = '<i class="fa-solid fa-rotate-right" id="pullSpinner"></i> <span>Pull to refresh feed</span>';
        mainContentEl.insertBefore(refreshIndicator, mainContentEl.firstChild);

        mainContentEl.addEventListener('touchstart', (e) => {
            if (mainContentEl.scrollTop <= 5) {
                touchStartY = e.touches[0].clientY;
                isPulling = true;
            } else {
                isPulling = false;
            }
        }, { passive: true });

        mainContentEl.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            touchMoveY = e.touches[0].clientY;
            const pullDistance = touchMoveY - touchStartY;
            if (pullDistance > 0 && mainContentEl.scrollTop <= 5) {
                const pullHeight = Math.min(pullDistance * 0.4, 70);
                refreshIndicator.style.height = `${pullHeight}px`;
                refreshIndicator.style.opacity = `${pullHeight / 70}`;
                const textSpan = refreshIndicator.querySelector('span');
                const spinner = refreshIndicator.querySelector('#pullSpinner');
                if (pullHeight >= 55) {
                    if (textSpan) textSpan.textContent = 'Release to refresh';
                    if (spinner) spinner.style.transform = 'rotate(180deg)';
                } else {
                    if (textSpan) textSpan.textContent = 'Pull to refresh feed';
                    if (spinner) spinner.style.transform = 'rotate(0deg)';
                }
            }
        }, { passive: true });

        mainContentEl.addEventListener('touchend', () => {
            if (!isPulling) return;
            isPulling = false;
            const currentHeight = parseInt(refreshIndicator.style.height || '0');
            if (currentHeight >= 55) {
                refreshIndicator.style.height = '50px';
                refreshIndicator.style.opacity = '1';
                const textSpan = refreshIndicator.querySelector('span');
                const spinner = refreshIndicator.querySelector('#pullSpinner');
                if (textSpan) textSpan.textContent = 'Refreshing music feed...';
                if (spinner) spinner.classList.add('fa-spin');

                loadView(currentView);
                showNotification('Music feed refreshed!', 'success');

                setTimeout(() => {
                    refreshIndicator.style.height = '0px';
                    refreshIndicator.style.opacity = '0';
                    if (spinner) spinner.classList.remove('fa-spin');
                }, 800);
            } else {
                refreshIndicator.style.height = '0px';
                refreshIndicator.style.opacity = '0';
            }
        }, { passive: true });
    }

    // Real Feature Release & App Update Notification Engine
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationBadge = document.getElementById('notificationBadge');

    if (notificationBtn && notificationsDropdown) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsDropdown.classList.toggle('hidden');
        });

        const appFeatureNotifications = [
            {
                id: 'feat_ytmusic_2026',
                icon: 'fa-brands fa-youtube',
                color: '#f87171',
                bg: 'rgba(239, 68, 68, 0.15)',
                title: 'New: YouTube Music Provider!',
                description: 'Search & stream 100% ad-free music from YouTube Music alongside JioSaavn.',
                time: 'New',
                target: 'search'
            },
            {
                id: 'feat_themes_2026',
                icon: 'fa-solid fa-palette',
                color: '#e879f9',
                bg: 'rgba(217, 70, 239, 0.15)',
                title: 'Live Theme Switcher',
                description: 'Choose between 6 dynamic liquid glass themes with persistent ambient lighting.',
                time: 'New',
                target: 'settings'
            },
            {
                id: 'feat_mobile_fab_2026',
                icon: 'fa-solid fa-mobile-screen-button',
                color: '#34d399',
                bg: 'rgba(16, 185, 129, 0.15)',
                title: 'Mobile FAB Dropdown Menu',
                description: 'Quickly access download, lyrics, and details from the floating action button.',
                time: 'Updated',
                target: 'home'
            },
            {
                id: 'feat_autoplay_2026',
                icon: 'fa-solid fa-circle-play',
                color: '#60a5fa',
                bg: 'rgba(59, 130, 246, 0.15)',
                title: 'Playlist Autoplay Engine',
                description: 'Seamless continuous track playback across playlists and album queues.',
                time: 'Updated',
                target: 'home'
            }
        ];

        const renderNotifications = () => {
            const readIds = JSON.parse(localStorage.getItem('vibentra_read_notifs') || '[]');
            const notifList = document.getElementById('notificationsList');
            const unreadCount = appFeatureNotifications.filter(n => !readIds.includes(n.id)).length;

            if (notificationBadge) {
                if (unreadCount > 0) {
                    notificationBadge.style.display = 'inline-flex';
                    notificationBadge.textContent = unreadCount.toString();
                } else {
                    notificationBadge.style.display = 'none';
                }
            }

            if (notifList) {
                if (appFeatureNotifications.length === 0) {
                    notifList.innerHTML = '<div class="empty-notif" style="padding: 20px; text-align: center; color: var(--text-muted);">No new notifications</div>';
                } else {
                    notifList.innerHTML = appFeatureNotifications.map(n => {
                        const isRead = readIds.includes(n.id);
                        return `
                            <div class="notification-item ${isRead ? '' : 'unread'}" data-id="${n.id}" data-target="${n.target}" style="display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--glass-border); cursor: pointer; transition: background 0.2s;">
                                <div style="width: 38px; height: 38px; border-radius: 50%; background: ${n.bg}; color: ${n.color}; display: flex; justify-content: center; align-items: center; font-size: 1.1rem; flex-shrink: 0;">
                                    <i class="${n.icon}"></i>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                                        <h4 style="font-size: 0.88rem; font-weight: 700; color: #FFFFFF; margin: 0;">${n.title}</h4>
                                        <span style="font-size: 0.7rem; color: ${n.color}; font-weight: 600;">${n.time}</span>
                                    </div>
                                    <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.35; margin: 0;">${n.description}</p>
                                </div>
                            </div>
                        `;
                    }).join('');

                    // Add click handlers to notification items
                    notifList.querySelectorAll('.notification-item').forEach(item => {
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const notifId = item.getAttribute('data-id');
                            const targetPath = item.getAttribute('data-target');

                            // Mark single notification as read
                            const currentRead = JSON.parse(localStorage.getItem('vibentra_read_notifs') || '[]');
                            if (!currentRead.includes(notifId)) {
                                currentRead.push(notifId);
                                localStorage.setItem('vibentra_read_notifs', JSON.stringify(currentRead));
                            }

                            notificationsDropdown.classList.add('hidden');
                            renderNotifications();

                            // Navigate to feature target
                            if (targetPath) {
                                const navItem = document.querySelector(`.nav-item[data-path="${targetPath}"]`);
                                if (navItem) navItem.click();
                            }
                        });
                    });
                }
            }
        };

        renderNotifications();

        document.getElementById('markAllReadBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const allIds = appFeatureNotifications.map(n => n.id);
            localStorage.setItem('vibentra_read_notifs', JSON.stringify(allIds));
            renderNotifications();
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

        switch (path) {
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

    // Global helper to create fully-featured music cards with working Like, Ringtone, Download, and Three Dots options
    function createSongCard(track, contextList = []) {
        const card = document.createElement('div');
        card.className = 'music-card song-card';
        card.setAttribute('data-id', track.id);

        const isFav = favoriteService.isFavorite(track.id);

        card.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}" alt="${track.title || 'Cover'}" loading="lazy">
                <div class="play-btn-overlay" title="Play ${track.title || 'Song'}">
                    <i class="fa-solid fa-play"></i>
                </div>
                <div class="card-quick-actions">
                    <button class="card-action-btn like-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Remove Favorite' : 'Add to Favorites'}">
                        <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>
                    <button class="card-action-btn ringtone-btn" title="Set as Ringtone Studio">
                        <i class="fa-solid fa-bell"></i>
                    </button>
                    <button class="card-action-btn download-btn" title="Download Song">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button class="card-action-btn more-btn" title="More Options">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </div>
            </div>
            <div class="card-info">
                <div class="card-title-row">
                    <h3 title="${track.title || 'Untitled Track'}">${track.title || 'Untitled Track'}</h3>
                    <button class="card-menu-trigger" title="Song options">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </div>
                <p title="${track.artist || 'Unknown Artist'}">${track.artist || 'Unknown Artist'}</p>
                ${track.provider ? `
                    <span style="font-size: 0.72rem; padding: 3px 8px; background: ${track.provider === 'YouTube Music' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.08)'}; color: ${track.provider === 'YouTube Music' ? '#f87171' : 'var(--text-muted)'}; border: 1px solid ${track.provider === 'YouTube Music' ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}; border-radius: 6px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; margin-top: 5px;">
                        <i class="${track.provider === 'YouTube Music' ? 'fa-brands fa-youtube' : 'fa-solid fa-music'}"></i>
                        ${track.provider}
                    </span>
                ` : ''}
            </div>

            <!-- Floating Glass Options Dropdown -->
            <div class="card-options-dropdown hidden">
                <div class="card-option-item opt-play">
                    <i class="fa-solid fa-play" style="color: var(--primary, #7C3AED);"></i> Play Now
                </div>
                <div class="card-option-item opt-like">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart" style="color: #EC4899;"></i> <span>${isFav ? 'Remove Favorite' : 'Add to Favorites'}</span>
                </div>
                <div class="card-option-item opt-ringtone">
                    <i class="fa-solid fa-bell" style="color: #F59E0B;"></i> Set as Ringtone Studio
                </div>
                <div class="card-option-item opt-download">
                    <i class="fa-solid fa-download" style="color: #10B981;"></i> Download Song
                </div>
                <div class="card-option-item opt-playlist">
                    <i class="fa-solid fa-folder-plus" style="color: #06B6D4;"></i> Save to Playlist
                </div>
                <div class="card-option-item opt-lyrics">
                    <i class="fa-solid fa-align-left" style="color: #8B5CF6;"></i> Show Lyrics
                </div>
            </div>
        `;

        // Interactive Handlers
        const playBtn = card.querySelector('.play-btn-overlay');
        const likeBtns = card.querySelectorAll('.like-btn, .opt-like');
        const ringtoneBtns = card.querySelectorAll('.ringtone-btn, .opt-ringtone');
        const downloadBtns = card.querySelectorAll('.download-btn, .opt-download');
        const playlistBtns = card.querySelectorAll('.opt-playlist');
        const lyricsBtns = card.querySelectorAll('.opt-lyrics');
        const optPlayBtn = card.querySelector('.opt-play');
        const moreBtn = card.querySelector('.more-btn');
        const menuTrigger = card.querySelector('.card-menu-trigger');
        const dropdown = card.querySelector('.card-options-dropdown');

        const triggerPlay = (e) => {
            e.stopPropagation();
            dropdown.classList.add('hidden');
            card.classList.remove('menu-open');
            musicService.playContext(contextList.length ? contextList : [track], track);
        };

        playBtn.addEventListener('click', triggerPlay);
        optPlayBtn?.addEventListener('click', triggerPlay);

        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-action-btn') || e.target.closest('.card-menu-trigger') || e.target.closest('.card-options-dropdown')) {
                return;
            }
            triggerPlay(e);
        });

        const updateLikeState = () => {
            const currentlyFav = favoriteService.isFavorite(track.id);
            card.querySelectorAll('.like-btn i, .opt-like i').forEach(icon => {
                icon.className = `${currentlyFav ? 'fa-solid' : 'fa-regular'} fa-heart`;
            });
            const likeActionBtn = card.querySelector('.like-btn');
            if (likeActionBtn) likeActionBtn.classList.toggle('active', currentlyFav);
            const optLikeText = card.querySelector('.opt-like span');
            if (optLikeText) optLikeText.textContent = currentlyFav ? 'Remove Favorite' : 'Add to Favorites';
        };

        likeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                favoriteService.toggleFavorite(track);
                updateLikeState();
            });
        });

        ringtoneBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.add('hidden');
                card.classList.remove('menu-open');
                musicService.openRingtoneModal(track);
            });
        });

        downloadBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.add('hidden');
                card.classList.remove('menu-open');
                musicService.downloadTrack(track);
            });
        });

        playlistBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.add('hidden');
                card.classList.remove('menu-open');
                musicService.openAddToPlaylistModal(track);
            });
        });

        lyricsBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.add('hidden');
                card.classList.remove('menu-open');
                musicService.showLyricsModal(track);
            });
        });

        const toggleMenu = (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');

            document.querySelectorAll('.card-options-dropdown').forEach(d => d.classList.add('hidden'));
            document.querySelectorAll('.music-card').forEach(c => c.classList.remove('menu-open'));

            if (isHidden) {
                dropdown.classList.remove('hidden');
                card.classList.add('menu-open');
            } else {
                dropdown.classList.add('hidden');
                card.classList.remove('menu-open');
            }
        };

        moreBtn?.addEventListener('click', toggleMenu);
        menuTrigger?.addEventListener('click', toggleMenu);

        return card;
    }

    // Dismiss open dropdowns on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.music-card')) {
            document.querySelectorAll('.card-options-dropdown').forEach(d => d.classList.add('hidden'));
            document.querySelectorAll('.music-card').forEach(c => c.classList.remove('menu-open'));
        }
    });

    // Views Rendering
    async function renderHome() {
        const quickItems = [
            { title: 'Karuppu All Songs (Tamil)', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80', query: 'Karuppu Tamil' },
            { title: 'Gentleman', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', query: 'Gentleman AR Rahman' },
            { title: 'Rajinimurugan (OST)', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80', query: 'Rajinimurugan Imman' },
            { title: 'Jana Nayagan (Tamil)', cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80', query: 'Jana Nayagan' },
            { title: 'Karuppu (Original Motion Picture)', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80', query: 'Karuppu Soundtrack' },
            { title: 'Ayyappan Tamil Hits', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80', query: 'Ayyappan Tamil' },
            { title: 'Maan Karate (OST)', cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80', query: 'Maan Karate Anirudh' },
            { title: 'Unnikrishnan Best Hits', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80', query: 'Unnikrishnan Tamil' }
        ];

        let quickHtml = '';
        quickItems.forEach(item => {
            quickHtml += `
                <div class="spotify-quick-card" data-query="${item.query}">
                    <img src="${item.cover}" alt="cover">
                    <span>${item.title}</span>
                    <button class="spotify-quick-play-btn"><i class="fa-solid fa-play"></i></button>
                </div>
            `;
        });

        dynamicContent.innerHTML = `
            <!-- Spotify Filter Chips (Desktop View) -->
            <div class="spotify-filter-chips desktop-only-el" style="margin-bottom: 20px;">
                <button class="chip active">All</button>
                <button class="chip">Music</button>
                <button class="chip">Podcasts</button>
            </div>

            <!-- Spotify 2-Column Quick Grid (Desktop View) -->
            <div class="spotify-quick-grid desktop-only-el">
                ${quickHtml}
            </div>

            <div class="welcome-banner" style="margin-bottom: 20px;">
                <div>
                    <h1 style="font-size: 2.2rem; margin-bottom: 6px;">Good evening</h1>
                    <p style="opacity: 0.8;">Ready for some new tunes?</p>
                </div>
            </div>

            <div id="homeRecentSection" style="display: none;">
                <div class="section-header">
                    <h2>Jump back in</h2>
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

        // Bind Quick Grid Click Handlers
        document.querySelectorAll('.spotify-quick-card').forEach(card => {
            card.addEventListener('click', async () => {
                const query = card.getAttribute('data-query');
                const searchNavBtn = document.querySelector('.nav-item[data-path="search"]');
                if (searchNavBtn) {
                    searchNavBtn.click();
                    setTimeout(() => {
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) {
                            searchInput.value = query;
                            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }, 50);
                }
            });
        });

        const history = historyService.getHistory();
        if (history.length > 0) {
            document.getElementById('homeRecentSection').style.display = 'block';
            const recentGrid = document.getElementById('homeRecentGrid');
            recentGrid.innerHTML = '';

            history.slice(0, 5).forEach(track => {
                recentGrid.appendChild(createSongCard(track, history));
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
                    trendingGrid.appendChild(createSongCard(track, trendingResults));
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

            } catch (e) {
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

    function renderSearch(initialQuery = '') {
        const topGenres = [
            { id: 'dance', title: 'Dance/\nElectronic', color: '#27856A', query: 'Dance Electronic', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80' },
            { id: 'indie', title: 'Indie', color: '#6082B6', query: 'Indie Hits', img: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&q=80' },
            { id: 'pop', title: 'Pop', color: '#148A08', query: 'Pop Hits', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
            { id: 'hiphop', title: 'Hip-Hop', color: '#BA5D07', query: 'Hip Hop Rap', img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80' }
        ];

        const browseAllGenres = [
            { id: 'mood', title: 'Mood', color: '#509BF5', query: 'Feel Good Mood', img: 'https://images.unsplash.com/photo-1499417265504-37060e8d5144?w=300&q=80' },
            { id: 'rnb', title: 'R&B', color: '#B02897', query: 'R&B Soul', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80' },
            { id: 'rock', title: 'Rock', color: '#E61E32', query: 'Rock Hits', img: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&q=80' },
            { id: 'focus', title: 'Focus', color: '#477D95', query: 'Focus Study Lofi', img: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80' },
            { id: 'devotional', title: 'Devotional', color: '#E59700', query: 'Devotional Songs', img: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&q=80' },
            { id: 'romance', title: 'Romance', color: '#DC148C', query: 'Romance Love Songs', img: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&q=80' },
            { id: 'party', title: 'Party', color: '#AF2896', query: 'Party Anthems', img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80' },
            { id: 'workout', title: 'Workout', color: '#1E3264', query: 'Workout Gym Energy', img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&q=80' },
            { id: 'trending', title: 'Trending', color: '#8400E7', query: 'Top Trending Hits', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80' },
            { id: 'chill', title: 'Chill', color: '#006450', query: 'Chill Acoustic Vibes', img: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&q=80' }
        ];

        // Storage for Recent Searches
        const getRecentSearches = () => {
            try {
                return JSON.parse(localStorage.getItem('vibentra_recent_searches')) || [];
            } catch {
                return [];
            }
        };

        const saveRecentSearch = (queryStr) => {
            if (!queryStr || !queryStr.trim()) return;
            let list = getRecentSearches();
            list = list.filter(q => q.toLowerCase() !== queryStr.toLowerCase().trim());
            list.unshift(queryStr.trim());
            if (list.length > 8) list = list.slice(0, 8);
            localStorage.setItem('vibentra_recent_searches', JSON.stringify(list));
        };

        const removeRecentSearch = (queryStr) => {
            let list = getRecentSearches();
            list = list.filter(q => q !== queryStr);
            localStorage.setItem('vibentra_recent_searches', JSON.stringify(list));
        };

        dynamicContent.innerHTML = `
            <div class="spotify-search-page">
                <h1 class="spotify-search-title">Search</h1>
                
                <div class="spotify-search-bar-container">
                    <i class="fa-solid fa-magnifying-glass spotify-search-icon"></i>
                    <input type="text" class="spotify-search-input" id="searchInput" value="${initialQuery}" placeholder="Artists, songs, or podcasts" autocomplete="off">
                    <button id="spotifyClearBtn" class="spotify-clear-btn" style="display: none;" title="Clear search">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button id="voiceSearchBtn" class="spotify-voice-btn" title="Search by singing or humming">
                        <i class="fa-solid fa-microphone"></i>
                    </button>
                </div>

                <div id="searchDynamicContainer">
                    <!-- Genre browse & recent searches view initialized below -->
                </div>
            </div>
        `;

        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('spotifyClearBtn');
        const dynamicContainer = document.getElementById('searchDynamicContainer');
        let activeFilter = 'all'; // 'all', 'songs', 'artists', 'albums', 'playlists'
        let currentResults = null;
        let searchDebounce;

        // Render Home Browse / Genre Grid State
        const renderDefaultBrowseState = () => {
            const recent = getRecentSearches();
            let recentHtml = '';
            if (recent.length > 0) {
                recentHtml = `
                    <div class="spotify-recent-searches">
                        <div class="spotify-recent-header">
                            <span class="spotify-recent-title">Recent searches</span>
                            <button class="spotify-recent-clear-all" id="clearAllRecentBtn">Clear all</button>
                        </div>
                        <div class="spotify-recent-list">
                            ${recent.map(item => `
                                <div class="spotify-recent-item" data-query="${item}">
                                    <span>${item}</span>
                                    <i class="fa-solid fa-xmark spotify-recent-remove" data-remove="${item}"></i>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            dynamicContainer.innerHTML = `
                ${recentHtml}

                <div class="spotify-genre-section">
                    <h2 class="spotify-genre-section-title">Your top genres</h2>
                    <div class="spotify-genre-grid">
                        ${topGenres.map(g => `
                            <div class="spotify-genre-card" style="background: ${g.color};" data-query="${g.query}">
                                <span class="spotify-genre-title">${g.title.replace('\n', '<br>')}</span>
                                <img src="${g.img}" class="spotify-genre-img" alt="${g.title}" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="spotify-genre-section">
                    <h2 class="spotify-genre-section-title">Browse all</h2>
                    <div class="spotify-genre-grid">
                        ${browseAllGenres.map(g => `
                            <div class="spotify-genre-card" style="background: ${g.color};" data-query="${g.query}">
                                <span class="spotify-genre-title">${g.title}</span>
                                <img src="${g.img}" class="spotify-genre-img" alt="${g.title}" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Recent search item clicks
            document.querySelectorAll('.spotify-recent-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.spotify-recent-remove')) return;
                    const q = el.getAttribute('data-query');
                    searchInput.value = q;
                    triggerSearch(q);
                });
            });

            // Recent remove button clicks
            document.querySelectorAll('.spotify-recent-remove').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetQ = el.getAttribute('data-remove');
                    removeRecentSearch(targetQ);
                    renderDefaultBrowseState();
                });
            });

            document.getElementById('clearAllRecentBtn')?.addEventListener('click', () => {
                localStorage.removeItem('vibentra_recent_searches');
                renderDefaultBrowseState();
            });

            // Genre card click triggers search
            document.querySelectorAll('.spotify-genre-card').forEach(card => {
                card.addEventListener('click', () => {
                    const q = card.getAttribute('data-query');
                    const lang = localStorage.getItem('vibentra_lang_pref') || 'English';
                    const fullQuery = lang !== 'English' ? `${lang} ${q}` : q;
                    searchInput.value = fullQuery;
                    triggerSearch(fullQuery);
                });
            });
        };

        // Render Active Search Results View
        const renderResultsView = (results, filter = 'all') => {
            activeFilter = filter;
            if (!results) return;

            const hasSongs = results.songs && results.songs.length > 0;
            const hasAlbums = results.albums && results.albums.length > 0;
            const hasPlaylists = results.playlists && results.playlists.length > 0;

            if (!hasSongs && !hasAlbums && !hasPlaylists) {
                dynamicContainer.innerHTML = `
                    <div style="text-align: center; padding: 50px 20px; color: rgba(255,255,255,0.6);">
                        <i class="fa-solid fa-magnifying-glass" style="font-size: 2.5rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <h3>No results found for "${searchInput.value}"</h3>
                        <p style="font-size: 0.9rem; margin-top: 5px;">Please check spelling or try another keyword.</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="spotify-filter-chips">
                    <button class="spotify-chip ${filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                    ${hasSongs ? `<button class="spotify-chip ${filter === 'songs' ? 'active' : ''}" data-filter="songs">Songs</button>` : ''}
                    ${hasAlbums ? `<button class="spotify-chip ${filter === 'albums' ? 'active' : ''}" data-filter="albums">Albums</button>` : ''}
                    ${hasPlaylists ? `<button class="spotify-chip ${filter === 'playlists' ? 'active' : ''}" data-filter="playlists">Playlists</button>` : ''}
                </div>
                <div id="resultsContentArea"></div>
            `;

            dynamicContainer.innerHTML = html;

            // Bind Filter Chips
            document.querySelectorAll('.spotify-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const f = chip.getAttribute('data-filter');
                    renderResultsView(results, f);
                });
            });

            const contentArea = document.getElementById('resultsContentArea');
            contentArea.innerHTML = '';

            // Filter: ALL
            if (filter === 'all') {
                // Top Result Card (Song #1)
                if (hasSongs) {
                    const topTrack = results.songs[0];
                    const topCard = document.createElement('div');
                    topCard.className = 'spotify-top-result-card';
                    topCard.innerHTML = `
                        <img src="${topTrack.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}" class="spotify-top-result-img" alt="${topTrack.title}">
                        <div>
                            <h2 class="spotify-top-result-title">${topTrack.title}</h2>
                            <div class="spotify-top-result-sub">
                                <span class="spotify-badge">Song</span>
                                <span>${topTrack.artist || 'Unknown Artist'}</span>
                            </div>
                        </div>
                        <div class="spotify-top-result-play-btn" title="Play ${topTrack.title}">
                            <i class="fa-solid fa-play"></i>
                        </div>
                    `;
                    topCard.addEventListener('click', () => {
                        musicService.playContext(results.songs, topTrack);
                    });
                    contentArea.appendChild(topCard);

                    // Songs Grid
                    const songsSection = document.createElement('div');
                    songsSection.style.marginBottom = '30px';
                    songsSection.innerHTML = `<h2 class="spotify-genre-section-title">Songs</h2>`;
                    const songsGrid = document.createElement('div');
                    songsGrid.className = 'cards-grid';
                    results.songs.slice(0, 6).forEach(track => {
                        songsGrid.appendChild(createSongCard(track, results.songs));
                    });
                    songsSection.appendChild(songsGrid);
                    contentArea.appendChild(songsSection);
                }

                // Albums Grid
                if (hasAlbums) {
                    const albumSec = document.createElement('div');
                    albumSec.style.marginBottom = '30px';
                    albumSec.innerHTML = `<h2 class="spotify-genre-section-title">Albums</h2>`;
                    const albumGrid = document.createElement('div');
                    albumGrid.className = 'cards-grid';
                    results.albums.slice(0, 4).forEach(album => {
                        albumGrid.appendChild(createAlbumCard(album));
                    });
                    albumSec.appendChild(albumGrid);
                    contentArea.appendChild(albumSec);
                }

                // Playlists Grid
                if (hasPlaylists) {
                    const plSec = document.createElement('div');
                    plSec.style.marginBottom = '30px';
                    plSec.innerHTML = `<h2 class="spotify-genre-section-title">Playlists</h2>`;
                    const plGrid = document.createElement('div');
                    plGrid.className = 'cards-grid';
                    results.playlists.slice(0, 4).forEach(pl => {
                        plGrid.appendChild(createPlaylistCard(pl));
                    });
                    plSec.appendChild(plGrid);
                    contentArea.appendChild(plSec);
                }

            } else if (filter === 'songs') {
                const songsSection = document.createElement('div');
                songsSection.innerHTML = `<h2 class="spotify-genre-section-title">All Songs</h2>`;
                const songsGrid = document.createElement('div');
                songsGrid.className = 'cards-grid';
                results.songs.forEach(track => {
                    songsGrid.appendChild(createSongCard(track, results.songs));
                });
                songsSection.appendChild(songsGrid);
                contentArea.appendChild(songsSection);

            } else if (filter === 'albums') {
                const albumSec = document.createElement('div');
                albumSec.innerHTML = `<h2 class="spotify-genre-section-title">All Albums</h2>`;
                const albumGrid = document.createElement('div');
                albumGrid.className = 'cards-grid';
                results.albums.forEach(album => {
                    albumGrid.appendChild(createAlbumCard(album));
                });
                albumSec.appendChild(albumGrid);
                contentArea.appendChild(albumSec);

            } else if (filter === 'playlists') {
                const plSec = document.createElement('div');
                plSec.innerHTML = `<h2 class="spotify-genre-section-title">All Playlists</h2>`;
                const plGrid = document.createElement('div');
                plGrid.className = 'cards-grid';
                results.playlists.forEach(pl => {
                    plGrid.appendChild(createPlaylistCard(pl));
                });
                plSec.appendChild(plGrid);
                contentArea.appendChild(plSec);
            }
        };

        // Helper to create Album Card
        const createAlbumCard = (album) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.innerHTML = `
                <div class="card-img-wrapper" style="position: relative;">
                    <img src="${album.cover}" alt="Cover" loading="lazy">
                    <div class="play-btn-overlay" title="Play Album"><i class="fa-solid fa-folder-open"></i></div>
                    <button class="save-to-playlist-btn" title="Save as local playlist" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; z-index: 5; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
                <div class="card-info">
                    <h3>${album.title}</h3>
                    <p>${album.artist}</p>
                    <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display: inline-block; margin-top: 5px; color: rgba(255,255,255,0.6);">Album</span>
                </div>
            `;
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
            card.addEventListener('click', () => {
                renderRemoteCollectionDetail(album, 'album', searchInput.value);
            });
            card.querySelector('.save-to-playlist-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                showNotification(`Saving '${album.title}' to your playlists...`);
                const albumTracks = await providerManager.getAlbum('jiosaavn', album.id);
                if (albumTracks && albumTracks.length > 0) {
                    const newPl = playlistService.createPlaylist(album.title, `Saved Album: ${album.artist}`);
                    albumTracks.forEach(track => playlistService.addTrackToPlaylist(newPl.id, track));
                    showNotification(`Saved '${album.title}' as a new playlist!`);
                } else {
                    showNotification('Failed to load album tracks for saving', 'error');
                }
            });
            return card;
        };

        // Helper to create Playlist Card
        const createPlaylistCard = (pl) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.innerHTML = `
                <div class="card-img-wrapper" style="position: relative;">
                    <img src="${pl.cover}" alt="Cover" loading="lazy">
                    <div class="play-btn-overlay" title="Play Playlist"><i class="fa-solid fa-folder-open"></i></div>
                    <button class="save-to-playlist-btn" title="Save as local playlist" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; z-index: 5; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
                <div class="card-info">
                    <h3>${pl.title}</h3>
                    <p>${pl.artist || 'JioSaavn'}</p>
                    <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display: inline-block; margin-top: 5px; color: rgba(255,255,255,0.6);">Playlist</span>
                </div>
            `;
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
            card.addEventListener('click', () => {
                renderRemoteCollectionDetail(pl, 'playlist', searchInput.value);
            });
            card.querySelector('.save-to-playlist-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                showNotification(`Saving '${pl.title}' to your playlists...`);
                const plTracks = await providerManager.getPlaylist('jiosaavn', pl.id);
                if (plTracks && plTracks.length > 0) {
                    const newPl = playlistService.createPlaylist(pl.title, `Saved JioSaavn Playlist`);
                    plTracks.forEach(track => playlistService.addTrackToPlaylist(newPl.id, track));
                    showNotification(`Saved '${pl.title}' as a new playlist!`);
                } else {
                    showNotification('Failed to load playlist tracks for saving', 'error');
                }
            });
            return card;
        };

        // Execution of Search Query
        const triggerSearch = async (query) => {
            const cleanQuery = query ? query.trim() : '';
            if (!cleanQuery) {
                clearBtn.style.display = 'none';
                renderDefaultBrowseState();
                return;
            }

            clearBtn.style.display = 'flex';
            dynamicContainer.innerHTML = `
                <div style="padding: 40px 0; text-align: center; color: rgba(255,255,255,0.7);">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: #1DB954; margin-bottom: 12px;"></i>
                    <p style="font-size: 0.95rem; font-weight: 600;">Searching across YouTube Music & JioSaavn...</p>
                </div>
            `;

            saveRecentSearch(cleanQuery);
            currentResults = await searchService.searchAll(cleanQuery);
            renderResultsView(currentResults, 'all');
        };

        // Event Listeners for Search Bar
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            clearBtn.style.display = val ? 'flex' : 'none';
            clearTimeout(searchDebounce);

            if (!val.trim()) {
                renderDefaultBrowseState();
                return;
            }

            searchDebounce = setTimeout(() => {
                triggerSearch(val);
            }, 450);
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchInput.focus();
            renderDefaultBrowseState();
        });

        // Voice Search Microphone logic
        const voiceSearchBtn = document.getElementById('voiceSearchBtn');
        let isRecording = false;
        let mediaRecorder;
        let audioChunks = [];

        voiceSearchBtn.addEventListener('click', async () => {
            if (isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                voiceSearchBtn.classList.remove('recording');
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());

                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = reader.result;
                        showNotification('Recognizing audio...', 'success');

                        try {
                            const response = await fetch('http://localhost:5000/api/jiosaavn/recognize', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ audioData: base64Audio })
                            });
                            const data = await response.json();

                            if (data.success && data.track) {
                                showNotification('Song recognized!');
                                searchInput.value = data.track.title;
                                triggerSearch(data.track.title);
                            } else {
                                showNotification('Could not recognize the song', 'error');
                            }
                        } catch (err) {
                            showNotification('Error recognizing audio', 'error');
                        }
                    };
                };

                mediaRecorder.start();
                isRecording = true;
                voiceSearchBtn.classList.add('recording');
                showNotification('Listening... Sing or hum a song!', 'success');

                setTimeout(() => {
                    if (isRecording) voiceSearchBtn.click();
                }, 5000);

            } catch (err) {
                console.error("Microphone access error:", err);
                showNotification('Microphone access denied or unavailable', 'error');
            }
        });

        // Initialize state
        if (initialQuery) {
            triggerSearch(initialQuery);
        } else {
            renderDefaultBrowseState();
        }
    }


    async function renderRemoteCollectionDetail(collection, type, currentQuery = '') {
        dynamicContent.innerHTML = `
            <div class="section-header" style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <button class="btn" id="backFromRemoteBtn" style="background: transparent; border: 1px solid var(--border); padding: 8px 15px; border-radius: 20px; display: flex; align-items: center; gap: 5px;"><i class="fa-solid fa-arrow-left"></i> Back</button>
            </div>
            <div style="display: flex; align-items: flex-end; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
                <img src="${collection.cover}" style="width: 180px; height: 180px; border-radius: 10px; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="flex: 1;">
                    <p style="margin: 0 0 5px 0; color: var(--text-muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">${type === 'album' ? 'Album' : 'Playlist'}</p>
                    <h2 style="margin: 0 0 10px 0; font-size: clamp(1.5rem, 5vw, 3rem); font-family: 'Delius', cursive;">${collection.title}</h2>
                    <p style="margin: 0; color: var(--text-muted);">${collection.artist || 'JioSaavn'}</p>
                    <button class="btn" id="playAllRemoteBtn" style="margin-top: 20px; background: white; color: black; padding: 12px 30px; border-radius: 30px; font-weight: bold; font-size: 1.1rem; border: none; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-play"></i> Play</button>
                </div>
            </div>
            <div class="track-list" id="remoteTrackList">
                <p style="color: var(--primary);">Loading tracks...</p>
            </div>
        `;

        document.getElementById('backFromRemoteBtn').addEventListener('click', () => {
            renderSearch(currentQuery);
        });

        let remoteTracks = [];
        try {
            if (type === 'album') {
                remoteTracks = await providerManager.getAlbum('jiosaavn', collection.id);
            } else {
                remoteTracks = await providerManager.getPlaylist('jiosaavn', collection.id);
            }

            document.getElementById('playAllRemoteBtn').addEventListener('click', () => {
                if (remoteTracks.length > 0) {
                    musicService.playContext(remoteTracks, remoteTracks[0]);
                }
            });

            const trackListContainer = document.getElementById('remoteTrackList');
            if (!remoteTracks || remoteTracks.length === 0) {
                trackListContainer.innerHTML = '<p style="color: var(--text-muted);">No tracks found in this collection.</p>';
                return;
            }

            trackListContainer.className = 'cards-grid';
            trackListContainer.innerHTML = '';

            remoteTracks.forEach(track => {
                trackListContainer.appendChild(createSongCard(track, remoteTracks));
            });

        } catch (error) {
            console.error(error);
            document.getElementById('remoteTrackList').innerHTML = '<p style="color: #ef4444;">Failed to load collection tracks.</p>';
        }
    }

    function renderMosaicCover(tracks) {
        const validCovers = (tracks || []).map(t => t.cover).filter(c => !!c);
        if (validCovers.length >= 4) {
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width: 100%; height: 100%;">
                    <img src="${validCovers[0]}" style="width: 100%; height: 100%; object-fit: cover;">
                    <img src="${validCovers[1]}" style="width: 100%; height: 100%; object-fit: cover;">
                    <img src="${validCovers[2]}" style="width: 100%; height: 100%; object-fit: cover;">
                    <img src="${validCovers[3]}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
            `;
        } else if (validCovers.length > 0) {
            return `<img src="${validCovers[0]}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            return `
                <div style="width: 100%; height: 100%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; justify-content: center; align-items: center;">
                    <i class="fa-solid fa-music" style="font-size: 2.2rem; color: rgba(255,255,255,0.75);"></i>
                </div>
            `;
        }
    }

    function renderPlaylists() {
        const playlists = playlistService.getPlaylists();

        let html = `
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Your Playlists</h2>
                <button class="btn btn-primary" id="openCreatePlaylistBtn" style="border-radius: 20px; padding: 10px 20px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-plus"></i> Create Playlist
                </button>
            </div>
            <div class="playlist-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px;">
        `;

        playlists.forEach(pl => {
            html += `
                <div class="music-card playlist-card" data-id="${pl.id}" style="display: flex; align-items: center; gap: 16px; padding: 14px; width: 100%; border-radius: 18px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); transition: all 0.3s ease; cursor: pointer;">
                    <div class="playlist-img-wrapper" style="width: 72px; height: 72px; flex-shrink: 0; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.4); background: rgba(255,255,255,0.05);">
                        ${renderMosaicCover(pl.tracks)}
                    </div>
                    <div class="playlist-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                        <h3 style="margin: 0 0 4px 0; font-size: 1.1rem; font-weight: 700; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pl.name}</h3>
                        <p style="margin: 0; color: var(--text-muted); font-size: 0.84rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pl.description || 'Custom Playlist'}</p>
                        <span style="font-size: 0.78rem; color: var(--primary); font-weight: 600; margin-top: 4px;">${pl.tracks.length} ${pl.tracks.length === 1 ? 'Track' : 'Tracks'}</span>
                    </div>
                    <div class="playlist-actions" style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
                        <button class="btn edit-pl-btn" data-id="${pl.id}" title="Edit Playlist" style="background: rgba(255,255,255,0.08); border-radius: 50%; width: 36px; height: 36px; border: none; color: white; cursor: pointer; transition: background 0.2s; display: flex; justify-content: center; align-items: center;"><i class="fa-solid fa-pen" style="font-size: 0.85rem;"></i></button>
                        <button class="btn delete-pl-btn" data-id="${pl.id}" title="Delete Playlist" style="background: rgba(239, 68, 68, 0.15); border-radius: 50%; width: 36px; height: 36px; border: none; color: #ef4444; cursor: pointer; transition: background 0.2s; display: flex; justify-content: center; align-items: center;"><i class="fa-solid fa-trash" style="font-size: 0.85rem;"></i></button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        dynamicContent.innerHTML = html;

        // Add Event Listeners
        document.getElementById('openCreatePlaylistBtn')?.addEventListener('click', () => {
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

        // Calculate Total Duration
        let totalSeconds = 0;
        (pl.tracks || []).forEach(t => {
            if (t.duration) {
                const parts = t.duration.split(':');
                if (parts.length === 2) {
                    totalSeconds += (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
                }
            } else {
                totalSeconds += 210;
            }
        });
        let durationText = '';
        if (totalSeconds >= 3600) {
            const hrs = Math.floor(totalSeconds / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            durationText = `${hrs}h ${mins}m`;
        } else {
            const mins = Math.floor(totalSeconds / 60);
            durationText = `${mins} mins`;
        }

        // Creator metadata
        const username = document.getElementById('welcomeName')?.textContent || 'User';
        const topAvatar = document.getElementById('topProfileImg');
        const avatarSrc = topAvatar && topAvatar.src && !topAvatar.src.includes('ui-avatars') ? topAvatar.src : null;
        const avatarInitial = username.charAt(0).toUpperCase();

        let html = `
            <div class="spotify-playlist-view" style="max-width: 850px; margin: 0 auto; padding-bottom: 90px;">
                <!-- Top Back Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <button class="btn btn-outline" id="backToPlaylistsBtn" style="border-radius: 50%; width: 42px; height: 42px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.05); color: white; cursor: pointer;">
                        <i class="fa-solid fa-chevron-left" style="font-size: 1.1rem;"></i>
                    </button>
                </div>

                <!-- Hero Section (Spotify Style Collage & Meta) -->
                <div style="display: flex; gap: 24px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 24px;">
                    <!-- Cover Art Collage -->
                    <div class="playlist-cover-mosaic" style="width: 160px; height: 160px; flex-shrink: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 14px 35px rgba(0,0,0,0.6); background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);">
                        ${renderMosaicCover(pl.tracks)}
                    </div>

                    <!-- Title & Creator Info -->
                    <div style="flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <h1 style="font-size: 2.2rem; font-weight: 800; color: #FFFFFF; margin: 0; line-height: 1.1; letter-spacing: -0.5px;">${pl.name}</h1>
                            <button id="headerEditPlBtn" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid var(--glass-border); padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; cursor: pointer; backdrop-filter: blur(10px); transition: background 0.2s;">
                                Edit
                            </button>
                        </div>
                        
                        ${pl.description ? `<p style="color: rgba(255,255,255,0.75); font-size: 0.9rem; margin: 0;">${pl.description}</p>` : ''}

                        <!-- Creator Avatar & Name -->
                        <div style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: #FFFFFF; margin-top: 4px;">
                            <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; color: white; overflow: hidden; flex-shrink: 0;">
                                ${avatarSrc ? `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span>${avatarInitial}</span>`}
                            </div>
                            <span style="font-weight: 700;">${username}</span>
                        </div>

                        <!-- Duration & Track Count Meta -->
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
                            <i class="fa-solid fa-earth-americas" style="font-size: 0.85rem;"></i>
                            <span>${pl.tracks.length} ${pl.tracks.length === 1 ? 'song' : 'songs'} • ${durationText}</span>
                        </div>
                    </div>
                </div>

                <!-- Spotify Action Bar -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px;">
                    <!-- Left Quick Control Icons -->
                    <div style="display: flex; align-items: center; gap: 18px;">
                        <!-- Download All Icon Button -->
                        <button id="downloadAllPlBtn" title="Download all songs in playlist" style="background: none; border: none; color: var(--text-muted); font-size: 1.4rem; cursor: pointer; transition: transform 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-regular fa-circle-down"></i>
                        </button>
                        
                        <!-- Add Collaborator / Add Songs Button -->
                        <button id="addSongsPlBtn" title="Add songs to playlist" style="background: none; border: none; color: var(--text-muted); font-size: 1.3rem; cursor: pointer; transition: transform 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-user-plus"></i>
                        </button>

                        <!-- Share Playlist Button -->
                        <button id="sharePlBtn" title="Share playlist link" style="background: none; border: none; color: var(--text-muted); font-size: 1.3rem; cursor: pointer; transition: transform 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-arrow-up-from-bracket"></i>
                        </button>

                        <!-- More Options Button -->
                        <button id="morePlOptionsBtn" title="Playlist options" style="background: none; border: none; color: var(--text-muted); font-size: 1.4rem; cursor: pointer; transition: transform 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-ellipsis"></i>
                        </button>
                    </div>

                    <!-- Right Play Control Icons -->
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <!-- Shuffle Button -->
                        <button id="shufflePlBtn" title="Shuffle Play" style="background: none; border: none; color: var(--text-muted); font-size: 1.4rem; cursor: pointer; transition: color 0.2s;">
                            <i class="fa-solid fa-shuffle"></i>
                        </button>

                        <!-- Giant Green Play Button -->
                        <button id="playAllPlBtn" title="Play All" style="width: 54px; height: 54px; border-radius: 50%; background: #1DB954; color: #000000; border: none; font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(29, 185, 84, 0.4); transition: transform 0.2s, background 0.2s; padding-left: 3px;">
                            <i class="fa-solid fa-play"></i>
                        </button>
                    </div>
                </div>

                <!-- Filter & Action Pill Buttons -->
                <div style="display: flex; gap: 10px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px;">
                    <button id="chipAddSongsBtn" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: white; padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <i class="fa-solid fa-plus"></i> Add
                    </button>
                    <button id="chipSortBtn" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: white; padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <i class="fa-solid fa-arrow-down-up-between"></i> Sort
                    </button>
                    <button id="chipEditBtn" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: white; padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                </div>

                <!-- Track List -->
                <div id="playlistDetailTrackList" style="display: flex; flex-direction: column; gap: 4px;">
        `;

        if (pl.tracks.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed var(--glass-border);">
                    <i class="fa-solid fa-music" style="font-size: 2.5rem; opacity: 0.4; margin-bottom: 12px; display: block;"></i>
                    <p style="margin: 0 0 12px 0; font-size: 0.95rem;">No tracks in this playlist yet.</p>
                    <button class="btn btn-primary" id="emptyAddSongsBtn" style="border-radius: 20px; padding: 8px 18px; font-size: 0.85rem;">Find songs to add</button>
                </div>
            `;
        } else {
            pl.tracks.forEach((track, index) => {
                html += `
                <div class="spotify-track-row" data-id="${track.id}" data-index="${index}" style="display: flex; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 12px; transition: background 0.2s; cursor: pointer; position: relative;">
                    <img src="${track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                        <h4 style="font-size: 0.95rem; font-weight: 700; color: #FFFFFF; margin: 0 0 3px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.title || 'Untitled Track'}</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${track.artist || 'Unknown Artist'}
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                        <span style="font-size: 0.8rem; color: var(--text-muted); margin-right: 6px;">${track.duration || ''}</span>
                        <button class="remove-from-pl-btn" data-id="${track.id}" title="Remove track from playlist" style="background: none; border: none; color: var(--text-muted); font-size: 1.1rem; padding: 8px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s, color 0.2s;">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                    </div>
                </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;
        dynamicContent.innerHTML = html;

        // Add Listeners
        document.getElementById('backToPlaylistsBtn')?.addEventListener('click', () => {
            renderPlaylists();
        });

        // Edit handlers
        const openEditModal = () => {
            document.getElementById('playlistModalTitle').textContent = 'Edit Playlist';
            document.getElementById('editingPlaylistId').value = pl.id;
            document.getElementById('playlistNameInput').value = pl.name;
            document.getElementById('playlistDescInput').value = pl.description || '';
            document.getElementById('playlistModal').classList.add('active');
        };
        document.getElementById('headerEditPlBtn')?.addEventListener('click', openEditModal);
        document.getElementById('chipEditBtn')?.addEventListener('click', openEditModal);

        // Play All / Toggle Play-Pause
        const playAllBtn = document.getElementById('playAllPlBtn');
        if (playAllBtn) {
            const isPlayingThisPl = musicService.currentTrack && pl.tracks.some(t => String(t.id) === String(musicService.currentTrack.id));
            if (isPlayingThisPl && musicService.isPlaying) {
                playAllBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            } else {
                playAllBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }

            playAllBtn.addEventListener('click', () => {
                if (pl.tracks.length === 0) {
                    showNotification('No songs in playlist to play', 'info');
                    return;
                }
                const isCurrentPlayingInPl = musicService.currentTrack && pl.tracks.some(t => String(t.id) === String(musicService.currentTrack.id));
                if (isCurrentPlayingInPl) {
                    musicService.togglePlayPause();
                    playAllBtn.innerHTML = musicService.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
                } else {
                    musicService.playContext(pl.tracks, pl.tracks[0]);
                    playAllBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                }
            });
        }

        // Shuffle
        document.getElementById('shufflePlBtn')?.addEventListener('click', () => {
            if (pl.tracks.length === 0) {
                showNotification('No songs in playlist to shuffle', 'info');
                return;
            }
            const shuffled = [...pl.tracks].sort(() => Math.random() - 0.5);
            musicService.playContext(shuffled, shuffled[0]);
            if (playAllBtn) playAllBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            showNotification('Shuffling playlist playback', 'info');
        });

        // Download All
        document.getElementById('downloadAllPlBtn')?.addEventListener('click', async () => {
            if (pl.tracks.length === 0) {
                showNotification('No songs to download in this playlist', 'info');
                return;
            }
            showNotification(`Downloading ${pl.tracks.length} songs from playlist...`, 'info');
            for (let i = 0; i < pl.tracks.length; i++) {
                await musicService.downloadTrack(pl.tracks[i]);
            }
        });

        // Add Songs
        const triggerAddSongs = () => {
            const searchNav = document.querySelector('.nav-item[data-path="search"]');
            if (searchNav) searchNav.click();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
            showNotification('Search songs to add to your playlist!', 'info');
        };
        document.getElementById('addSongsPlBtn')?.addEventListener('click', triggerAddSongs);
        document.getElementById('chipAddSongsBtn')?.addEventListener('click', triggerAddSongs);
        document.getElementById('emptyAddSongsBtn')?.addEventListener('click', triggerAddSongs);

        // Share Playlist
        document.getElementById('sharePlBtn')?.addEventListener('click', () => {
            const shareUrl = window.location.origin + window.location.pathname + '#playlists';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl);
                showNotification('Playlist link copied to clipboard!', 'success');
            } else {
                showNotification('Playlist sharing link ready!', 'info');
            }
        });

        // More Options Dropdown Button (...)
        document.getElementById('morePlOptionsBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const option = prompt(`Playlist Options for "${pl.name}":\n\n1. Edit Name & Description\n2. Download All Songs\n3. Shuffle Play\n4. Delete Playlist\n\nEnter option number (1-4):`);
            if (option === '1') {
                openEditModal();
            } else if (option === '2') {
                document.getElementById('downloadAllPlBtn')?.click();
            } else if (option === '3') {
                document.getElementById('shufflePlBtn')?.click();
            } else if (option === '4') {
                if (confirm(`Are you sure you want to delete playlist "${pl.name}"?`)) {
                    playlistService.deletePlaylist(pl.id);
                    renderPlaylists();
                    showNotification('Playlist deleted', 'info');
                }
            }
        });

        // Sort Playlist
        let isSorted = false;
        document.getElementById('chipSortBtn')?.addEventListener('click', () => {
            if (!isSorted) {
                pl.tracks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                isSorted = true;
                showNotification('Sorted tracks alphabetically (A-Z)', 'info');
            } else {
                renderPlaylistDetail(pl.id);
                showNotification('Reset playlist order', 'info');
                return;
            }
            renderPlaylistDetail(pl.id);
        });

        // Track Row Click -> Play Track
        document.querySelectorAll('.spotify-track-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.remove-from-pl-btn')) return;
                const idx = parseInt(row.getAttribute('data-index'));
                if (!isNaN(idx) && pl.tracks[idx]) {
                    musicService.playContext(pl.tracks, pl.tracks[idx]);
                }
            });
        });

        // Track Options / Remove Button (⋮)
        document.querySelectorAll('.remove-from-pl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = btn.getAttribute('data-id');
                const track = pl.tracks.find(t => String(t.id) === String(trackId));
                if (!track) return;

                const choice = prompt(`Track Options: "${track.title}"\n\n1. ▶ Play Now\n2. 🔔 Set as Ringtone Studio\n3. ⬇ Download Track\n4. 📜 View Lyrics\n5. ➕ Add to another Playlist\n6. 🗑 Remove from Playlist\n\nEnter option (1-6):`);
                if (choice === '1') {
                    musicService.playContext(pl.tracks, track);
                } else if (choice === '2') {
                    musicService.openRingtoneModal(track);
                } else if (choice === '3') {
                    musicService.downloadTrack(track);
                } else if (choice === '4') {
                    musicService.showLyricsModal(track);
                } else if (choice === '5') {
                    musicService.openAddToPlaylistModal(track);
                } else if (choice === '6') {
                    playlistService.removeTrackFromPlaylist(pl.id, trackId);
                    renderPlaylistDetail(pl.id);
                    showNotification('Track removed from playlist', 'info');
                }
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
                        grid.appendChild(createSongCard(track, finalResults));
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
                        <div class="play-btn-overlay"><i class="fa-solid fa-play"></i></div>
                    </div>
                    <div class="card-info">
                        <h3>${seedTrack.artist} Mix</h3>
                        <p>AI Generated for You</p>
                    </div>
                `;
                card1.querySelector('.play-btn-overlay').addEventListener('click', () => {
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
                    aiDjGrid.appendChild(createSongCard(track, djTracks));
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
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}&color=7C3AED&bgcolor=FFFFFF`;

        const usernameText = document.getElementById('topUsername')?.textContent || 'User';
        const profileImgSrc = document.getElementById('topProfileImg')?.src || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80';

        dynamicContent.innerHTML = `
            <div class="section-header">
                <h2>Your Profile</h2>
            </div>
            
            <div style="max-width: 650px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; margin-top: 10px; width: 100%;">
                <!-- Main Profile Details Card -->
                <div class="glass-panel" style="padding: 28px 24px; border-radius: 24px; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 28px; flex-wrap: wrap;">
                        <div style="position: relative; flex-shrink: 0;">
                            <img src="${profileImgSrc}" id="profileAvatar" alt="Profile" style="width: 90px; height: 90px; border-radius: 50%; border: 3px solid var(--primary); box-shadow: 0 0 25px rgba(124, 58, 237, 0.4); object-fit: cover; display: block;">
                            <span style="position: absolute; bottom: 0; right: 0; width: 26px; height: 26px; background: #10B981; border: 3px solid var(--background, #0F172A); border-radius: 50%; display: block;" title="Active Now"></span>
                        </div>
                        <div style="flex: 1; min-width: 200px; overflow-wrap: anywhere; word-break: break-word;">
                            <h2 id="profileUsername" style="font-size: 1.4rem; font-weight: 700; color: #FFFFFF; line-height: 1.35; margin-bottom: 6px;">${usernameText}</h2>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="background: rgba(124, 58, 237, 0.2); border: 1px solid rgba(124, 58, 237, 0.4); color: var(--accent, #EC4899); font-size: 0.78rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="fa-solid fa-compact-disc"></i> Vibentra Member
                                </span>
                                <span style="background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); color: var(--secondary, #06B6D4); font-size: 0.78rem; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
                                    Lossless Audio Active
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 22px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">Email Address (Locked)</label>
                        <div style="position: relative;">
                            <i class="fa-solid fa-envelope" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                            <input type="email" value="${email}" disabled style="width: 100%; padding: 14px 44px 14px 46px; background: rgba(0, 0, 0, 0.25); border: 1px solid var(--glass-border); border-radius: 14px; color: var(--text-muted); cursor: not-allowed; outline: none; font-size: 0.95rem; text-overflow: ellipsis; overflow: hidden;">
                            <i class="fa-solid fa-lock" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                        </div>
                    </div>

                    <div style="margin-bottom: 8px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">Password</label>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <div style="position: relative; flex: 1; min-width: 200px;">
                                <i class="fa-solid fa-key" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                                <input type="password" id="profilePasswordInput" value="••••••••" disabled style="width: 100%; padding: 14px 16px 14px 46px; background: rgba(0, 0, 0, 0.25); border: 1px solid var(--glass-border); border-radius: 14px; color: white; outline: none; transition: all 0.3s; font-size: 0.95rem;">
                            </div>
                            <button id="enablePasswordBtn" class="btn btn-outline" style="white-space: nowrap; border-radius: 14px; padding: 12px 20px;"><i class="fa-solid fa-pen"></i> Change</button>
                        </div>
                        <div id="passwordActions" style="display: none; margin-top: 15px; text-align: right;">
                            <button id="cancelPasswordBtn" class="btn btn-outline" style="margin-right: 10px; border-radius: 12px;">Cancel</button>
                            <button id="savePasswordBtn" class="btn btn-primary" style="border-radius: 12px;">Save New Password</button>
                        </div>
                    </div>
                </div>

                <!-- QR Share Panel (Stack Below Profile Details) -->
                <div class="glass-panel" style="padding: 30px 24px; border-radius: 24px; display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%;">
                    <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(124, 58, 237, 0.2); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 12px; border: 1px solid rgba(124, 58, 237, 0.3);">
                        <i class="fa-solid fa-qrcode"></i>
                    </div>
                    <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; color: #FFFFFF;">Share Profile</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 22px; max-width: 420px; line-height: 1.45;">Let others scan this QR code to view your music taste and public playlists on Vibentra.</p>
                    
                    <div style="background: #FFFFFF; padding: 16px; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 14px 40px rgba(0,0,0,0.5), 0 0 30px rgba(124, 58, 237, 0.3); border: 3px solid var(--primary); display: inline-block;">
                        <img src="${qrUrl}" alt="Profile QR Code" style="display: block; width: 170px; height: 170px; border-radius: 8px;">
                    </div>
                    
                    <div style="display: flex; gap: 12px; width: 100%; max-width: 440px; flex-wrap: wrap;">
                        <button id="copyShareLinkBtn" class="btn btn-primary" style="flex: 1; min-width: 180px; border-radius: 14px; padding: 13px 20px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-copy"></i> Copy Share Link
                        </button>
                        <button id="downloadQrBtn" class="btn btn-outline" style="flex: 1; min-width: 180px; border-radius: 14px; padding: 13px 20px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-download"></i> Save QR Code
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Copy Share Link listener
        document.getElementById('copyShareLinkBtn')?.addEventListener('click', () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(profileUrl);
                showNotification('Profile link copied to clipboard!', 'success');
            } else {
                const tempInput = document.createElement('input');
                tempInput.value = profileUrl;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                showNotification('Profile link copied!', 'success');
            }
        });

        // Download QR listener
        document.getElementById('downloadQrBtn')?.addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = qrUrl;
            a.target = '_blank';
            a.download = `Vibentra-QR-${uid}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showNotification('QR Code download started!', 'success');
        });

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
            passwordInput.style.background = 'rgba(0,0,0,0.25)';
            passwordInput.style.borderColor = 'var(--glass-border)';
            enableBtn.style.display = 'block';
            actionsDiv.style.display = 'none';
        });

        saveBtn.addEventListener('click', async () => {
            const newPassword = passwordInput.value;
            if (newPassword.length < 6) {
                showNotification('Password must be at least 6 characters long.', 'error');
                return;
            }

            try {
                if (auth.currentUser) {
                    await updatePassword(auth.currentUser, newPassword);
                    showNotification('Password updated successfully!', 'success');
                    cancelBtn.click();
                } else {
                    showNotification('You must be logged in to change your password.', 'error');
                }
            } catch (error) {
                console.error('Error updating password:', error);
                if (error.code === 'auth/requires-recent-login') {
                    showNotification('Re-login required to update password for security.', 'error');
                } else {
                    showNotification('Failed to update password: ' + error.message, 'error');
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
                <div class="glass-panel" style="padding: 40px 20px; text-align: center; border-radius: 16px; margin-bottom: 2rem;">
                    <i class="fa-solid fa-satellite-dish" style="font-size: 4rem; color: var(--primary); margin-bottom: 20px;"></i>
                    <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Sync & Listen Together</h3>
                    <p style="color: var(--text-muted); margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">Create a room to listen to music in perfect sync with your friends, or join an existing room using a code.</p>
                    
                    <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin: 0 auto 30px auto; max-width: 450px; border: 1px solid rgba(255,255,255,0.1);">
                        <h4 style="margin-top: 0; margin-bottom: 15px; color: var(--primary); font-family: 'Delius', cursive;"><i class="fa-solid fa-circle-info"></i> How it works:</h4>
                        <ul style="color: var(--text-muted); margin-bottom: 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 0.95rem;">
                            <li><i class="fa-solid fa-1" style="color: var(--primary); margin-right: 10px; width: 15px;"></i> <strong>Create a Room:</strong> Generate a unique 6-letter code.</li>
                            <li><i class="fa-solid fa-2" style="color: var(--primary); margin-right: 10px; width: 15px;"></i> <strong>Share it:</strong> Send the code to your friends.</li>
                            <li><i class="fa-solid fa-3" style="color: var(--primary); margin-right: 10px; width: 15px;"></i> <strong>Join in:</strong> Friends enter the code below to connect.</li>
                            <li><i class="fa-solid fa-4" style="color: var(--primary); margin-right: 10px; width: 15px;"></i> <strong>Listen:</strong> Play, pause, or skip a song to sync everyone!</li>
                        </ul>
                    </div>
                    
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
                        musicService.remoteSync(roomData.currentTrack, roomData.isPlaying, roomData.currentTime, roomData.updatedAt);
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
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--glass-border);">
                <div>
                    <h4 style="font-size: 1.05rem; margin-bottom: 4px; color: #FFFFFF;">${p.name}</h4>
                    <p style="font-size: 0.82rem; color: var(--text-muted);">Status: <span style="color: ${p.enabled ? '#10B981' : '#EF4444'}; font-weight: 600;">${p.enabled ? 'Active' : 'Disabled'}</span></p>
                </div>
                <button class="btn ${p.enabled ? 'btn-outline' : 'btn-primary'} toggle-provider-btn" data-id="${p.id}" style="border-radius: 12px; padding: 8px 18px; font-size: 0.88rem;">
                    ${p.enabled ? 'Disable' : 'Enable'}
                </button>
            </div>
        `).join('');

        const currentTheme = localStorage.getItem('vibentra_theme') || 'default';
        const defaultCustomTheme = {
            primary: '#7C3AED',
            secondary: '#06B6D4',
            accent: '#EC4899',
            background: '#0F172A',
            cards: 'rgba(30, 41, 59, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #1A1F4C 0%, #0C102B 50%, #07091B 100%)',
            orb1: '#7C3AED', orb2: '#06B6D4', orb3: '#EC4899', orb4: '#3B82F6'
        };
        const savedCustomTheme = JSON.parse(localStorage.getItem('vibentra_custom_theme') || 'null') || defaultCustomTheme;

        const themeList = [
            { id: 'default', name: 'Midnight Purple', color: '#7C3AED' },
            { id: 'ocean', name: 'Ocean Blue', color: '#0284C7' },
            { id: 'forest', name: 'Forest Green', color: '#16A34A' },
            { id: 'sunset', name: 'Sunset Orange', color: '#EA580C' },
            { id: 'cherry', name: 'Cherry Red', color: '#E11D48' },
            { id: 'cyberpunk', name: 'Cyberpunk', color: '#D946EF' },
            { id: 'india', name: 'Vibentra Tricolor', color: '#F97316' }
        ];

        const themeButtonsHtml = themeList.map(t => `
            <button class="btn ${currentTheme === t.id ? 'btn-primary' : 'btn-outline'} theme-select-btn" data-theme="${t.id}" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 18px; border-radius: 14px; transition: all 0.3s ease;">
                <span style="width: 14px; height: 14px; border-radius: 50%; background: ${t.color}; box-shadow: 0 0 12px ${t.color}; display: inline-block;"></span>
                <span>${t.name}</span>
            </button>
        `).join('');

        dynamicContent.innerHTML = `
            <div class="section-header">
                <h2>Settings</h2>
            </div>
            
            <div style="max-width: 650px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; margin-top: 10px; width: 100%;">
                <!-- Appearance & Theme Panel -->
                <div class="glass-panel" style="border-radius: 24px; overflow: hidden; width: 100%;">
                    <div style="padding: 22px 24px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; gap: 12px;">
                        <i class="fa-solid fa-palette" style="font-size: 1.3rem; color: var(--primary);"></i>
                        <div>
                            <h3 style="font-size: 1.15rem; font-weight: 700; color: #FFFFFF;">Appearance & Theme</h3>
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">Choose a preset or create your own custom theme color scheme.</p>
                        </div>
                    </div>
                    <div style="padding: 22px 24px;">
                        <label style="display: block; font-size: 0.88rem; font-weight: 700; color: #FFFFFF; margin-bottom: 12px;">Preset Color Themes</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 24px;">
                            ${themeButtonsHtml}
                        </div>

                        <!-- Custom Theme Studio -->
                        <div style="padding-top: 20px; border-top: 1px solid var(--glass-border);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                                <h4 style="font-size: 1rem; font-weight: 700; color: #FFFFFF; margin: 0; display: flex; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--accent);"></i> Custom Theme Studio
                                </h4>
                                <span class="badge" style="background: ${currentTheme === 'custom' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem;">
                                    ${currentTheme === 'custom' ? 'Active' : 'Custom'}
                                </span>
                            </div>
                            <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 18px;">Pick your custom colors to build a unique visual theme.</p>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 14px; margin-bottom: 20px;">
                                <div>
                                    <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;">Primary Accent</label>
                                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--glass-border);">
                                        <input type="color" id="customPrimary" value="${savedCustomTheme.primary}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
                                        <span id="hexPrimary" style="font-size: 0.82rem; font-family: monospace; color: #FFF;">${savedCustomTheme.primary}</span>
                                    </div>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;">Secondary Glow</label>
                                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--glass-border);">
                                        <input type="color" id="customSecondary" value="${savedCustomTheme.secondary}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
                                        <span id="hexSecondary" style="font-size: 0.82rem; font-family: monospace; color: #FFF;">${savedCustomTheme.secondary}</span>
                                    </div>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;">Highlight Accent</label>
                                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--glass-border);">
                                        <input type="color" id="customAccent" value="${savedCustomTheme.accent}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
                                        <span id="hexAccent" style="font-size: 0.82rem; font-family: monospace; color: #FFF;">${savedCustomTheme.accent}</span>
                                    </div>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;">Dark Background</label>
                                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--glass-border);">
                                        <input type="color" id="customBg" value="${savedCustomTheme.background}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
                                        <span id="hexBg" style="font-size: 0.82rem; font-family: monospace; color: #FFF;">${savedCustomTheme.background}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                <button id="applyCustomThemeBtn" class="btn btn-primary" style="flex: 1; min-width: 180px; padding: 12px 20px; border-radius: 12px; font-weight: 700; display: flex; justify-content: center; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-paintbrush"></i> Apply Custom Theme
                                </button>
                                <button id="resetThemeBtn" class="btn btn-outline" style="padding: 12px 20px; border-radius: 12px; color: var(--text-muted);">
                                    <i class="fa-solid fa-rotate-left"></i> Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Music Providers Panel -->
                <div class="glass-panel" style="border-radius: 24px; overflow: hidden; width: 100%;">
                    <div style="padding: 22px 24px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; gap: 12px;">
                        <i class="fa-solid fa-sliders" style="font-size: 1.3rem; color: var(--secondary);"></i>
                        <div>
                            <h3 style="font-size: 1.15rem; font-weight: 700; color: #FFFFFF;">Music Sources</h3>
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">Enable or disable music providers for search & playback.</p>
                        </div>
                    </div>
                    <div>
                        ${providersHtml}
                    </div>
                </div>

                <!-- Background Playback Guide -->
                <div class="glass-panel" style="border-radius: 24px; overflow: hidden; width: 100%;">
                    <div style="padding: 22px 24px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; gap: 12px;">
                        <i class="fa-solid fa-battery-full" style="font-size: 1.3rem; color: #10B981;"></i>
                        <div>
                            <h3 style="font-size: 1.15rem; font-weight: 700; color: #FFFFFF;">Background Playback & Battery Saver</h3>
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">Ensure continuous music playback when device screen is off.</p>
                        </div>
                    </div>
                    <div style="padding: 22px 24px; font-size: 0.9rem; line-height: 1.6; color: rgba(255,255,255,0.85);">
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 16px; padding: 18px;">
                            <strong style="color: #FFFFFF; display: block; margin-bottom: 6px;"><i class="fa-solid fa-mobile-screen" style="color: var(--primary); margin-right: 6px;"></i> Recommended Mobile Settings:</strong>
                            <ol style="margin-top: 8px; padding-left: 20px; color: var(--text-muted); font-size: 0.88rem;">
                                <li style="margin-bottom: 6px;">Go to phone <strong>Settings > Apps > Vibentra</strong>.</li>
                                <li style="margin-bottom: 6px;">Tap <strong>Battery</strong> and select <strong>Unrestricted / No Restrictions</strong>.</li>
                                <li>Enable <strong>Autostart</strong> (for Xiaomi/MIUI, Vivo, RealMe, Samsung devices).</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <!-- App Version Badge -->
                <div style="text-align: center; padding: 12px 0; color: var(--text-muted); font-size: 0.85rem;">
                    <span style="display: inline-flex; align-items: center; gap: 8px; background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.3); padding: 6px 14px; border-radius: 20px; color: #FFFFFF; font-weight: 600;">
                        <i class="fa-solid fa-code-commit" style="color: var(--primary);"></i> Vibentra Build: a085713 (v1.1.6)
                    </span>
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
                    showNotification(`${provider.name} ${provider.enabled ? 'enabled' : 'disabled'}`, 'info');
                }
            });
        });

        document.querySelectorAll('.theme-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.theme-select-btn');
                if (!targetBtn) return;
                const themeName = targetBtn.getAttribute('data-theme');
                window.applyTheme(themeName);
                renderSettings(); // Re-render to update active state
                showNotification('Theme updated successfully!', 'success');
            });
        });

        // Custom Theme Studio Listeners
        const customPrimary = document.getElementById('customPrimary');
        const customSecondary = document.getElementById('customSecondary');
        const customAccent = document.getElementById('customAccent');
        const customBg = document.getElementById('customBg');

        const hexPrimary = document.getElementById('hexPrimary');
        const hexSecondary = document.getElementById('hexSecondary');
        const hexAccent = document.getElementById('hexAccent');
        const hexBg = document.getElementById('hexBg');

        const getCustomThemeData = () => {
            const p = customPrimary.value;
            const s = customSecondary.value;
            const a = customAccent.value;
            const bg = customBg.value;
            return {
                primary: p,
                secondary: s,
                accent: a,
                background: bg,
                cards: 'rgba(255, 255, 255, 0.08)',
                bgGradient: `radial-gradient(circle at 20% 20%, ${p}44 0%, ${bg} 65%, #000000 100%)`,
                orb1: p,
                orb2: s,
                orb3: a,
                orb4: p
            };
        };

        const updateHexLabels = () => {
            if (hexPrimary) hexPrimary.textContent = customPrimary.value.toUpperCase();
            if (hexSecondary) hexSecondary.textContent = customSecondary.value.toUpperCase();
            if (hexAccent) hexAccent.textContent = customAccent.value.toUpperCase();
            if (hexBg) hexBg.textContent = customBg.value.toUpperCase();
        };

        [customPrimary, customSecondary, customAccent, customBg].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    updateHexLabels();
                    const customObj = getCustomThemeData();
                    window.applyTheme('custom', customObj);
                });
            }
        });

        const applyCustomThemeBtn = document.getElementById('applyCustomThemeBtn');
        if (applyCustomThemeBtn) {
            applyCustomThemeBtn.addEventListener('click', () => {
                const customObj = getCustomThemeData();
                window.applyTheme('custom', customObj);
                renderSettings();
                showNotification('Custom theme applied & saved!', 'success');
            });
        }

        const resetThemeBtn = document.getElementById('resetThemeBtn');
        if (resetThemeBtn) {
            resetThemeBtn.addEventListener('click', () => {
                localStorage.removeItem('vibentra_custom_theme');
                window.applyTheme('default');
                renderSettings();
                showNotification('Theme reset to Default Midnight Purple', 'info');
            });
        }
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
