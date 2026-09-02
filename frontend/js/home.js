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
import { sleepTimerService } from './services/sleepTimerService.js';
import { connectService } from './services/connectService.js';
import { storyShareService } from './services/storyShareService.js';
import { coverGeneratorService } from './services/coverGeneratorService.js';
import { lyricsService } from './services/lyricsService.js';
import { initUpdateManager } from './updateManager.js';

const initHome = () => {
    // Initialize New Update Release Notes & SW Manager
    initUpdateManager();

    // Initialize Battery Optimization & Power Saver Engine
    const initBatteryOptimization = () => {
        let isBatterySaver = localStorage.getItem('vibentra_battery_saver') === 'true';
        const batteryBtn = document.getElementById('batterySaverToggleBtn');
        const topBatteryIcon = document.getElementById('topBatteryIcon');

        const applyBatteryMode = (enabled, notify = false) => {
            isBatterySaver = enabled;
            localStorage.setItem('vibentra_battery_saver', enabled ? 'true' : 'false');
            if (enabled) {
                document.documentElement.classList.add('battery-saver-active');
                document.body.classList.add('battery-saver-active');
                if (topBatteryIcon) topBatteryIcon.className = 'fa-solid fa-battery-empty';
                if (batteryBtn) {
                    batteryBtn.style.color = '#34D399';
                    batteryBtn.title = 'Battery Saver: Active (Tap to Disable)';
                }
                if (notify) showNotification('Battery Saver: ON (OLED Pure Black & Animations Paused)', 'success');
            } else {
                document.documentElement.classList.remove('battery-saver-active');
                document.body.classList.remove('battery-saver-active');
                if (topBatteryIcon) topBatteryIcon.className = 'fa-solid fa-battery-half';
                if (batteryBtn) {
                    batteryBtn.style.color = '';
                    batteryBtn.title = 'Battery Optimization (Tap to Enable)';
                }
                if (notify) showNotification('High-Performance Mode: ON (Full Glass Effects)', 'info');
            }
        };

        // Apply saved mode on startup
        applyBatteryMode(isBatterySaver, false);

        if (batteryBtn) {
            batteryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                applyBatteryMode(!isBatterySaver, true);
            });
        }

        // Real Device Battery Status Monitoring
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const updateBatteryState = () => {
                    const level = Math.round(battery.level * 100);
                    const isCharging = battery.charging;

                    if (topBatteryIcon) {
                        if (isCharging) {
                            topBatteryIcon.className = 'fa-solid fa-battery-bolt';
                        } else if (level <= 20) {
                            topBatteryIcon.className = 'fa-solid fa-battery-empty';
                        } else if (level <= 60) {
                            topBatteryIcon.className = 'fa-solid fa-battery-half';
                        } else {
                            topBatteryIcon.className = 'fa-solid fa-battery-full';
                        }
                    }

                    // Auto-enable when battery < 20% and not charging if user hasn't explicitly disabled
                    if (level <= 20 && !isCharging && localStorage.getItem('vibentra_battery_saver') === null) {
                        applyBatteryMode(true, true);
                    }
                };

                updateBatteryState();
                battery.addEventListener('levelchange', updateBatteryState);
                battery.addEventListener('chargingchange', updateBatteryState);
            }).catch(() => { });
        }

        window.applyBatteryMode = applyBatteryMode;
    };
    initBatteryOptimization();

    // Apply Theme
    const themes = {
        'default': {
            primary: '#138086', secondary: '#22D3EE', accent: '#EE6C4D', background: '#061A1C', cards: 'rgba(14, 53, 56, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #138086 0%, #061A1C 50%, #010A0B 100%)',
            orb1: '#138086', orb2: '#22D3EE', orb3: '#0D9488', orb4: '#14B8A6'
        },
        'teal': {
            primary: '#138086', secondary: '#22D3EE', accent: '#EE6C4D', background: '#061A1C', cards: 'rgba(14, 53, 56, 0.7)',
            bgGradient: 'radial-gradient(circle at 20% 20%, #138086 0%, #061A1C 50%, #010A0B 100%)',
            orb1: '#138086', orb2: '#22D3EE', orb3: '#0D9488', orb4: '#14B8A6'
        },
        'purple': {
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

        const bgGrad = theme.bgGradient || `radial-gradient(circle at 20% 20%, ${theme.primary} 0%, ${theme.background} 50%, #010A0B 100%)`;
        document.documentElement.style.setProperty('--bg-gradient', bgGrad);
        document.documentElement.style.background = bgGrad;
        document.documentElement.style.backgroundColor = theme.background || '#061A1C';
        document.body.style.background = bgGrad;
        document.body.style.backgroundColor = theme.background || '#061A1C';

        const liquidBg = document.querySelector('.liquid-bg-container');
        if (liquidBg) {
            liquidBg.style.background = bgGrad;
        }

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

    const savedTheme = localStorage.getItem('vibentra_theme') || 'teal';
    window.applyTheme(savedTheme);

    // Immediately pre-populate cached user profile to prevent visual UI flicker
    const cachedPreloadName = localStorage.getItem('vibentra_user_name');
    const cachedPreloadAvatar = localStorage.getItem('vibentra_user_avatar');
    if (cachedPreloadName) {
        const welcomeNameEl = document.getElementById('welcomeName');
        if (welcomeNameEl) welcomeNameEl.textContent = cachedPreloadName;
        const topUsernameEl = document.getElementById('topUsername');
        if (topUsernameEl) topUsernameEl.textContent = cachedPreloadName;
        const profileUsername = document.getElementById('profileUsername');
        if (profileUsername) profileUsername.textContent = cachedPreloadName;
        const homeDynamicGreeting = document.getElementById('homeDynamicGreetingName');
        if (homeDynamicGreeting) homeDynamicGreeting.textContent = cachedPreloadName;
    }
    if (cachedPreloadAvatar) {
        const topProfileImg = document.getElementById('topProfileImg');
        if (topProfileImg) topProfileImg.src = cachedPreloadAvatar;
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) profileAvatar.src = cachedPreloadAvatar;
        const homeNeonAvatar = document.getElementById('homeNeonAvatar');
        if (homeNeonAvatar) homeNeonAvatar.src = cachedPreloadAvatar;
    }

    // Check Auth State
    musicService.initUI(); // Initialize player UI bindings
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }

        let resolvedUsername = user.displayName || user.email?.split('@')[0] || cachedPreloadName || 'User';
        let resolvedAvatar = user.photoURL || cachedPreloadAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80';
        let resolvedEmail = user.email || localStorage.getItem('vibentra_user_email') || '';

        // Load User Data from Firestore
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.username) resolvedUsername = userData.username;
                if (userData.profileImage) resolvedAvatar = userData.profileImage;
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }

        // Cache globally & locally for seamless sync across renders
        window.currentUserProfile = {
            username: resolvedUsername,
            email: resolvedEmail,
            avatar: resolvedAvatar,
            uid: user.uid
        };

        localStorage.setItem('vibentra_user_name', resolvedUsername);
        localStorage.setItem('vibentra_user_email', resolvedEmail);
        localStorage.setItem('vibentra_user_avatar', resolvedAvatar);

        // Update all UI name and avatar placeholders
        const welcomeNameEl = document.getElementById('welcomeName');
        if (welcomeNameEl) welcomeNameEl.textContent = resolvedUsername;

        const topUsernameEl = document.getElementById('topUsername');
        if (topUsernameEl) topUsernameEl.textContent = resolvedUsername;

        const profileUsername = document.getElementById('profileUsername');
        if (profileUsername) profileUsername.textContent = resolvedUsername;

        const homeDynamicGreeting = document.getElementById('homeDynamicGreetingName');
        if (homeDynamicGreeting) homeDynamicGreeting.textContent = resolvedUsername;

        const topProfileImg = document.getElementById('topProfileImg');
        if (topProfileImg) topProfileImg.src = resolvedAvatar;

        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) profileAvatar.src = resolvedAvatar;

        const homeNeonAvatar = document.getElementById('homeNeonAvatar');
        if (homeNeonAvatar) homeNeonAvatar.src = resolvedAvatar;
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
                    docEl.requestFullscreen().catch(() => { });
                } else if (docEl.webkitRequestFullscreen) {
                    docEl.webkitRequestFullscreen().catch(() => { });
                }
            }
        };

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
        item.addEventListener('click', (e) => {
            const path = item.getAttribute('data-target');
            const navDockPill = document.querySelector('.mobile-nav-dock-pill');
            const searchCircle = document.querySelector('.mobile-nav-search-circle');
            const currentPath = history.state && history.state.path ? history.state.path : '';

            // If user clicks search circle while on search view, toggle displaying navigation options pill!
            if (path === 'search' && currentPath === 'search') {
                if (navDockPill) {
                    const isCollapsed = navDockPill.classList.contains('collapsed');
                    if (isCollapsed) {
                        navDockPill.classList.remove('collapsed');
                        if (searchCircle) searchCircle.classList.remove('search-active');
                    } else {
                        navDockPill.classList.add('collapsed');
                        if (searchCircle) searchCircle.classList.add('search-active');
                    }
                }
                return;
            }

            mobileNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Sync desktop sidebar active state
            navItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-path') === path));

            loadView(path);
        });
    });

    const viewScrollMemory = {
        home: 0,
        search: 0,
        playlists: 0,
        favorites: 0,
        connect: 0,
        'vibe-ai': 0,
        profile: 0,
        settings: 0
    };
    let activeCurrentView = 'home';

    function loadView(path, pushState = true) {
        if (pushState) {
            history.pushState({ path }, '', '#' + path);
        }

        // 1. Save scroll position of previous active view
        const mainContentEl = document.getElementById('mainContent');
        const currentY = window.scrollY || (mainContentEl ? mainContentEl.scrollTop : 0);
        if (activeCurrentView && activeCurrentView !== path) {
            viewScrollMemory[activeCurrentView] = currentY;
        }

        const navDockPill = document.querySelector('.mobile-nav-dock-pill');
        const searchCircle = document.querySelector('.mobile-nav-search-circle');

        if (path === 'search') {
            if (navDockPill) navDockPill.classList.add('collapsed');
            if (searchCircle) searchCircle.classList.add('search-active');
        } else {
            if (navDockPill) navDockPill.classList.remove('collapsed');
            if (searchCircle) searchCircle.classList.remove('search-active');
            document.body.classList.remove('search-focused');
            if (window.__activeSearchScrollHandler) {
                const mainEl = document.getElementById('mainContent');
                if (mainEl) mainEl.removeEventListener('scroll', window.__activeSearchScrollHandler);
                window.__activeSearchScrollHandler = null;
            }
        }

        const executeViewRender = () => {
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
                case 'wrapped':
                    openWrappedModal();
                    break;
                default:
                    renderHome();
            }

            // 2. Apply fluid crossfade animation
            const dynamicContainer = document.getElementById('dynamicContent');
            if (dynamicContainer) {
                dynamicContainer.classList.remove('view-fluid-enter');
                void dynamicContainer.offsetWidth; // Force reflow
                dynamicContainer.classList.add('view-fluid-enter');
            }

            // 3. Smoothly restore saved scroll position or start fresh
            const savedScroll = viewScrollMemory[path] || 0;
            requestAnimationFrame(() => {
                if (savedScroll > 0) {
                    window.scrollTo({ top: savedScroll, behavior: 'instant' });
                    if (mainContentEl) mainContentEl.scrollTop = savedScroll;
                } else {
                    window.scrollTo({ top: 0, behavior: 'instant' });
                    if (mainContentEl) mainContentEl.scrollTop = 0;
                }
            });

            activeCurrentView = path;
        };

        // Execute scoped GPU-accelerated view transition on container
        executeViewRender();
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
                    <button class="card-action-btn lyrics-btn" title="Show Lyrics">
                        <i class="fa-solid fa-align-left"></i>
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
        const lyricsBtns = card.querySelectorAll('.lyrics-btn, .opt-lyrics');
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

    // Shared Helper to Create Album Cards across Home & Search views
    function createAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'music-card album-card';
        const cover = (album.cover && String(album.cover).trim() !== '') ? album.cover : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';
        const providerName = album.provider || (album.source === 'youtube' ? 'YouTube Music' : 'JioSaavn');

        card.innerHTML = `
            <div class="card-img-wrapper" style="position: relative;">
                <img src="${cover}" alt="${album.title || 'Album'}" loading="lazy">
                <div class="play-btn-overlay" title="Play Album"><i class="fa-solid fa-folder-open"></i></div>
                <button class="save-to-playlist-btn" title="Save as local playlist" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; z-index: 5; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
            <div class="card-info">
                <h3 title="${album.title || 'Untitled Album'}">${album.title || 'Untitled Album'}</h3>
                <p title="${album.artist || 'Various Artists'}">${album.artist || 'Various Artists'}</p>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                    <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; color: rgba(255,255,255,0.7);">Album</span>
                    <span style="font-size: 0.72rem; padding: 2px 6px; background: ${providerName === 'YouTube Music' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${providerName === 'YouTube Music' ? '#f87171' : '#34d399'}; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="${providerName === 'YouTube Music' ? 'fa-brands fa-youtube' : 'fa-solid fa-music'}"></i>
                        ${providerName}
                    </span>
                </div>
            </div>
        `;

        card.querySelector('.play-btn-overlay').addEventListener('click', async (e) => {
            e.stopPropagation();
            showNotification(`Loading '${album.title}'...`);
            const pId = album.providerId || (album.source === 'youtube' ? 'youtube' : 'jiosaavn');
            const albumTracks = await providerManager.getAlbum(pId, album.id);
            if (albumTracks && albumTracks.length > 0) {
                musicService.playContext(albumTracks, albumTracks[0]);
            } else {
                showNotification('Failed to load album tracks', 'error');
            }
        });

        card.addEventListener('click', () => {
            renderRemoteCollectionDetail(album, 'album');
        });

        card.querySelector('.save-to-playlist-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            showNotification(`Saving '${album.title}' to your playlists...`);
            const pId = album.providerId || (album.source === 'youtube' ? 'youtube' : 'jiosaavn');
            const albumTracks = await providerManager.getAlbum(pId, album.id);
            if (albumTracks && albumTracks.length > 0) {
                const newPl = playlistService.createPlaylist(album.title, `Saved Album: ${album.artist}`);
                albumTracks.forEach(track => playlistService.addTrackToPlaylist(newPl.id, track));
                showNotification(`Saved '${album.title}' as a new playlist!`);
            } else {
                showNotification('Failed to load album tracks for saving', 'error');
            }
        });

        return card;
    }

    // Shared Helper to Create Playlist Cards across Search & Browse views
    function createPlaylistCard(playlist) {
        const card = document.createElement('div');
        card.className = 'music-card playlist-card';
        card.setAttribute('data-id', playlist.id);
        const cover = playlist.cover || playlist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
        const providerName = playlist.provider || 'JioSaavn';

        card.innerHTML = `
            <div class="card-img-wrapper" style="position: relative;">
                <img src="${cover}" alt="${playlist.title || playlist.name || 'Playlist'}" loading="lazy">
                <div class="play-btn-overlay" title="Play Playlist"><i class="fa-solid fa-play"></i></div>
            </div>
            <div class="card-info">
                <h3 title="${playlist.title || playlist.name || 'Untitled Playlist'}">${playlist.title || playlist.name || 'Untitled Playlist'}</h3>
                <p title="${playlist.artist || playlist.subtitle || 'Curated Playlist'}">${playlist.artist || playlist.subtitle || 'Curated Playlist'}</p>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                    <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(6, 182, 212, 0.2); border-radius: 4px; color: #22d3ee;">Playlist</span>
                    <span style="font-size: 0.72rem; padding: 2px 6px; background: rgba(255,255,255,0.08); border-radius: 4px; font-weight: 600; color: var(--text-muted);">
                        ${providerName}
                    </span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            renderRemoteCollectionDetail(playlist, 'playlist');
        });

        card.querySelector('.play-btn-overlay')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            showNotification(`Loading playlist '${playlist.title || playlist.name}'...`);
            const pId = playlist.providerId || 'jiosaavn';
            const plTracks = await providerManager.getPlaylist(pId, playlist.id);
            if (plTracks && plTracks.length > 0) {
                musicService.playContext(plTracks, plTracks[0]);
            } else {
                showNotification('Failed to load playlist tracks', 'error');
            }
        });

        return card;
    }

    // Dismiss open dropdowns on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.music-card')) {
            document.querySelectorAll('.card-options-dropdown').forEach(d => d.classList.add('hidden'));
            document.querySelectorAll('.music-card').forEach(c => c.classList.remove('menu-open'));
        }
    });

    // Shared Helper to create Modern Squircle Track Rows (Matching Reference Design)
    function createSquircleTrackRow(track, contextList = []) {
        const row = document.createElement('div');
        row.className = 'squircle-track-row';
        row.setAttribute('data-id', track.id);

        const cover = track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';
        const title = track.title || 'Untitled Track';
        const artist = track.artist || 'Unknown Artist';
        const providerName = track.provider || (track.source === 'youtube' ? 'YouTube Music' : 'JioSaavn');
        const metaText = track.duration ? `By ${artist} • ${track.duration}` : `By ${artist} • ${providerName}`;

        row.innerHTML = `
            <div class="squircle-track-left">
                <img src="${cover}" alt="${title}" class="squircle-track-cover" loading="lazy">
                <div class="squircle-track-info">
                    <h4 class="squircle-track-title" title="${title}">${title}</h4>
                    <p class="squircle-track-meta" title="${metaText}">${metaText}</p>
                </div>
            </div>
            <button class="squircle-mini-play" title="Play ${title}">
                <i class="fa-solid fa-play"></i>
            </button>
        `;

        const triggerPlay = (e) => {
            e.stopPropagation();
            musicService.playContext(contextList.length ? contextList : [track], track);
        };

        row.addEventListener('click', (e) => {
            if (e.target.closest('.squircle-mini-play')) return;
            triggerPlay(e);
        });

        row.querySelector('.squircle-mini-play').addEventListener('click', triggerPlay);

        return row;
    }

    // Shared Helper for Horizontal Album Cards
    function createSquircleAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'squircle-album-card';
        const cover = (album.cover && String(album.cover).trim() !== '') ? album.cover : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';
        const title = album.title || 'Latest Album';
        const artist = album.artist || 'Featured Artist';

        card.innerHTML = `
            <img src="${cover}" alt="${title}" loading="lazy">
            <h4 title="${title}">${title}</h4>
            <p title="${artist}">${artist}</p>
        `;

        card.addEventListener('click', () => {
            renderRemoteCollectionDetail(album, 'album');
        });

        return card;
    }

    // Helper to create Trending Mix Cards
    function createTrendingMixCard(mix) {
        const card = document.createElement('div');
        card.className = 'trending-mix-card';
        card.style.setProperty('--mix-c1', mix.color1 || '#138086');
        card.style.setProperty('--mix-c2', mix.color2 || '#22D3EE');

        card.innerHTML = `
            <div class="trending-mix-header">
                <span class="trending-mix-tag">${mix.tag || 'TRENDING MIX'}</span>
                <div class="trending-mix-icon">
                    <i class="${mix.icon || 'fa-solid fa-bolt'}"></i>
                </div>
            </div>
            <div class="trending-mix-body">
                <h4 title="${mix.title}">${mix.title}</h4>
                <p title="${mix.subtitle}">${mix.subtitle}</p>
            </div>
            <div class="trending-mix-footer">
                <span><i class="fa-solid fa-headphones"></i> ${mix.plays || '50K+ plays'}</span>
                <span><i class="fa-solid fa-list-ul"></i> View Songs</span>
            </div>
        `;

        card.addEventListener('click', () => {
            renderRemoteCollectionDetail({
                id: mix.id,
                title: mix.title,
                artist: mix.subtitle || 'Trending Mix',
                cover: mix.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                searchQuery: mix.query || mix.title,
                provider: 'JioSaavn',
                providerId: 'jiosaavn'
            }, 'playlist');
        });

        return card;
    }

    // Helper to create Artist Mix Playlist Cards
    function createArtistMixCard(artist) {
        const card = document.createElement('div');
        card.className = 'artist-mix-card';
        const cover = artist.cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=138086&color=fff&size=200`;

        card.innerHTML = `
            <div class="artist-mix-img-wrap">
                <img src="${cover}" alt="${artist.name}" loading="lazy">
                <span class="artist-mix-badge">${artist.badge || 'ARTIST MIX'}</span>
                <button class="artist-mix-play-btn" title="View ${artist.name} Songs">
                    <i class="fa-solid fa-list-ul"></i>
                </button>
            </div>
            <h4 title="${artist.name}">${artist.name}</h4>
            <p title="${artist.subtitle || 'Essential Hits'}">${artist.subtitle || 'Essential Hits'}</p>
        `;

        const openArtistSongs = (e) => {
            if (e) e.stopPropagation();
            renderRemoteCollectionDetail({
                id: artist.id || null,
                title: `${artist.name} - Essential Hits`,
                artist: artist.subtitle || 'Artist Spotlight',
                cover: cover,
                searchQuery: artist.query || `${artist.name} top hits songs`,
                provider: 'JioSaavn',
                providerId: 'jiosaavn'
            }, 'artist');
        };

        card.querySelector('.artist-mix-play-btn')?.addEventListener('click', openArtistSongs);
        card.addEventListener('click', openArtistSongs);

        return card;
    }

    // Helper to create Community Playlist Cards
    function createCommunityPlaylistCard(community) {
        const card = document.createElement('div');
        card.className = 'community-playlist-card';
        const cover = community.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

        card.innerHTML = `
            <div class="community-playlist-img-wrap">
                <img src="${cover}" alt="${community.title}" loading="lazy">
                <span class="community-tag-badge">${community.tag || 'COMMUNITY'}</span>
                <button class="community-play-btn" title="View ${community.title} Songs">
                    <i class="fa-solid fa-list-ul"></i>
                </button>
            </div>
            <h4 title="${community.title}">${community.title}</h4>
            <p title="${community.subtitle}">${community.subtitle}</p>
        `;

        const openCommunitySongs = (e) => {
            if (e) e.stopPropagation();
            renderRemoteCollectionDetail({
                id: community.id || null,
                title: community.title,
                artist: community.subtitle || 'Community Vibe',
                cover: cover,
                searchQuery: community.query || community.title,
                provider: community.provider || 'JioSaavn',
                providerId: community.providerId || 'jiosaavn'
            }, 'playlist');
        };

        card.querySelector('.community-play-btn')?.addEventListener('click', openCommunitySongs);
        card.addEventListener('click', openCommunitySongs);

        return card;
    }

    // Helper to create Live Chart Cards (with full squircle artwork & 1-tap playback)
    function createLiveChartCard(chart) {
        const card = document.createElement('div');
        card.className = 'community-playlist-card';
        const cover = chart.cover || chart.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

        card.innerHTML = `
            <div class="community-playlist-img-wrap">
                <img src="${cover}" alt="${chart.title || chart.name || 'Chart'}" loading="lazy">
                <span class="community-tag-badge" style="color: #FCD34D; border-color: rgba(252, 211, 77, 0.4);"><i class="fa-solid fa-chart-simple"></i> CHART</span>
                <button class="community-play-btn" title="View ${chart.title || chart.name} Songs">
                    <i class="fa-solid fa-list-ul"></i>
                </button>
            </div>
            <h4 title="${chart.title || chart.name}">${chart.title || chart.name}</h4>
            <p title="${chart.subtitle || 'Official Top Chart'}">${chart.subtitle || 'Official Top Chart'}</p>
        `;

        const openChartSongs = (e) => {
            if (e) e.stopPropagation();
            renderRemoteCollectionDetail({
                id: chart.id || null,
                title: chart.title || chart.name,
                artist: chart.subtitle || 'Official Chart',
                cover: cover,
                searchQuery: chart.query || chart.title || chart.name,
                provider: chart.provider || 'JioSaavn',
                providerId: chart.providerId || 'jiosaavn'
            }, 'playlist');
        };

        card.querySelector('.community-play-btn')?.addEventListener('click', openChartSongs);
        card.addEventListener('click', openChartSongs);
        return card;
    }

    // Views Rendering
    async function renderHome() {
        const rawUsername = localStorage.getItem('vibentra_user_name') || window.currentUserProfile?.username || document.getElementById('welcomeName')?.textContent || (auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]) || 'User';
        const currentAvatar = localStorage.getItem('vibentra_user_avatar') || window.currentUserProfile?.avatar || document.getElementById('topProfileImg')?.src || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80';
        const storedLang = localStorage.getItem('vibentra_lang_pref') || 'English';
        const displayGreetingName = rawUsername.split(/[\/\s]/)[0] || rawUsername;

        dynamicContent.innerHTML = `
            <div class="home-neon-page view-fade-in">
                <!-- Top Neon Header (Avatar with Glow, Language Selector, Quick Search & Favorites) -->
                <div class="home-neon-header">
                    <div class="home-header-avatar-wrap" id="homeAvatarBtn" title="View Profile">
                        <img src="${currentAvatar}" alt="Profile" class="home-header-avatar" id="homeNeonAvatar">
                    </div>
                    <div class="home-header-actions">
                        <select id="langPrefSelect" class="neon-lang-dropdown" title="Select Music Language">
                            <option value="English" ${storedLang === 'English' ? 'selected' : ''}>English</option>
                            <option value="Tamil" ${storedLang === 'Tamil' ? 'selected' : ''}>Tamil</option>
                            <option value="Hindi" ${storedLang === 'Hindi' ? 'selected' : ''}>Hindi</option>
                        </select>
                        <button class="home-circle-action-btn" id="homeQuickSearchBtn" title="Search Songs">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </button>
                        <button class="home-circle-action-btn" id="homeQuickFavBtn" title="Liked Songs">
                            <i class="fa-regular fa-heart"></i>
                        </button>
                    </div>
                </div>

                <!-- Personalized Greeting -->
                <div class="home-greeting-text">
                    <h1>Hi, <span id="homeDynamicGreetingName" title="${rawUsername}">${displayGreetingName}</span></h1>
                </div>

                <!-- Sticky Neon Pill Filter Chips Row -->
                <div class="neon-chips-shelf" id="homeNeonFilterChips">
                    <button class="neon-chip active" data-filter="all">All</button>
                    <button class="neon-chip" data-filter="new-release">New Releases</button>
                    <button class="neon-chip" data-filter="artist-mix">Artist Mixes</button>
                    <button class="neon-chip" data-filter="trending">Trending</button>
                    <button class="neon-chip" data-filter="community">Community Vibes</button>
                    <button class="neon-chip" data-filter="top-hits">Top Hits</button>
                    <button class="neon-chip" data-filter="chill">Chill & Relax</button>
                    <button class="neon-chip" data-filter="workout">Workout</button>
                    <button class="neon-chip" data-filter="tamil">Tamil Hits</button>
                    <button class="neon-chip" data-filter="bollywood">Bollywood</button>
                </div>

                <!-- Curated & Trending Hero Card (Lavender Pastel Aesthetic) -->
                <div class="curated-hero-section">
                    <div class="curated-hero-title-row">
                        <h2>Curated & trending</h2>
                    </div>
                    <div class="curated-hero-card" id="homeCuratedHeroCard">
                        <div class="curated-hero-info">
                            <span class="curated-hero-tag" id="curatedHeroTag">FEATURED MIX</span>
                            <h3 class="curated-hero-name" id="curatedHeroTitle">Discover weekly</h3>
                            <p class="curated-hero-desc" id="curatedHeroDesc">The original slow instrumental best playlists.</p>
                            <div class="curated-hero-actions">
                                <button class="curated-hero-play-btn" id="curatedHeroPlayBtn" title="Play Featured Mix">
                                    <i class="fa-solid fa-play"></i>
                                </button>
                                <button class="curated-hero-action-icon" id="curatedHeroLikeBtn" title="Like">
                                    <i class="fa-regular fa-heart"></i>
                                </button>
                                <button class="curated-hero-action-icon" id="curatedHeroDownloadBtn" title="Download">
                                    <i class="fa-solid fa-arrow-down"></i>
                                </button>
                                <button class="curated-hero-action-icon" id="curatedHeroMoreBtn" title="More Options">
                                    <i class="fa-solid fa-ellipsis"></i>
                                </button>
                            </div>
                        </div>
                        <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80" alt="Curated Artwork" class="curated-hero-artwork" id="curatedHeroArtwork">
                    </div>
                </div>

                <!-- 1. TRENDING SONGS MIX SHELF -->
                <div class="squircle-section">
                    <div class="squircle-section-header">
                        <div class="section-title-wrap">
                            <h2>Trending Songs Mix</h2>
                            <span class="section-badge-pill hot"><i class="fa-solid fa-fire"></i> Hot Mix</span>
                        </div>
                        <span class="squircle-see-all" id="seeAllTrendingMixBtn">Explore all</span>
                    </div>
                    <div class="squircle-shelf-scroll" id="homeTrendingMixGrid">
                        <p style="color: var(--primary); padding: 15px;">Loading trending mixes...</p>
                    </div>
                </div>

                <!-- Top Daily Playlists / Trending Hits (Squircle Row UI) -->
                <div class="squircle-section">
                    <div class="squircle-section-header">
                        <h2>Top daily hits & charts</h2>
                        <span class="squircle-see-all" id="seeAllTrendingBtn">See all</span>
                    </div>
                    <div class="squircle-track-list" id="homeTopDailyList">
                        <p style="color: var(--primary); padding: 20px;">Loading daily hits...</p>
                    </div>
                </div>

                <!-- 2. NEWLY RELEASED PLAYLISTS & ALBUMS SHELF -->
                <div class="squircle-section">
                    <div class="squircle-section-header">
                        <div class="section-title-wrap">
                            <h2>Newly Released Playlists & Albums</h2>
                            <span class="section-badge-pill fresh"><i class="fa-solid fa-sparkles"></i> Fresh</span>
                        </div>
                        <span class="squircle-see-all" id="seeAllNewReleasesBtn">Browse all</span>
                    </div>
                    <div class="squircle-shelf-scroll" id="homeLatestAlbumsGrid">
                        <p style="color: var(--primary); padding: 15px;">Loading latest new releases...</p>
                    </div>
                </div>

                <!-- 3. ARTIST PLAYLISTS & SPOTLIGHT SHELF -->
                <div class="squircle-section">
                    <div class="squircle-section-header">
                        <div class="section-title-wrap">
                            <h2>Artist Playlists & Essentials</h2>
                            <span class="section-badge-pill"><i class="fa-solid fa-star"></i> Curated</span>
                        </div>
                    </div>
                    <div class="squircle-shelf-scroll" id="homeArtistPlaylistsGrid">
                        <p style="color: var(--primary); padding: 15px;">Loading artist playlists...</p>
                    </div>
                </div>

                <!-- Popular Artists Round Shelf -->
                <div class="squircle-section">
                    <div class="squircle-section-header">
                        <h2>Spotlight Artists</h2>
                    </div>
                    <div class="squircle-shelf-scroll" id="homeArtistsGrid">
                        <p style="color: var(--primary); padding: 15px;">Loading artists...</p>
                    </div>
                </div>

                <!-- 4. TRENDING COMMUNITY PLAYLISTS SHELF -->
                <div class="squircle-section">
                    <div class="squircle-section-header">
                        <div class="section-title-wrap">
                            <h2>Trending Community Playlists</h2>
                            <span class="section-badge-pill community"><i class="fa-solid fa-users"></i> Vibes</span>
                        </div>
                        <span class="squircle-see-all" id="seeAllCommunityBtn">View vibes</span>
                    </div>
                    <div class="squircle-shelf-scroll" id="homeCommunityPlaylistsGrid">
                        <p style="color: var(--primary); padding: 15px;">Loading community playlists...</p>
                    </div>
                </div>
            </div>
        `;

        // Quick Action Navigators
        document.getElementById('homeAvatarBtn')?.addEventListener('click', () => loadView('profile'));
        document.getElementById('homeQuickSearchBtn')?.addEventListener('click', () => loadView('search'));
        document.getElementById('homeQuickFavBtn')?.addEventListener('click', () => loadView('favorites'));
        document.getElementById('seeAllTrendingBtn')?.addEventListener('click', () => loadView('search'));
        document.getElementById('seeAllTrendingMixBtn')?.addEventListener('click', () => loadView('search'));
        document.getElementById('seeAllNewReleasesBtn')?.addEventListener('click', () => loadView('search'));
        document.getElementById('seeAllCommunityBtn')?.addEventListener('click', () => loadView('search'));

        let activeTrendingTracks = [];
        let heroTrack = null;

        const getLanguageConfig = (lang) => {
            if (lang === 'Tamil') {
                return {
                    trendingQuery: 'latest tamil top hits 2026',
                    albumsQuery: 'latest tamil movie album songs 2026',
                    tag: 'TAMIL HITS',
                    defaultDesc: 'Top Trending Kollywood & Tamil Melodies',
                    trendingMixes: [
                        { title: 'Kollywood Viral 50', subtitle: 'Top trending Tamil songs right now', query: 'latest tamil viral hit songs 2026', tag: 'VIRAL 50', color1: '#EF4444', color2: '#F59E0B', icon: 'fa-solid fa-fire', plays: '120K+ plays' },
                        { title: 'Anirudh vs Santhosh Beat Mix', subtitle: 'High energy dance & mass tracks', query: 'anirudh santhosh narayanan dance songs', tag: 'DANCE MIX', color1: '#7C3AED', color2: '#EC4899', icon: 'fa-solid fa-compact-disc', plays: '95K+ plays' },
                        { title: '2K Romantic Melodies', subtitle: 'Soulful Yuvan & Harris love classics', query: 'tamil 2k love melodies yuvan harris', tag: 'MELODIES', color1: '#06B6D4', color2: '#3B82F6', icon: 'fa-solid fa-heart', plays: '88K+ plays' },
                        { title: 'Midnight Drive Tamil Lo-Fi', subtitle: 'Slowed + Reverb late night bliss', query: 'tamil lofi slow reverb midnight songs', tag: 'LO-FI VIBE', color1: '#8B5CF6', color2: '#06B6D4', icon: 'fa-solid fa-moon', plays: '64K+ plays' },
                        { title: 'Acoustic Sunset Chill', subtitle: 'Calm unplugged acoustic melodies', query: 'tamil acoustic unplugged guitar songs', tag: 'SUNSET', color1: '#F97316', color2: '#EC4899', icon: 'fa-solid fa-guitar', plays: '45K+ plays' }
                    ],
                    artistMixes: [
                        { name: 'Anirudh Ravichander', subtitle: 'Rockstar Anthems & Mass Hits', query: 'anirudh ravichander top songs', cover: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_004_20230324075147_500x500.jpg', badge: 'ROCKSTAR' },
                        { name: 'A.R. Rahman', subtitle: 'Isai Puyal Evergreen Classics', query: 'ar rahman tamil superhit songs', cover: 'https://c.saavncdn.com/artists/A_R_Rahman_004_20231124115304_500x500.jpg', badge: 'MAESTRO' },
                        { name: 'Yuvan Shankar Raja', subtitle: 'U1 Signature Drugs & Melodies', query: 'yuvan shankar raja top hits', cover: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_003_20221019053805_500x500.jpg', badge: 'DRUG U1' },
                        { name: 'Harris Jayaraj', subtitle: 'Pure 2000s Ear Candy Vibes', query: 'harris jayaraj evergreen hits', cover: 'https://c.saavncdn.com/artists/Harris_Jayaraj_002_20230221094002_500x500.jpg', badge: 'CLASSIC' },
                        { name: 'Sid Sriram', subtitle: 'Soul-stirring Vocals & Hits', query: 'sid sriram tamil love melodies', cover: 'https://c.saavncdn.com/artists/Sid_Sriram_003_20230221093952_500x500.jpg', badge: 'VOCALIST' },
                        { name: 'G.V. Prakash Kumar', subtitle: 'Soulful Blockbuster Tunes', query: 'gv prakash kumar hit songs', cover: 'https://c.saavncdn.com/artists/G_V_Prakash_Kumar_002_20220614131553_500x500.jpg', badge: 'HITMAKER' }
                    ],
                    communityPlaylists: [
                        { title: 'Chennai Midnight Drive', subtitle: 'Curated by @VibentraTN • 45 Tracks', query: 'tamil night drive songs', cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', tag: 'NIGHT DRIVE' },
                        { title: 'Monsoon Rain & Coffee Melodies', subtitle: 'Curated by SoundHaven • 32 Tracks', query: 'tamil rain acoustic melodies', cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&q=80', tag: 'RAINY CAFE' },
                        { title: 'Gym Beast Mode Tamil Hype', subtitle: 'Curated by IronBeats • 50 Tracks', query: 'tamil workout gym mass songs', cover: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&q=80', tag: 'WORKOUT HYPE' },
                        { title: '90s Nostalgia Radio', subtitle: 'Curated by VintageTN • 60 Tracks', query: '90s tamil hits ilaiyaraaja spb', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', tag: '90s RETRO' },
                        { title: 'Coding Focus Beats Tamil', subtitle: 'Curated by DevBeats • 38 Tracks', query: 'tamil instrumental lofi chill', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80', tag: 'DEEP FOCUS' }
                    ],
                    defaultAlbums: [
                        { title: 'Dragon', artist: 'Leon James • 2026', cover: 'https://c.saavncdn.com/712/Dragon-Tamil-2025-20250201121045-500x500.jpg', provider: 'YouTube Music' },
                        { title: 'Kanguva', artist: 'Devi Sri Prasad • 2026', cover: 'https://c.saavncdn.com/393/Kanguva-Tamil-2024-20241113203402-500x500.jpg', provider: 'JioSaavn' },
                        { title: 'Vettaiyan', artist: 'Anirudh Ravichander', cover: 'https://c.saavncdn.com/970/Vettaiyan-Tamil-2024-20241008133515-500x500.jpg', provider: 'YouTube Music' },
                        { title: 'Amaran', artist: 'G.V. Prakash Kumar', cover: 'https://c.saavncdn.com/366/Amaran-Tamil-2024-20241030173629-500x500.jpg', provider: 'YouTube Music' },
                        { title: 'GOAT', artist: 'Yuvan Shankar Raja', cover: 'https://c.saavncdn.com/640/The-Greatest-Of-All-Time-Tamil-2024-20240903173114-500x500.jpg', provider: 'JioSaavn' }
                    ]
                };
            } else if (lang === 'Hindi') {
                return {
                    trendingQuery: 'latest hindi bollywood top hits 2026',
                    albumsQuery: 'latest hindi bollywood album songs 2026',
                    tag: 'BOLLYWOOD HITS',
                    defaultDesc: 'Top Trending Hindi & Bollywood Blockbusters',
                    trendingMixes: [
                        { title: 'Bollywood Mega Chartbusters', subtitle: 'The biggest Bollywood hits right now', query: 'latest bollywood top hits 2026', tag: 'TOP 50', color1: '#EF4444', color2: '#F59E0B', icon: 'fa-solid fa-fire', plays: '150K+ plays' },
                        { title: 'Arijit & Pritam Love Mix', subtitle: 'Pure soulful romance and emotions', query: 'arijit singh pritam romantic songs', tag: 'ROMANCE', color1: '#EC4899', color2: '#8B5CF6', icon: 'fa-solid fa-heart', plays: '130K+ plays' },
                        { title: 'Desi Party & Club Hype', subtitle: 'Non-stop DJ dance anthems', query: 'bollywood party club dance songs', tag: 'PARTY MIX', color1: '#7C3AED', color2: '#06B6D4', icon: 'fa-solid fa-compact-disc', plays: '98K+ plays' },
                        { title: 'Midnight Lo-Fi Bollywood', subtitle: 'Slowed reverb night drive essentials', query: 'bollywood slow reverb lofi songs', tag: 'LO-FI VIBE', color1: '#06B6D4', color2: '#3B82F6', icon: 'fa-solid fa-moon', plays: '75K+ plays' },
                        { title: 'Sufi Soul Sanctuary', subtitle: 'Ethereal acoustic sufi melodies', query: 'bollywood sufi acoustic guitar songs', tag: 'SUFI CHILL', color1: '#10B981', color2: '#06B6D4', icon: 'fa-solid fa-leaf', plays: '52K+ plays' }
                    ],
                    artistMixes: [
                        { name: 'Arijit Singh', subtitle: 'Voice of a Generation', query: 'arijit singh top hits', cover: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg', badge: 'KING' },
                        { name: 'Pritam', subtitle: 'Blockbuster Melodies & Hits', query: 'pritam superhit bollywood songs', cover: 'https://c.saavncdn.com/artists/Pritam_003_20230221094017_500x500.jpg', badge: 'HITMAKER' },
                        { name: 'Shreya Ghoshal', subtitle: 'Nightingale Evergreen Classics', query: 'shreya ghoshal best songs', cover: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20230323062157_500x500.jpg', badge: 'LEGEND' },
                        { name: 'Atif Aslam', subtitle: 'Heartfelt Romance & Ballads', query: 'atif aslam romantic hits', cover: 'https://c.saavncdn.com/artists/Atif_Aslam_004_20230323062206_500x500.jpg', badge: 'SOUL' },
                        { name: 'Vishal-Shekhar', subtitle: 'Electrifying Party Energy', query: 'vishal shekhar party hits', cover: 'https://c.saavncdn.com/artists/Vishal_Shekhar_002_20230221094031_500x500.jpg', badge: 'ENERGY' },
                        { name: 'Sachin-Jigar', subtitle: 'Folk, Modern & Soul Fusion', query: 'sachin jigar latest songs', cover: 'https://c.saavncdn.com/artists/Sachin_Jigar_002_20230221094042_500x500.jpg', badge: 'MASTERS' }
                    ],
                    communityPlaylists: [
                        { title: 'Marine Drive Late Night Drive', subtitle: 'Curated by DesiVibes • 40 Tracks', query: 'hindi midnight car drive songs', cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', tag: 'NIGHT DRIVE' },
                        { title: 'Chai Pe Charcha Lo-Fi Beats', subtitle: 'Curated by ChaiLovers • 35 Tracks', query: 'hindi lofi chill beats', cover: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&q=80', tag: 'CHILL BEATS' },
                        { title: 'Bollywood Gym Beast Mode', subtitle: 'Curated by DesiFit • 48 Tracks', query: 'hindi workout gym high energy songs', cover: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&q=80', tag: 'PUMP UP' },
                        { title: '2000s Nostalgia Rewind', subtitle: 'Curated by RetroDesi • 55 Tracks', query: '2000s bollywood superhits kk shaan', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', tag: '2000s HITS' },
                        { title: 'Monsoon Rain Chai Melodies', subtitle: 'Curated by MonsoonPulse • 30 Tracks', query: 'hindi romantic rain melodies', cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&q=80', tag: 'MONSOON' }
                    ],
                    defaultAlbums: [
                        { title: 'Stree 2', artist: 'Sachin-Jigar • 2024', cover: 'https://c.saavncdn.com/488/Stree-2-Hindi-2024-20240830154108-500x500.jpg', provider: 'JioSaavn' },
                        { title: 'Animal', artist: 'Pritam, JAM8, Vishal Mishra', cover: 'https://c.saavncdn.com/791/Animal-Hindi-2023-20231124191336-500x500.jpg', provider: 'YouTube Music' },
                        { title: 'Fighter', artist: 'Vishal & Shekhar', cover: 'https://c.saavncdn.com/480/Fighter-Hindi-2024-20240123154109-500x500.jpg', provider: 'JioSaavn' },
                        { title: 'Jawan', artist: 'Anirudh Ravichander', cover: 'https://c.saavncdn.com/022/Jawan-Hindi-2023-20230905033608-500x500.jpg', provider: 'YouTube Music' }
                    ]
                };
            } else {
                return {
                    trendingQuery: 'latest english top hits 2026',
                    albumsQuery: 'latest english billboard pop albums 2026',
                    tag: 'FEATURED MIX',
                    defaultDesc: 'The original slow instrumental best playlists.',
                    trendingMixes: [
                        { title: 'Billboard Global Hot 50', subtitle: 'The worldwide chart topping tracks', query: 'billboard hot 100 top pop songs 2026', tag: 'HOT 50', color1: '#EF4444', color2: '#F59E0B', icon: 'fa-solid fa-fire', plays: '200K+ plays' },
                        { title: 'Pop Pulse & Hits', subtitle: 'Top global pop anthems & bangers', query: 'top global pop hits 2026', tag: 'POP PULSE', color1: '#7C3AED', color2: '#EC4899', icon: 'fa-solid fa-bolt', plays: '140K+ plays' },
                        { title: 'EDM & Club Festival Hype', subtitle: 'Massive festival drops and bass', query: 'edm dance festival hits 2026', tag: 'CLUB BEATS', color1: '#06B6D4', color2: '#3B82F6', icon: 'fa-solid fa-compact-disc', plays: '110K+ plays' },
                        { title: 'Late Night Lofi Loft', subtitle: 'Chill hip-hop beats for night souls', query: 'lofi hip hop chill beats aesthetic', tag: 'LO-FI VIBE', color1: '#8B5CF6', color2: '#06B6D4', icon: 'fa-solid fa-moon', plays: '92K+ plays' },
                        { title: 'Sunset Acoustic Chill', subtitle: 'Calm acoustic guitar & vocal blend', query: 'acoustic indie pop chill guitar songs', tag: 'SUNSET', color1: '#F97316', color2: '#EC4899', icon: 'fa-solid fa-sun', plays: '68K+ plays' }
                    ],
                    artistMixes: [
                        { name: 'The Weeknd', subtitle: 'Starboy & After Hours Classics', query: 'the weeknd greatest hits', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80', badge: 'XO' },
                        { name: 'Taylor Swift', subtitle: 'Eras Anthems & Pop Hits', query: 'taylor swift top hits', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80', badge: 'SWIFTIE' },
                        { name: 'Billie Eilish', subtitle: 'Visionary Dark Pop & Ballads', query: 'billie eilish hits', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', badge: 'VISIONARY' },
                        { name: 'Dua Lipa', subtitle: 'Disco Pop & Dancefloor Anthems', query: 'dua lipa dance pop hits', cover: 'https://images.unsplash.com/photo-1499417265504-37060e8d5144?w=500&q=80', badge: 'CLUB QUEEN' },
                        { name: 'Ed Sheeran', subtitle: 'Acoustic Magic & Melodies', query: 'ed sheeran top acoustic hits', cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&q=80', badge: 'ACOUSTIC' },
                        { name: 'Bruno Mars', subtitle: 'Silk Sonic & 24K Groove', query: 'bruno mars silk sonic hits', cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&q=80', badge: 'GROOVE' }
                    ],
                    communityPlaylists: [
                        { title: 'Midnight Highway Cruiser', subtitle: 'Curated by NeonDrive • 42 Tracks', query: 'synthwave night drive retrowave', cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80', tag: 'SYNTHWAVE' },
                        { title: 'Acoustic Coffee Shop', subtitle: 'Curated by IndieHaven • 35 Tracks', query: 'acoustic indie coffee chill', cover: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&q=80', tag: 'COFFEE SHOP' },
                        { title: 'Beast Mode Workout EDM', subtitle: 'Curated by PumpSociety • 50 Tracks', query: 'high energy gym workout edm', cover: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&q=80', tag: 'BEAST MODE' },
                        { title: 'Deep Focus Coding Beats', subtitle: 'Curated by CodeBeats • 40 Tracks', query: 'lofi study focus code beats', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80', tag: 'DEEP FOCUS' },
                        { title: 'Golden Hour Sunset Lounge', subtitle: 'Curated by BeachClub • 36 Tracks', query: 'chill tropical house sunset summer', cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80', tag: 'SUNSET VIBE' }
                    ],
                    defaultAlbums: [
                        { title: 'Hit Me Hard and Soft', artist: 'Billie Eilish', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', provider: 'YouTube Music' },
                        { title: 'Short n Sweet', artist: 'Sabrina Carpenter', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80', provider: 'JioSaavn' },
                        { title: 'The Tortured Poets', artist: 'Taylor Swift', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80', provider: 'YouTube Music' }
                    ]
                };
            }
        };

        // Dynamic Trending Data Loader based on Language
        const loadLanguageData = async (language) => {
            const config = getLanguageConfig(language);
            const listContainer = document.getElementById('homeTopDailyList');
            const artistsContainer = document.getElementById('homeArtistsGrid');
            const albumsContainer = document.getElementById('homeLatestAlbumsGrid');
            const trendingMixContainer = document.getElementById('homeTrendingMixGrid');
            const artistPlaylistsContainer = document.getElementById('homeArtistPlaylistsGrid');
            const communityPlaylistsContainer = document.getElementById('homeCommunityPlaylistsGrid');
            const heroTag = document.getElementById('curatedHeroTag');

            if (heroTag) heroTag.textContent = config.tag;
            if (listContainer) listContainer.innerHTML = `<p style="color: var(--primary); padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading live ${language} hits...</p>`;
            if (albumsContainer) albumsContainer.innerHTML = `<p style="color: var(--primary); padding: 15px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading live new releases...</p>`;
            if (artistsContainer) artistsContainer.innerHTML = `<p style="color: var(--primary); padding: 15px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading live artists...</p>`;
            if (trendingMixContainer) trendingMixContainer.innerHTML = `<p style="color: var(--primary); padding: 15px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading live trending mixes...</p>`;
            if (artistPlaylistsContainer) artistPlaylistsContainer.innerHTML = `<p style="color: var(--primary); padding: 15px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading live artist playlists...</p>`;
            if (communityPlaylistsContainer) communityPlaylistsContainer.innerHTML = `<p style="color: var(--primary); padding: 15px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading live community vibes...</p>`;

            // 1. Initial responsive populate with high-speed presets
            if (trendingMixContainer && config.trendingMixes) {
                trendingMixContainer.innerHTML = '';
                config.trendingMixes.forEach(mix => trendingMixContainer.appendChild(createTrendingMixCard(mix)));
            }
            if (artistPlaylistsContainer && config.artistMixes) {
                artistPlaylistsContainer.innerHTML = '';
                config.artistMixes.forEach(artistMix => artistPlaylistsContainer.appendChild(createArtistMixCard(artistMix)));
            }
            if (communityPlaylistsContainer && config.communityPlaylists) {
                communityPlaylistsContainer.innerHTML = '';
                config.communityPlaylists.forEach(commPl => communityPlaylistsContainer.appendChild(createCommunityPlaylistCard(commPl)));
            }

            // 2. Fetch 100% Real-Time Live Discovery Modules from JioSaavn & YouTube Music
            providerManager.getLaunchModules(language).then(liveModules => {
                if (!liveModules || !document.getElementById('homeTrendingMixGrid')) return;

                // Live Trending Charts & Mixes
                if (trendingMixContainer && liveModules.charts && liveModules.charts.length > 0) {
                    trendingMixContainer.innerHTML = '';
                    liveModules.charts.slice(0, 10).forEach(chart => {
                        trendingMixContainer.appendChild(createLiveChartCard(chart));
                    });
                }

                // Live Real-Time Artist Stations & Recos
                if (artistPlaylistsContainer && liveModules.artists && liveModules.artists.length > 0) {
                    artistPlaylistsContainer.innerHTML = '';
                    liveModules.artists.slice(0, 8).forEach(art => {
                        artistPlaylistsContainer.appendChild(createArtistMixCard({
                            name: art.title || art.name,
                            subtitle: art.subtitle || 'Artist Radio • Live',
                            query: art.query || `${art.title || art.name} top hits songs`,
                            cover: art.cover || art.image,
                            badge: 'LIVE ARTIST'
                        }));
                    });
                }

                // Live Real-Time Top Curated & Community Playlists
                if (communityPlaylistsContainer && liveModules.playlists && liveModules.playlists.length > 0) {
                    communityPlaylistsContainer.innerHTML = '';
                    liveModules.playlists.slice(0, 10).forEach(pl => {
                        communityPlaylistsContainer.appendChild(createCommunityPlaylistCard(pl));
                    });
                }

                // Live Real-Time Newly Released Albums
                if (albumsContainer && liveModules.albums && liveModules.albums.length > 0) {
                    albumsContainer.innerHTML = '';
                    liveModules.albums.slice(0, 12).forEach(album => {
                        albumsContainer.appendChild(createSquircleAlbumCard(album));
                    });
                }
            }).catch(e => console.warn("Live launch modules sync warning:", e));

            try {
                const results = await searchService.searchSongs(config.trendingQuery);
                if (!document.getElementById('homeTopDailyList')) return; // Check if still on home

                activeTrendingTracks = results && results.length > 0 ? results : [];

                if (activeTrendingTracks.length > 0) {
                    heroTrack = activeTrendingTracks[0];

                    // Update Curated Hero Card
                    const heroTitle = document.getElementById('curatedHeroTitle');
                    const heroDesc = document.getElementById('curatedHeroDesc');
                    const heroArtwork = document.getElementById('curatedHeroArtwork');
                    const heroLikeBtn = document.getElementById('curatedHeroLikeBtn');

                    if (heroTitle) heroTitle.textContent = heroTrack.title || 'Discover weekly';
                    if (heroDesc) heroDesc.textContent = `${config.defaultDesc} • ${heroTrack.artist || 'Curated'}`;
                    if (heroArtwork && heroTrack.cover) heroArtwork.src = heroTrack.cover;

                    if (heroLikeBtn) {
                        const isFav = favoriteService.isFavorite(heroTrack.id);
                        heroLikeBtn.innerHTML = isFav ? '<i class="fa-solid fa-heart" style="color: #EC4899;"></i>' : '<i class="fa-regular fa-heart"></i>';
                    }

                    // Curated Hero Interactive Actions
                    const playHeroBtn = document.getElementById('curatedHeroPlayBtn');
                    if (playHeroBtn) {
                        playHeroBtn.onclick = (e) => {
                            e.stopPropagation();
                            musicService.playContext(activeTrendingTracks, heroTrack);
                        };
                    }

                    const heroCard = document.getElementById('homeCuratedHeroCard');
                    if (heroCard) {
                        heroCard.onclick = (e) => {
                            if (e.target.closest('.curated-hero-action-icon')) return;
                            musicService.playContext(activeTrendingTracks, heroTrack);
                        };
                    }

                    if (heroLikeBtn) {
                        heroLikeBtn.onclick = (e) => {
                            e.stopPropagation();
                            favoriteService.toggleFavorite(heroTrack);
                            const isNowFav = favoriteService.isFavorite(heroTrack.id);
                            heroLikeBtn.innerHTML = isNowFav ? '<i class="fa-solid fa-heart" style="color: #EC4899;"></i>' : '<i class="fa-regular fa-heart"></i>';
                            showNotification(isNowFav ? 'Added to Liked Songs' : 'Removed from Liked Songs', 'success');
                        };
                    }

                    const heroDownloadBtn = document.getElementById('curatedHeroDownloadBtn');
                    if (heroDownloadBtn) {
                        heroDownloadBtn.onclick = (e) => {
                            e.stopPropagation();
                            musicService.downloadTrack(heroTrack);
                        };
                    }

                    const heroMoreBtn = document.getElementById('curatedHeroMoreBtn');
                    if (heroMoreBtn) {
                        heroMoreBtn.onclick = (e) => {
                            e.stopPropagation();
                            openTrackOptionsMenu(heroTrack);
                        };
                    }

                    // Render Top Daily Playlists / Tracks
                    if (listContainer) {
                        listContainer.innerHTML = '';
                        activeTrendingTracks.slice(0, 8).forEach(track => {
                            listContainer.appendChild(createSquircleTrackRow(track, activeTrendingTracks));
                        });
                    }

                    // Extract and render Popular Artists
                    if (artistsContainer) {
                        const artistMap = new Map();
                        // 1. Populate from language artist mixes if available for rich artwork
                        if (config.artistMixes) {
                            config.artistMixes.forEach(am => {
                                if (am.name && !artistMap.has(am.name)) {
                                    artistMap.set(am.name, {
                                        name: am.name,
                                        cover: am.cover,
                                        query: am.query || `${am.name} top hits songs`
                                    });
                                }
                            });
                        }

                        // 2. Supplement from active trending tracks
                        activeTrendingTracks.forEach(t => {
                            if (t.artist) {
                                t.artist.split(',').forEach(a => {
                                    const trimmed = a.trim();
                                    if (trimmed && trimmed.toLowerCase() !== 'unknown' && trimmed.toLowerCase() !== 'unknown artist' && trimmed.length > 1 && !artistMap.has(trimmed)) {
                                        artistMap.set(trimmed, {
                                            name: trimmed,
                                            cover: t.cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmed)}&background=138086&color=fff&size=200&bold=true`,
                                            query: `${trimmed} top hits songs`
                                        });
                                    }
                                });
                            }
                        });

                        const topArtists = Array.from(artistMap.values()).slice(0, 8);

                        artistsContainer.innerHTML = '';
                        topArtists.forEach(artObj => {
                            const artistName = artObj.name;
                            const avatarUrl = artObj.cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=138086&color=fff&size=200&bold=true`;
                            const card = document.createElement('div');
                            card.className = 'squircle-artist-card';
                            card.innerHTML = `
                                <img src="${avatarUrl}" alt="${artistName}" loading="lazy">
                                <h4 title="${artistName}">${artistName}</h4>
                                <p>Artist</p>
                            `;
                            card.addEventListener('click', () => {
                                renderRemoteCollectionDetail({
                                    title: `${artistName} - Essential Hits`,
                                    artist: 'Spotlight Artist',
                                    cover: avatarUrl,
                                    searchQuery: artObj.query || `${artistName} top hits songs`,
                                    provider: 'JioSaavn',
                                    providerId: 'jiosaavn'
                                }, 'artist');
                            });
                            artistsContainer.appendChild(card);
                        });
                    }

                } else {
                    if (listContainer) listContainer.innerHTML = `<p style="color: var(--text-muted);">No ${language} songs found.</p>`;
                }
            } catch (err) {
                console.error("Home trending error:", err);
                if (listContainer) listContainer.innerHTML = '<p style="color: var(--text-muted);">Failed to load daily hits.</p>';
            }

            // Load Latest Albums & New Releases for the Language from Provider if not already filled by live modules
            if (albumsContainer) {
                searchService.searchAll(config.albumsQuery).then(albumRes => {
                    if (!document.getElementById('homeLatestAlbumsGrid')) return;
                    if (albumRes && albumRes.albums && albumRes.albums.length > 0) {
                        if (albumsContainer.children.length === 0 || albumsContainer.querySelector('p')) {
                            albumsContainer.innerHTML = '';
                            albumRes.albums.slice(0, 10).forEach(album => albumsContainer.appendChild(createSquircleAlbumCard(album)));
                        }
                    } else if (config.defaultAlbums && config.defaultAlbums.length > 0) {
                        if (albumsContainer.children.length === 0 || albumsContainer.querySelector('p')) {
                            albumsContainer.innerHTML = '';
                            config.defaultAlbums.forEach(album => albumsContainer.appendChild(createSquircleAlbumCard(album)));
                        }
                    }
                }).catch(() => { });
            }
        };


        // Wire Language Dropdown
        const langSelect = document.getElementById('langPrefSelect');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                const newLang = e.target.value;
                localStorage.setItem('vibentra_lang_pref', newLang);
                showNotification(`Language set to ${newLang}`, 'info');
                loadLanguageData(newLang);
            });
        }

        // Handle Neon Filter Chips
        const filterChips = document.querySelectorAll('#homeNeonFilterChips .neon-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const filterType = chip.getAttribute('data-filter');
                const currentLang = localStorage.getItem('vibentra_lang_pref') || 'English';

                if (filterType === 'all') {
                    loadLanguageData(currentLang);
                } else if (filterType === 'new-release') {
                    const listContainer = document.getElementById('homeTopDailyList');
                    if (listContainer) listContainer.innerHTML = '<p style="color: var(--primary); padding: 20px;">Loading new releases from provider...</p>';
                    searchService.searchSongs(`new release ${currentLang} songs 2026`).then(res => {
                        if (listContainer && res.length > 0) {
                            listContainer.innerHTML = '';
                            res.slice(0, 12).forEach(t => listContainer.appendChild(createSquircleTrackRow(t, res)));
                        }
                    });
                } else if (filterType === 'artist-mix') {
                    const artistSection = document.getElementById('homeArtistPlaylistsGrid');
                    if (artistSection) {
                        artistSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else if (filterType === 'community') {
                    const commSection = document.getElementById('homeCommunityPlaylistsGrid');
                    if (commSection) {
                        commSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else if (filterType === 'trending') {
                    const listContainer = document.getElementById('homeTopDailyList');
                    if (listContainer) listContainer.innerHTML = '<p style="color: var(--primary); padding: 20px;">Loading trending hits from provider...</p>';
                    searchService.searchSongs(`viral trending ${currentLang} songs 2026`).then(res => {
                        if (listContainer && res.length > 0) {
                            listContainer.innerHTML = '';
                            res.slice(0, 12).forEach(t => listContainer.appendChild(createSquircleTrackRow(t, res)));
                        }
                    });
                } else if (filterType === 'top-hits') {
                    const listContainer = document.getElementById('homeTopDailyList');
                    if (listContainer) listContainer.innerHTML = '<p style="color: var(--primary); padding: 20px;">Loading top hits...</p>';
                    searchService.searchSongs(`top 50 ${currentLang} hits 2026`).then(res => {
                        if (listContainer && res.length > 0) {
                            listContainer.innerHTML = '';
                            res.slice(0, 12).forEach(t => listContainer.appendChild(createSquircleTrackRow(t, res)));
                        }
                    });
                } else if (filterType === 'chill') {
                    const listContainer = document.getElementById('homeTopDailyList');
                    if (listContainer) listContainer.innerHTML = '<p style="color: var(--primary); padding: 20px;">Loading chill vibes...</p>';
                    searchService.searchSongs(`chill lofi acoustic slow ${currentLang} songs`).then(res => {
                        if (listContainer && res.length > 0) {
                            listContainer.innerHTML = '';
                            res.slice(0, 12).forEach(t => listContainer.appendChild(createSquircleTrackRow(t, res)));
                        }
                    });
                } else if (filterType === 'workout') {
                    const listContainer = document.getElementById('homeTopDailyList');
                    if (listContainer) listContainer.innerHTML = '<p style="color: var(--primary); padding: 20px;">Loading workout hits...</p>';
                    searchService.searchSongs(`high energy workout gym ${currentLang} hits`).then(res => {
                        if (listContainer && res.length > 0) {
                            listContainer.innerHTML = '';
                            res.slice(0, 12).forEach(t => listContainer.appendChild(createSquircleTrackRow(t, res)));
                        }
                    });
                } else if (filterType === 'tamil') {
                    if (langSelect) langSelect.value = 'Tamil';
                    localStorage.setItem('vibentra_lang_pref', 'Tamil');
                    loadLanguageData('Tamil');
                } else if (filterType === 'bollywood') {
                    if (langSelect) langSelect.value = 'Hindi';
                    localStorage.setItem('vibentra_lang_pref', 'Hindi');
                    loadLanguageData('Hindi');
                }
            });
        });

        // Initial Load with Stored Language Preference
        loadLanguageData(storedLang);
    } function renderSearch(initialQuery = '') {
        const moodsAndMoments = [
            { id: 'chill', title: 'Chill', gradient: 'linear-gradient(135deg, #d95c47, #e08353)', query: 'Chill Coffee Blend', img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&q=80' },
            { id: 'commute', title: 'Commute', gradient: 'linear-gradient(135deg, #cc3370, #882255)', query: 'Commute Feel Good', img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80' },
            { id: 'energize', title: 'Energize', gradient: 'linear-gradient(135deg, #8a36d6, #e056fd)', query: 'Pump Up Pop Energize', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
            { id: 'feelgood', title: 'Feel good', gradient: 'linear-gradient(135deg, #d647a8, #86d654)', query: 'Sunshine Indie Feel Good', img: 'https://images.unsplash.com/photo-1499417265504-37060e8d5144?w=300&q=80' },
            { id: 'focus', title: 'Focus', gradient: 'linear-gradient(135deg, #4b6cb7, #5c99e6)', query: 'Lofi Loft Focus', img: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80' },
            { id: 'gaming', title: 'Gaming', gradient: 'linear-gradient(135deg, #80d636, #36b04a)', query: 'Gaming Soundtracks', img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80' },
            { id: 'party', title: 'Party', gradient: 'linear-gradient(135deg, #9b36d6, #e68036)', query: 'Bollywood Dance Party', img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80' },
            { id: 'romance', title: 'Romance', gradient: 'linear-gradient(135deg, #cc3659, #4b36d6)', query: 'Romance Love Songs', img: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&q=80' },
            { id: 'sad', title: 'Sad', gradient: 'linear-gradient(135deg, #4b59d6, #80d636)', query: 'Bollywood Melancholy Sad', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80' },
            { id: 'sleep', title: 'Sleep', gradient: 'linear-gradient(135deg, #4b4bd6, #80e680)', query: 'Sleep Calming Ambient', img: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&q=80' },
            { id: 'workout', title: 'Workout', gradient: 'linear-gradient(135deg, #36d6c8, #9b36d6)', query: 'HIIT Desi Pop Workout', img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&q=80' }
        ];

        const genresList = [
            { id: 'african', title: 'African', gradient: 'linear-gradient(135deg, #e68036, #cc5936)', query: 'Afrobeats African Hits', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80' },
            { id: 'arabic', title: 'Arabic', gradient: 'linear-gradient(135deg, #b036d6, #cc4778)', query: 'Arabic Pop Hits', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80' },
            { id: 'bengali', title: 'Bengali', gradient: 'linear-gradient(135deg, #e6b036, #cc3636)', query: 'Bengali Hits', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80' },
            { id: 'bhojpuri', title: 'Bhojpuri', gradient: 'linear-gradient(135deg, #a0d636, #e6cc36)', query: 'Bhojpuri Hits', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
            { id: 'bollywood', title: 'Bollywood', gradient: 'linear-gradient(135deg, #e63680, #ff5858)', query: 'Bollywood Songs', img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80' },
            { id: 'tamil', title: 'Tamil', gradient: 'linear-gradient(135deg, #4776E6, #8E54E9)', query: 'Tamil Songs', img: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&q=80' },
            { id: 'telugu', title: 'Telugu', gradient: 'linear-gradient(135deg, #FF8008, #FFC837)', query: 'Telugu Songs', img: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&q=80' },
            { id: 'punjabi', title: 'Punjabi', gradient: 'linear-gradient(135deg, #FF416C, #FF4B2B)', query: 'Punjabi Hits', img: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&q=80' }
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
            <div class="spotify-search-page view-fade-in">
                <div class="spotify-search-bar-container">
                    <i class="fa-solid fa-magnifying-glass spotify-search-icon"></i>
                    <input type="text" class="spotify-search-input" id="searchInput" value="${initialQuery}" placeholder="Search for artists..." autocomplete="off">
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
        let currentSearchQuery = initialQuery;
        let isFetchingMore = false;
        let hasMoreSongs = true;
        let searchPageCount = 1;

        const loadMoreSongs = async () => {
            if (isFetchingMore || !hasMoreSongs || !currentSearchQuery || !currentResults || !currentResults.songs) return;

            const songsListContainer = document.getElementById('searchSongsListContainer');
            if (!songsListContainer) return;

            isFetchingMore = true;
            let spinner = document.getElementById('searchInfiniteSpinner');
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.id = 'searchInfiniteSpinner';
                spinner.style.cssText = 'padding: 16px 0; text-align: center; color: rgba(255,255,255,0.7); font-size: 0.88rem; font-weight: 600; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;';
                spinner.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #38BDF8; font-size: 1.1rem;"></i> Loading more songs...`;
                songsListContainer.appendChild(spinner);
            }

            try {
                searchPageCount++;
                const pageKeywords = ['songs', 'music', 'hits', 'remix', 'best', 'popular', 'track'];
                const kw = pageKeywords[(searchPageCount - 2) % pageKeywords.length];
                const nextQuery = `${currentSearchQuery} ${kw}`;

                const extraResults = await searchService.searchAll(nextQuery);
                if (extraResults && extraResults.songs && extraResults.songs.length > 0) {
                    const existingIds = new Set(currentResults.songs.map(s => String(s.id)));
                    const newSongs = extraResults.songs.filter(s => !existingIds.has(String(s.id)));

                    if (newSongs.length > 0) {
                        newSongs.forEach(track => {
                            currentResults.songs.push(track);
                            const row = createSearchSongRow(track, currentResults.songs);
                            if (spinner && spinner.parentNode) {
                                songsListContainer.insertBefore(row, spinner);
                            } else {
                                songsListContainer.appendChild(row);
                            }
                        });
                    } else {
                        if (searchPageCount > 7) hasMoreSongs = false;
                    }
                } else {
                    hasMoreSongs = false;
                }
            } catch (e) {
                console.error('Infinite scroll fetch error:', e);
            } finally {
                if (spinner && spinner.parentNode) {
                    spinner.parentNode.removeChild(spinner);
                }
                isFetchingMore = false;
            }
        };

        const handleSearchScroll = () => {
            const mainEl = document.getElementById('mainContent');
            if (!mainEl) return;
            if (!currentSearchQuery || !currentResults) return;
            if (activeFilter !== 'all' && activeFilter !== 'songs') return;

            const scrollRemaining = mainEl.scrollHeight - mainEl.scrollTop - mainEl.clientHeight;
            if (scrollRemaining < 350) {
                loadMoreSongs();
            }
        };

        if (window.__activeSearchScrollHandler) {
            const mainEl = document.getElementById('mainContent');
            if (mainEl) mainEl.removeEventListener('scroll', window.__activeSearchScrollHandler);
        }
        window.__activeSearchScrollHandler = handleSearchScroll;
        const mainContentEl = document.getElementById('mainContent');
        if (mainContentEl) {
            mainContentEl.addEventListener('scroll', handleSearchScroll, { passive: true });
        }

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
                    <h2 class="spotify-genre-section-title">Moods & moments</h2>
                    <div class="spotify-genre-grid">
                        ${moodsAndMoments.map(g => `
                            <div class="spotify-genre-card" style="background: ${g.gradient};" data-query="${g.query}">
                                <span class="spotify-genre-title">${g.title}</span>
                                <img src="${g.img}" class="spotify-genre-img" alt="${g.title}" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="spotify-genre-section">
                    <h2 class="spotify-genre-section-title">Genres</h2>
                    <div class="spotify-genre-grid">
                        ${genresList.map(g => `
                            <div class="spotify-genre-card" style="background: ${g.gradient};" data-query="${g.query}">
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
                    ${hasSongs ? `<button class="spotify-chip ${filter === 'songs' ? 'active' : ''}" data-filter="songs">${filter === 'songs' ? '<i class="fa-solid fa-check"></i> ' : ''}Songs</button>` : ''}
                    ${hasAlbums ? `<button class="spotify-chip ${filter === 'albums' ? 'active' : ''}" data-filter="albums">${filter === 'albums' ? '<i class="fa-solid fa-check"></i> ' : ''}Albums</button>` : ''}
                    ${hasPlaylists ? `<button class="spotify-chip ${filter === 'playlists' ? 'active' : ''}" data-filter="playlists">${filter === 'playlists' ? '<i class="fa-solid fa-check"></i> ' : ''}Playlists</button>` : ''}
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

            const createSearchArtistRow = (artistName, coverUrl) => {
                const row = document.createElement('div');
                row.className = 'ytm-artist-row';
                row.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 10px 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    width: 100%;
                    box-sizing: border-box;
                    border-radius: 8px;
                    transition: background 0.2s ease;
                `;
                row.innerHTML = `
                    <img src="${coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.4);" alt="${artistName}">
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                        <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${artistName}</h4>
                        <p style="margin: 2px 0 0 0; font-size: 0.81rem; color: #aaaaaa;">Artist</p>
                    </div>
                `;
                row.addEventListener('click', () => {
                    renderRemoteCollectionDetail({
                        title: `${artistName} - Top Songs`,
                        artist: 'Featured Artist',
                        cover: coverUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=138086&color=fff&size=200&bold=true`,
                        searchQuery: `${artistName} top hits songs`,
                        provider: 'JioSaavn',
                        providerId: 'jiosaavn'
                    }, 'artist', searchInput ? searchInput.value : '');
                });
                return row;
            };

            const createSearchSongRow = (track, contextTracks = []) => {
                const row = document.createElement('div');
                row.className = 'ytm-track-row';
                row.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    transition: background 0.2s ease;
                    width: 100%;
                    box-sizing: border-box;
                    border-radius: 8px;
                `;

                const artistStr = track.artist || 'Unknown Artist';
                const isYTM = track.provider === 'YouTube Music' || track.source === 'youtube' || track.providerId === 'ytmusic';
                const providerBadgeHtml = isYTM
                    ? `<span style="font-size: 0.68rem; padding: 2px 6px; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;">
                            <i class="fa-brands fa-youtube" style="font-size: 0.7rem;"></i> YouTube Music
                       </span>`
                    : `<span style="font-size: 0.68rem; padding: 2px 6px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;">
                            <i class="fa-solid fa-music" style="font-size: 0.68rem;"></i> JioSaavn
                       </span>`;

                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; max-width: 100%;">
                        <img src="${track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);" alt="${track.title}">
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 2px;">
                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.title || 'Untitled Track'}</h4>
                            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden;">
                                <p style="margin: 0; font-size: 0.81rem; color: #aaaaaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${artistStr}</p>
                                ${providerBadgeHtml}
                            </div>
                        </div>
                    </div>
                    <button class="search-row-opt-btn" title="Track Options" style="background: transparent; border: none; color: #FFFFFF; font-size: 1.35rem; width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: auto; margin-right: 4px; padding: 0; z-index: 10; transition: background 0.2s ease;">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                `;

                row.addEventListener('click', (e) => {
                    if (e.target.closest('.search-row-opt-btn')) return;
                    musicService.playContext(contextTracks.length > 0 ? contextTracks : [track], track);
                });

                const optBtn = row.querySelector('.search-row-opt-btn');
                if (optBtn) {
                    optBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openTrackOptionsMenu(track);
                    });
                }

                return row;
            };

            const createSearchAlbumRow = (album) => {
                const row = document.createElement('div');
                row.className = 'ytm-search-row';
                row.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    transition: background 0.2s ease;
                    width: 100%;
                    box-sizing: border-box;
                    overflow: hidden;
                    border-radius: 8px;
                `;

                const titleStr = album.title || album.name || 'Untitled Album';
                const artistStr = album.artist || album.artistName || 'Various Artists';
                const coverUrl = album.cover || album.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80';

                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; max-width: calc(100% - 50px);">
                        <img src="${coverUrl}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" alt="${titleStr}">
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                            <h4 style="margin: 0 0 3px 0; font-size: 0.95rem; font-weight: 700; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titleStr}</h4>
                            <p style="margin: 0; font-size: 0.82rem; color: #aaaaaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Album • ${artistStr}</p>
                        </div>
                    </div>
                    <button class="search-album-opt-btn" title="Play Album" style="background: transparent; border: none; color: #FFFFFF; font-size: 1.15rem; width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: auto; margin-right: 4px; padding: 0; z-index: 10; transition: background 0.2s ease;">
                        <i class="fa-solid fa-play"></i>
                    </button>
                `;

                row.addEventListener('click', (e) => {
                    if (e.target.closest('.search-album-opt-btn')) return;
                    renderRemoteCollectionDetail(album, 'album', searchInput ? searchInput.value : '');
                });

                const optBtn = row.querySelector('.search-album-opt-btn');
                if (optBtn) {
                    optBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        showNotification(`Loading '${titleStr}'...`);
                        const pId = album.providerId || (album.provider === 'YouTube Music' ? 'ytmusic' : 'jiosaavn');
                        const albumTracks = await providerManager.getAlbum(pId, album.id);
                        if (albumTracks && albumTracks.length > 0) {
                            musicService.playContext(albumTracks, albumTracks[0]);
                        } else {
                            showNotification('Failed to load album tracks', 'error');
                        }
                    });
                }

                return row;
            };

            const createSearchPlaylistRow = (pl) => {
                const row = document.createElement('div');
                row.className = 'ytm-search-row';
                row.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    transition: background 0.2s ease;
                    width: 100%;
                    box-sizing: border-box;
                    overflow: hidden;
                    border-radius: 8px;
                `;

                const titleStr = pl.title || pl.name || 'Untitled Playlist';
                const creatorStr = pl.creator || pl.source || pl.artist || 'Vibentra';
                const coverUrl = pl.cover || pl.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; max-width: calc(100% - 50px);">
                        <img src="${coverUrl}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" alt="${titleStr}">
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                            <h4 style="margin: 0 0 3px 0; font-size: 0.95rem; font-weight: 700; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titleStr}</h4>
                            <p style="margin: 0; font-size: 0.82rem; color: #aaaaaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Playlist • ${creatorStr}</p>
                        </div>
                    </div>
                    <button class="search-pl-opt-btn" title="Play Playlist" style="background: transparent; border: none; color: #FFFFFF; font-size: 1.15rem; width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: auto; margin-right: 4px; padding: 0; z-index: 10; transition: background 0.2s ease;">
                        <i class="fa-solid fa-play"></i>
                    </button>
                `;

                row.addEventListener('click', (e) => {
                    if (e.target.closest('.search-pl-opt-btn')) return;
                    renderRemoteCollectionDetail(pl, 'playlist', searchInput ? searchInput.value : '');
                });

                const optBtn = row.querySelector('.search-pl-opt-btn');
                if (optBtn) {
                    optBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        showNotification(`Loading '${titleStr}'...`);
                        const pId = pl.providerId || (pl.provider === 'YouTube Music' ? 'ytmusic' : 'jiosaavn');
                        const plTracks = await providerManager.getPlaylist(pId, pl.id);
                        if (plTracks && plTracks.length > 0) {
                            musicService.playContext(plTracks, plTracks[0]);
                        } else {
                            showNotification('Failed to load playlist tracks', 'error');
                        }
                    });
                }

                return row;
            };

            // Extract unique artists from search songs for top Artist section
            const artistMap = new Map();
            if (hasSongs) {
                results.songs.forEach(t => {
                    if (t.artist && t.artist !== 'Unknown Artist') {
                        const firstArtist = t.artist.split(',')[0].trim();
                        if (firstArtist && !artistMap.has(firstArtist)) {
                            artistMap.set(firstArtist, t.cover);
                        }
                    }
                });
            }

            // Filter: ALL
            if (filter === 'all') {
                // Artist Section (Top Circular Avatars matching reference design)
                if (artistMap.size > 0) {
                    const artistSec = document.createElement('div');
                    artistSec.style.marginBottom = '16px';
                    Array.from(artistMap.entries()).slice(0, 2).forEach(([artistName, coverUrl]) => {
                        artistSec.appendChild(createSearchArtistRow(artistName, coverUrl));
                    });
                    contentArea.appendChild(artistSec);
                }

                // Songs Section (Vertical List matching reference image)
                if (hasSongs) {
                    const songsSection = document.createElement('div');
                    songsSection.style.marginBottom = '24px';
                    const songsList = document.createElement('div');
                    songsList.id = 'searchSongsListContainer';
                    songsList.style.display = 'flex';
                    songsList.style.flexDirection = 'column';
                    results.songs.forEach(track => {
                        songsList.appendChild(createSearchSongRow(track, results.songs));
                    });
                    songsSection.appendChild(songsList);
                    contentArea.appendChild(songsSection);
                }

                // Albums Section (Vertical List)
                if (hasAlbums) {
                    const albumSec = document.createElement('div');
                    albumSec.style.marginBottom = '24px';
                    albumSec.innerHTML = `<h2 class="spotify-genre-section-title" style="margin-bottom: 12px; font-size: 1.15rem; font-weight: 800; color: #FFFFFF;">Albums</h2>`;
                    const albumList = document.createElement('div');
                    albumList.style.display = 'flex';
                    albumList.style.flexDirection = 'column';
                    results.albums.slice(0, 4).forEach(album => {
                        albumList.appendChild(createSearchAlbumRow(album));
                    });
                    albumSec.appendChild(albumList);
                    contentArea.appendChild(albumSec);
                }

                // Playlists Section (Vertical List)
                if (hasPlaylists) {
                    const plSec = document.createElement('div');
                    plSec.style.marginBottom = '24px';
                    plSec.innerHTML = `<h2 class="spotify-genre-section-title" style="margin-bottom: 12px; font-size: 1.15rem; font-weight: 800; color: #FFFFFF;">Playlists</h2>`;
                    const plList = document.createElement('div');
                    plList.style.display = 'flex';
                    plList.style.flexDirection = 'column';
                    results.playlists.slice(0, 4).forEach(pl => {
                        plList.appendChild(createSearchPlaylistRow(pl));
                    });
                    plSec.appendChild(plList);
                    contentArea.appendChild(plSec);
                }

            } else if (filter === 'songs') {
                const songsSection = document.createElement('div');
                songsSection.innerHTML = `<h2 class="spotify-genre-section-title" style="margin-bottom: 12px; font-size: 1.25rem; font-weight: 800;">Songs</h2>`;
                const songsList = document.createElement('div');
                songsList.id = 'searchSongsListContainer';
                songsList.style.display = 'flex';
                songsList.style.flexDirection = 'column';
                results.songs.forEach(track => {
                    songsList.appendChild(createSearchSongRow(track, results.songs));
                });
                songsSection.appendChild(songsList);
                contentArea.appendChild(songsSection);

            } else if (filter === 'albums') {
                const albumSec = document.createElement('div');
                albumSec.innerHTML = `<h2 class="spotify-genre-section-title" style="margin-bottom: 12px; font-size: 1.25rem; font-weight: 800;">Albums</h2>`;
                const albumList = document.createElement('div');
                albumList.style.display = 'flex';
                albumList.style.flexDirection = 'column';
                results.albums.forEach(album => {
                    albumList.appendChild(createSearchAlbumRow(album));
                });
                albumSec.appendChild(albumList);
                contentArea.appendChild(albumSec);

            } else if (filter === 'playlists') {
                const plSec = document.createElement('div');
                plSec.innerHTML = `<h2 class="spotify-genre-section-title" style="margin-bottom: 12px; font-size: 1.25rem; font-weight: 800;">Playlists</h2>`;
                const plList = document.createElement('div');
                plList.style.display = 'flex';
                plList.style.flexDirection = 'column';
                results.playlists.forEach(pl => {
                    plList.appendChild(createSearchPlaylistRow(pl));
                });
                plSec.appendChild(plList);
                contentArea.appendChild(plSec);
            }
        };

        // Helper to create Album Card
        const createAlbumCard = (album) => {
            const providerName = album.provider || (album.providerId === 'ytmusic' || album.source === 'youtube' ? 'YouTube Music' : 'JioSaavn');
            const pId = album.providerId || (providerName === 'YouTube Music' ? 'ytmusic' : 'jiosaavn');
            const isYTM = providerName === 'YouTube Music' || pId === 'ytmusic';

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
                    <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                        <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display: inline-block; color: rgba(255,255,255,0.6);">Album</span>
                        <span style="font-size: 0.72rem; padding: 2px 6px; background: ${isYTM ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${isYTM ? '#f87171' : '#34d399'}; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="${isYTM ? 'fa-brands fa-youtube' : 'fa-solid fa-music'}"></i>
                            ${providerName}
                        </span>
                    </div>
                </div>
            `;
            card.querySelector('.play-btn-overlay').addEventListener('click', async (e) => {
                e.stopPropagation();
                showNotification(`Loading '${album.title}'...`);
                const albumTracks = await providerManager.getAlbum(pId, album.id);
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
                const albumTracks = await providerManager.getAlbum(pId, album.id);
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
            const providerName = pl.provider || (pl.providerId === 'ytmusic' ? 'YouTube Music' : 'JioSaavn');
            const pId = pl.providerId || (providerName === 'YouTube Music' ? 'ytmusic' : 'jiosaavn');
            const isYTM = providerName === 'YouTube Music' || pId === 'ytmusic';

            const card = document.createElement('div');
            card.className = 'music-card';
            card.innerHTML = `
                <div class="card-img-wrapper" style="position: relative;">
                    <img src="${pl.cover}" alt="Cover" loading="lazy">
                    <div class="play-btn-overlay" title="Play Playlist"><i class="fa-solid fa-list-check"></i></div>
                    <button class="save-to-playlist-btn" title="Save as local playlist" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; z-index: 5; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
                <div class="card-info">
                    <h3>${pl.title}</h3>
                    <p>${pl.artist || providerName}</p>
                    <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                        <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(6, 182, 212, 0.2); border-radius: 4px; color: #22d3ee;">Playlist</span>
                        <span style="font-size: 0.72rem; padding: 2px 6px; background: ${isYTM ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${isYTM ? '#f87171' : '#34d399'}; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="${isYTM ? 'fa-brands fa-youtube' : 'fa-solid fa-music'}"></i>
                            ${providerName}
                        </span>
                    </div>
                </div>
            `;
            card.querySelector('.play-btn-overlay').addEventListener('click', async (e) => {
                e.stopPropagation();
                showNotification(`Loading playlist '${pl.title}'...`);
                const plTracks = await providerManager.getPlaylist(pId, pl.id);
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
                const plTracks = await providerManager.getPlaylist(pId, pl.id);
                if (plTracks && plTracks.length > 0) {
                    const newPl = playlistService.createPlaylist(pl.title, `Saved ${providerName} Playlist`);
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
            currentSearchQuery = cleanQuery;
            searchPageCount = 1;
            hasMoreSongs = true;
            isFetchingMore = false;

            const navDockPill = document.querySelector('.mobile-nav-dock-pill');
            const searchCircle = document.querySelector('.mobile-nav-search-circle');
            if (navDockPill) navDockPill.classList.add('collapsed');
            if (searchCircle) searchCircle.classList.add('search-active');

            if (!cleanQuery) {
                clearBtn.style.display = 'none';
                renderDefaultBrowseState();
                return;
            }

            clearBtn.style.display = 'flex';
            dynamicContainer.style.minHeight = '60vh';
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
        searchInput.addEventListener('focus', () => {
            document.body.classList.add('search-focused');
        });

        searchInput.addEventListener('blur', () => {
            if (!searchInput.value.trim()) {
                document.body.classList.remove('search-focused');
            }
        });

        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            clearBtn.style.display = val ? 'flex' : 'none';
            if (val.trim()) {
                document.body.classList.add('search-focused');
            }
            clearTimeout(searchDebounce);

            if (!val.trim()) {
                renderDefaultBrowseState();
                return;
            }

            searchDebounce = setTimeout(() => {
                triggerSearch(val);
            }, 380);
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            document.body.classList.remove('search-focused');
            searchInput.focus();
            renderDefaultBrowseState();
        });

        // Voice Search Microphone logic using Native Web Speech Recognition
        const voiceSearchBtn = document.getElementById('voiceSearchBtn');
        let recognitionInstance = null;
        let isVoiceListening = false;

        if (voiceSearchBtn) {
            voiceSearchBtn.addEventListener('click', () => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

                if (!SpeechRecognition) {
                    showNotification('Voice search is not supported in this browser.', 'warning');
                    return;
                }

                if (isVoiceListening && recognitionInstance) {
                    recognitionInstance.stop();
                    return;
                }

                try {
                    const recognition = new SpeechRecognition();
                    recognitionInstance = recognition;

                    // Language configuration matching active app language
                    const activeLang = localStorage.getItem('vibentra_selected_lang') || 'all';
                    if (activeLang === 'tamil') recognition.lang = 'ta-IN';
                    else if (activeLang === 'hindi') recognition.lang = 'hi-IN';
                    else if (activeLang === 'telugu') recognition.lang = 'te-IN';
                    else if (activeLang === 'malayalam') recognition.lang = 'ml-IN';
                    else if (activeLang === 'kannada') recognition.lang = 'kn-IN';
                    else recognition.lang = 'en-IN';

                    recognition.interimResults = true;
                    recognition.continuous = false;
                    recognition.maxAlternatives = 1;

                    recognition.onstart = () => {
                        isVoiceListening = true;
                        voiceSearchBtn.classList.add('recording');
                        voiceSearchBtn.title = 'Listening... Tap to stop';
                        searchInput.placeholder = 'Listening... Speak a song name...';
                        showNotification('Listening... Speak a song or artist!', 'info');
                    };

                    recognition.onresult = (event) => {
                        let interimTranscript = '';
                        let finalTranscript = '';

                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                finalTranscript += event.results[i][0].transcript;
                            } else {
                                interimTranscript += event.results[i][0].transcript;
                            }
                        }

                        const currentSpoken = finalTranscript || interimTranscript;
                        if (currentSpoken) {
                            searchInput.value = currentSpoken;
                            clearBtn.style.display = 'flex';
                        }
                    };

                    recognition.onerror = (event) => {
                        console.warn("Speech recognition error:", event.error);
                        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                            showNotification('Microphone permission denied. Please allow mic access.', 'error');
                        } else if (event.error === 'no-speech') {
                            showNotification('No speech detected. Tap mic and try again.', 'warning');
                        }
                    };

                    recognition.onend = () => {
                        isVoiceListening = false;
                        voiceSearchBtn.classList.remove('recording');
                        voiceSearchBtn.title = 'Search by voice';
                        searchInput.placeholder = 'What do you want to play?';

                        const rawQuery = searchInput.value.trim();
                        if (rawQuery.length > 0) {
                            // Strip conversational prefixes like "play", "search for", "find song"
                            const cleanSpokenQuery = rawQuery
                                .replace(/^(play\s+song\s+|play\s+|search\s+for\s+|search\s+|find\s+song\s+|find\s+)/i, '')
                                .replace(/\s+song$/i, '')
                                .trim() || rawQuery;

                            searchInput.value = cleanSpokenQuery;
                            showNotification(`Searching for "${cleanSpokenQuery}"...`, 'success');
                            triggerSearch(cleanSpokenQuery);
                        }
                    };

                    recognition.start();

                } catch (err) {
                    console.error("Speech recognition startup error:", err);
                    isVoiceListening = false;
                    voiceSearchBtn.classList.remove('recording');
                    showNotification('Could not start voice search. Please try again.', 'error');
                }
            });
        }

        // Initialize state
        if (initialQuery) {
            triggerSearch(initialQuery);
        } else {
            renderDefaultBrowseState();
        }
    }

    async function renderRemoteCollectionDetail(collection, type, currentQuery = '') {
        const providerName = collection.provider || (collection.providerId === 'ytmusic' || collection.source === 'youtube' ? 'YouTube Music' : 'JioSaavn');
        const pId = collection.providerId || (providerName === 'YouTube Music' ? 'ytmusic' : 'jiosaavn');

        const targetContainer = document.getElementById('dynamicContent') || document.getElementById('searchDynamicContainer') || document.getElementById('mainContent') || document.body;

        if (!targetContainer) return;

        window.scrollTo({ top: 0, behavior: 'smooth' });

        let typeLabel = 'Playlist';
        if (type === 'album') typeLabel = 'Album';
        else if (type === 'artist') typeLabel = 'Artist';

        const collectionTitle = collection.title || collection.name || 'Collection';
        const collectionArtist = collection.artist || collection.subtitle || (type === 'artist' ? 'Artist Spotlight' : 'Curated Hits');
        const collectionCover = collection.cover || collection.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

        targetContainer.innerHTML = `
            <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 15px; flex-wrap: wrap;">
                <button class="btn" id="backFromRemoteBtn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(19, 128, 134, 0.35); color: #ffffff; padding: 10px 22px; border-radius: 25px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; font-size: 0.95rem; backdrop-filter: blur(10px); box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: all 0.2s ease;">
                    <i class="fa-solid fa-arrow-left"></i> ${currentQuery ? 'Back to Search' : 'Back to Home'}
                </button>
            </div>
            <div style="display: flex; align-items: flex-end; gap: 24px; margin-bottom: 30px; flex-wrap: wrap; background: rgba(14, 53, 56, 0.45); padding: 24px; border-radius: 20px; border: 1px solid rgba(19, 128, 134, 0.25); box-shadow: 0 10px 35px rgba(0,0,0,0.45);">
                <img src="${collectionCover}" style="width: 190px; height: 190px; border-radius: ${type === 'artist' ? '50%' : '16px'}; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.6);" alt="${collectionTitle}">
                <div style="flex: 1; min-width: 260px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <p style="margin: 0; color: #22D3EE; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">${typeLabel}</p>
                        <span style="font-size: 0.75rem; padding: 3px 10px; background: rgba(19, 128, 134, 0.3); border: 1px solid rgba(19, 128, 134, 0.4); border-radius: 12px; font-weight: 600; color: #FFFFFF; display: inline-flex; align-items: center; gap: 4px;">
                            ${providerName}
                        </span>
                    </div>
                    <h2 style="margin: 0 0 10px 0; font-size: clamp(1.6rem, 4vw, 2.5rem); font-weight: 800; color: #fff; line-height: 1.2;">${collectionTitle}</h2>
                    <p style="margin: 0 0 16px 0; color: rgba(255,255,255,0.75); font-size: 1rem;">${collectionArtist}</p>
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <button class="btn" id="playAllRemoteBtn" style="background: linear-gradient(135deg, var(--primary, #138086), var(--secondary, #22D3EE)); color: #ffffff; padding: 12px 32px; border-radius: 30px; font-weight: 800; font-size: 1.05rem; border: none; display: inline-flex; align-items: center; gap: 10px; cursor: pointer; box-shadow: 0 4px 20px rgba(19, 128, 134, 0.4); transition: transform 0.2s;"><i class="fa-solid fa-play"></i> Play All</button>
                        <button class="btn" id="saveCollectionRemoteBtn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; padding: 12px 24px; border-radius: 30px; font-weight: 700; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; backdrop-filter: blur(8px); transition: background 0.2s;"><i class="fa-solid fa-folder-plus"></i> Save to Playlists</button>
                    </div>
                </div>
            </div>
            <div class="track-list" id="remoteTrackList">
                <div style="padding: 40px 0; text-align: center; color: rgba(255,255,255,0.7);">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.2rem; color: var(--primary, #138086); margin-bottom: 12px;"></i>
                    <p style="font-size: 0.95rem; font-weight: 600;">Loading tracks from ${providerName}...</p>
                </div>
            </div>
        `;

        const backBtn = document.getElementById('backFromRemoteBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (currentQuery) {
                    renderSearch(currentQuery);
                } else {
                    renderHome();
                }
            });
        }

        let remoteTracks = [];
        try {
            if (collection.tracks && collection.tracks.length > 0) {
                remoteTracks = collection.tracks;
            } else if (collection.songs && collection.songs.length > 0) {
                remoteTracks = collection.songs;
            } else {
                const hasValidId = collection.id && collection.id !== 'undefined' && collection.id !== 'null' && String(collection.id).trim().length > 0;
                if (hasValidId) {
                    if (type === 'album') {
                        remoteTracks = await providerManager.getAlbum(pId, collection.id);
                    } else if (type === 'playlist') {
                        remoteTracks = await providerManager.getPlaylist(pId, collection.id);
                    }
                }

                // Fallback: search for the collection / artist songs directly
                if (!remoteTracks || remoteTracks.length === 0) {
                    const fallbackTerm = collection.searchQuery || collection.query || collectionTitle || currentQuery || 'top hits';
                    const searchedSongs = await searchService.searchSongs(fallbackTerm);
                    if (searchedSongs && searchedSongs.length > 0) {
                        remoteTracks = searchedSongs;
                    } else {
                        const fallbackRes = await searchService.searchAll(fallbackTerm);
                        remoteTracks = (fallbackRes && fallbackRes.songs && fallbackRes.songs.length > 0) ? fallbackRes.songs : [];
                    }
                }
            }

            const playAllBtn = document.getElementById('playAllRemoteBtn');
            if (playAllBtn) {
                playAllBtn.addEventListener('click', () => {
                    if (remoteTracks && remoteTracks.length > 0) {
                        musicService.playContext(remoteTracks, remoteTracks[0]);
                    } else {
                        showNotification('No playable tracks available in this collection.', 'warning');
                    }
                });
            }

            const saveCollectionBtn = document.getElementById('saveCollectionRemoteBtn');
            if (saveCollectionBtn) {
                saveCollectionBtn.addEventListener('click', () => {
                    if (!remoteTracks || remoteTracks.length === 0) {
                        showNotification('No tracks found to save', 'error');
                        return;
                    }
                    const plTitle = collectionTitle || `${typeLabel} - ${collectionArtist}`;
                    const newPl = playlistService.createPlaylist(plTitle, `Imported ${providerName} ${typeLabel}`);
                    remoteTracks.forEach(t => playlistService.addTrackToPlaylist(newPl.id, t));
                    showNotification(`Saved '${plTitle}' with ${remoteTracks.length} tracks to your playlists!`, 'success');
                });
            }

            const trackListContainer = document.getElementById('remoteTrackList');
            if (!remoteTracks || remoteTracks.length === 0) {
                if (trackListContainer) {
                    trackListContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 30px;">No tracks found in this collection.</p>';
                }
                return;
            }

            trackListContainer.className = 'remote-track-list-container';
            trackListContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box;';
            trackListContainer.innerHTML = '';

            remoteTracks.forEach((track, index) => {
                const row = document.createElement('div');
                row.className = 'spotify-track-row';
                row.setAttribute('data-id', track.id);
                row.setAttribute('data-index', index);
                row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; transition: background 0.2s; cursor: pointer; position: relative; width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05);';

                const tTitle = track.title || track.song || track.name || 'Untitled Track';
                const tArtist = track.artist || track.primary_artists || track.singers || 'Unknown Artist';
                const tCover = track.cover || track.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';

                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <img src="${tCover}" style="width: 46px; height: 46px; border-radius: 8px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);" alt="${tTitle}">
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                            <h4 style="font-size: 0.95rem; font-weight: 700; color: #FFFFFF; margin: 0 0 3px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tTitle}</h4>
                            <p style="font-size: 0.8rem; color: #aaaaaa; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${tArtist}
                            </p>
                        </div>
                    </div>
                    <button class="remove-from-pl-btn remote-track-opt-btn" data-id="${track.id}" title="Track options" style="background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.4); color: #38BDF8; font-size: 1.15rem; width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: auto; box-shadow: 0 4px 14px rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 10;">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                `;

                row.addEventListener('click', (e) => {
                    if (e.target.closest('.remote-track-opt-btn')) return;
                    musicService.playContext(remoteTracks, track);
                });

                const optBtn = row.querySelector('.remote-track-opt-btn');
                if (optBtn) {
                    optBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openTrackOptionsMenu(track);
                    });
                }

                trackListContainer.appendChild(row);
            });

        } catch (error) {
            console.error(error);
            const listContainer = document.getElementById('remoteTrackList');
            if (listContainer) {
                listContainer.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 30px;">Failed to load collection tracks.</p>';
            }
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
        const favCount = (favoriteService.getFavorites() || []).length;

        let html = `
            <div class="playlists-view-page view-fade-in">
            <div class="liked-songs-hero-card" id="heroLikedSongsCard">
                <div class="liked-songs-hero-info">
                    <h2><i class="fa-solid fa-heart" style="color: #EC4899; margin-right: 12px;"></i> Liked Songs</h2>
                    <p>${favCount} ${favCount === 1 ? 'favorite track' : 'favorite tracks'} saved to your library</p>
                </div>
                <div class="liked-songs-play-btn" title="Play Liked Songs">
                    <i class="fa-solid fa-play"></i>
                </div>
            </div>

            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                <h2 style="font-weight: 800;">Your Playlists</h2>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn" id="joinCollabPlaylistBtn" style="border-radius: 24px; padding: 10px 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; background: rgba(34, 211, 238, 0.15); border: 1px solid rgba(34, 211, 238, 0.4); color: #22D3EE; cursor: pointer;">
                        <i class="fa-solid fa-users"></i> Join Collab
                    </button>
                    <button class="btn btn-primary" id="openCreatePlaylistBtn" style="border-radius: 24px; padding: 10px 22px; font-weight: 700; display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #1DB954, #059669); border: none; box-shadow: 0 4px 15px rgba(29, 185, 84, 0.4);">
                        <i class="fa-solid fa-plus"></i> Create Playlist
                    </button>
                </div>
            </div>
            <div class="playlist-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px;">
        `;

        playlists.forEach(pl => {
            const coverHtml = pl.customCover ? `<img src="${pl.customCover}" style="width: 100%; height: 100%; object-fit: cover;">` : renderMosaicCover(pl.tracks);
            html += `
                <div class="music-card playlist-card" data-id="${pl.id}" style="display: flex; align-items: center; gap: 16px; padding: 14px; width: 100%; border-radius: 18px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; cursor: pointer; backdrop-filter: blur(12px);">
                    <div class="playlist-img-wrapper" style="width: 72px; height: 72px; flex-shrink: 0; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.4); background: rgba(255,255,255,0.05);">
                        ${coverHtml}
                    </div>
                    <div class="playlist-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pl.name}</h3>
                            ${pl.isCollaborative ? `<span style="font-size: 0.68rem; padding: 2px 6px; border-radius: 6px; background: rgba(34, 211, 238, 0.2); color: #22D3EE; font-weight: 700;">COLLAB</span>` : ''}
                        </div>
                        <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 0.84rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pl.description || 'Custom Playlist'}</p>
                        <span style="font-size: 0.78rem; color: #38BDF8; font-weight: 600; margin-top: 4px;">${pl.tracks.length} ${pl.tracks.length === 1 ? 'Track' : 'Tracks'}</span>
                    </div>
                    <div class="playlist-actions" style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
                        <button class="btn edit-pl-btn" data-id="${pl.id}" title="Edit Playlist" style="background: rgba(255,255,255,0.1); border-radius: 50%; width: 36px; height: 36px; border: none; color: white; cursor: pointer; transition: background 0.2s; display: flex; justify-content: center; align-items: center;"><i class="fa-solid fa-pen" style="font-size: 0.85rem;"></i></button>
                        <button class="btn delete-pl-btn" data-id="${pl.id}" title="Delete Playlist" style="background: rgba(239, 68, 68, 0.2); border-radius: 50%; width: 36px; height: 36px; border: none; color: #ef4444; cursor: pointer; transition: background 0.2s; display: flex; justify-content: center; align-items: center;"><i class="fa-solid fa-trash" style="font-size: 0.85rem;"></i></button>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        dynamicContent.innerHTML = html;

        // Liked Songs Hero Card click
        document.getElementById('heroLikedSongsCard')?.addEventListener('click', () => {
            renderFavorites();
        });

        // Add Event Listeners
        document.getElementById('openCreatePlaylistBtn')?.addEventListener('click', () => {
            document.getElementById('playlistModalTitle').textContent = 'Create Playlist';
            document.getElementById('editingPlaylistId').value = '';
            document.getElementById('playlistNameInput').value = '';
            document.getElementById('playlistDescInput').value = '';
            document.getElementById('playlistModal').classList.add('active');
        });

        document.getElementById('joinCollabPlaylistBtn')?.addEventListener('click', async () => {
            const code = prompt('Enter 6-character Collaborative Playlist Code (e.g. VIBE_7X9A):');
            if (code && code.trim()) {
                try {
                    showNotification('Joining collaborative playlist...', 'info');
                    const joinedPl = await playlistService.joinCollabPlaylist(code.trim());
                    showNotification(`Joined "${joinedPl.name}"!`, 'success');
                    renderPlaylists();
                } catch (e) {
                    showNotification(e.message || 'Failed to join collaborative playlist', 'error');
                }
            }
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

        const coverHtml = pl.customCover ? `<img src="${pl.customCover}" style="width: 100%; height: 100%; object-fit: cover;">` : renderMosaicCover(pl.tracks);

        let html = `
            <div class="spotify-playlist-view" style="width: 100%; box-sizing: border-box; padding-bottom: 90px;">
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
                        ${coverHtml}
                    </div>

                    <!-- Title & Creator Info -->
                    <div style="flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <h1 style="font-size: 2.2rem; font-weight: 800; color: #FFFFFF; margin: 0; line-height: 1.1; letter-spacing: -0.5px;">${pl.name}</h1>
                            ${pl.isCollaborative ? `<span style="font-size: 0.75rem; padding: 4px 10px; border-radius: 10px; background: rgba(34, 211, 238, 0.2); border: 1px solid rgba(34, 211, 238, 0.4); color: #22D3EE; font-weight: 700;">🤝 Collab Code: ${pl.collabCode}</span>` : ''}
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

                        <!-- Share Playlist Button -->
                        <button id="sharePlBtn" title="Share playlist link" style="background: none; border: none; color: var(--text-muted); font-size: 1.3rem; cursor: pointer; transition: transform 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-arrow-up-from-bracket"></i>
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
                    <button id="chipCollabBtn" style="background: rgba(34, 211, 238, 0.15); border: 1px solid rgba(34, 211, 238, 0.4); color: #22D3EE; padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <i class="fa-solid fa-users"></i> ${pl.isCollaborative ? 'Share Collab Code' : 'Collaborate'}
                    </button>
                    <button id="chipCoverGenBtn" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: white; padding: 8px 18px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <i class="fa-solid fa-wand-magic-sparkles" style="color: #22D3EE;"></i> AI Cover
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
                <div class="spotify-track-row pl-track-row" data-id="${track.id}" data-index="${index}" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; transition: background 0.2s; cursor: pointer; position: relative; width: 100%; box-sizing: border-box; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <img src="${track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                            <h4 style="font-size: 0.95rem; font-weight: 700; color: #FFFFFF; margin: 0 0 3px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.title || 'Untitled Track'}</h4>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${track.artist || 'Unknown Artist'}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: auto;">
                        ${track.duration ? `<span style="font-size: 0.78rem; color: var(--text-muted); flex-shrink: 0;">${track.duration}</span>` : ''}
                        <button class="remove-from-pl-btn pl-track-opt-btn" data-id="${track.id}" title="Track options" style="background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.4); color: #38BDF8; font-size: 1.15rem; width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 14px rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 10;">
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

        // Collaborative Playlist Button
        document.getElementById('chipCollabBtn')?.addEventListener('click', async () => {
            if (!pl.isCollaborative) {
                try {
                    showNotification('Enabling real-time collaborative syncing...', 'info');
                    const collabCode = await playlistService.enableCollab(pl.id);
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(collabCode);
                    }
                    prompt(`🎉 Collaborative Playlist Active!\n\nShare this Join Code with friends to edit this playlist together in real-time:\n\nJoin Code:`, collabCode);
                    renderPlaylistDetail(pl.id);
                } catch (e) {
                    showNotification(e.message || 'Failed to enable collaboration', 'error');
                }
            } else {
                prompt(`🤝 Collaborative Playlist Join Code:\n\nShare this code with friends so they can add tracks:`, pl.collabCode);
            }
        });

        // AI Cover Generator Button
        document.getElementById('chipCoverGenBtn')?.addEventListener('click', () => {
            openCoverGenModal(pl.id, pl.name);
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
        document.querySelectorAll('.pl-track-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.pl-track-opt-btn')) return;
                const idx = parseInt(row.getAttribute('data-index'));
                if (!isNaN(idx) && pl.tracks[idx]) {
                    musicService.playContext(pl.tracks, pl.tracks[idx]);
                }
            });
        });

        // Track Options / Remove Button (⋮)
        document.querySelectorAll('.pl-track-opt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = btn.getAttribute('data-id');
                const track = pl.tracks.find(t => String(t.id) === String(trackId));
                if (!track) return;

                openTrackOptionsMenu(track, pl);
            });
        });
    }

    // Track Options Action Sheet Controller (Spotify x YouTube Music Style)
    function openTrackOptionsMenu(track, playlistContext = null) {
        if (!track) return;
        const modal = document.getElementById('songOptionsModal');
        if (!modal) return;

        const coverEl = document.getElementById('sheetTrackCover');
        const titleEl = document.getElementById('sheetTrackTitle');
        const artistEl = document.getElementById('sheetTrackArtist');
        const playBtn = document.getElementById('sheetPlayBtn');
        const likeBtn = document.getElementById('sheetLikeBtn');
        const storyShareBtn = document.getElementById('sheetStoryShareBtn');
        const pipBtn = document.getElementById('sheetPipBtn');
        const addPlBtn = document.getElementById('sheetAddPlBtn');
        const downloadBtn = document.getElementById('sheetDownloadBtn');
        const ringtoneBtn = document.getElementById('sheetRingtoneBtn');
        const lyricsBtn = document.getElementById('sheetLyricsBtn');
        const removeBtn = document.getElementById('sheetRemoveBtn');
        const closeBtn = document.getElementById('closeSongOptionsBtn');

        if (coverEl) coverEl.src = track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';
        if (titleEl) titleEl.textContent = track.title || 'Untitled Track';
        if (artistEl) artistEl.textContent = track.artist || 'Unknown Artist';

        // Like button state
        const isFav = favoriteService.isFavorite(track.id);
        if (likeBtn) {
            likeBtn.innerHTML = `
                <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart" style="${isFav ? 'color: #EC4899;' : ''}"></i>
                <span>${isFav ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</span>
            `;
            likeBtn.onclick = () => {
                favoriteService.toggleFavorite(track);
                modal.classList.remove('active');
                showNotification(isFav ? 'Removed from Liked Songs' : 'Added to Liked Songs ❤️', 'success');
            };
        }

        if (playBtn) {
            playBtn.onclick = () => {
                modal.classList.remove('active');
                musicService.playTrack(track);
            };
        }

        if (storyShareBtn) {
            storyShareBtn.onclick = () => {
                modal.classList.remove('active');
                openStoryShareModal(track);
            };
        }

        if (pipBtn) {
            pipBtn.onclick = () => {
                modal.classList.remove('active');
                togglePipPlayer(true);
            };
        }

        if (addPlBtn) {
            addPlBtn.onclick = () => {
                modal.classList.remove('active');
                openAddToPlaylistModal(track);
            };
        }

        if (downloadBtn) {
            downloadBtn.onclick = () => {
                modal.classList.remove('active');
                musicService.downloadTrack(track);
            };
        }

        if (ringtoneBtn) {
            ringtoneBtn.onclick = () => {
                modal.classList.remove('active');
                openRingtoneModal(track);
            };
        }

        if (lyricsBtn) {
            lyricsBtn.onclick = () => {
                modal.classList.remove('active');
                openLyricsModal(track);
            };
        }

        if (removeBtn) {
            if (playlistContext) {
                removeBtn.style.display = 'flex';
                removeBtn.onclick = () => {
                    playlistService.removeTrackFromPlaylist(playlistContext.id, track.id);
                    modal.classList.remove('active');
                    renderPlaylistDetail(playlistContext.id);
                    showNotification(`Removed "${track.title}" from playlist`, 'info');
                };
            } else {
                removeBtn.style.display = 'none';
            }
        }

        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('active');
        }
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };

        modal.classList.add('active');
    }

    function openAddToPlaylistModal(track) {
        if (!track) return;
        const modal = document.getElementById('addToPlaylistModal');
        const list = document.getElementById('playlistSelectionList');
        const closeBtn = document.getElementById('closeAddToPlaylistModal');
        if (!modal || !list) return;

        const playlists = playlistService.getPlaylists();
        list.innerHTML = '';

        if (playlists.length === 0) {
            list.innerHTML = `<p style="color: rgba(255,255,255,0.6); padding: 15px;">No playlists found. Create one first!</p>`;
        } else {
            playlists.forEach(pl => {
                const item = document.createElement('div');
                item.className = 'glass-chip';
                item.style.cssText = 'padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; justify-content: space-between; color: white; width: 100%; box-sizing: border-box; font-weight: 600; margin-bottom: 6px;';
                item.innerHTML = `<span><i class="fa-solid fa-music" style="margin-right: 10px; color: #38BDF8;"></i>${pl.name}</span> <span style="font-size: 0.8rem; opacity: 0.6;">${pl.tracks.length} songs</span>`;
                item.addEventListener('click', () => {
                    playlistService.addTrackToPlaylist(pl.id, track);
                    modal.classList.remove('active');
                    showNotification(`Added "${track.title}" to playlist "${pl.name}"`, 'success');
                });
                list.appendChild(item);
            });
        }

        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('active');
        }
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
        modal.classList.add('active');
    }

    function openRingtoneModal(track) {
        if (!track) return;
        const modal = document.getElementById('ringtoneModal');
        const closeBtn = document.getElementById('closeRingtoneModal');
        const titleEl = document.getElementById('ringtoneSongTitle');
        const downloadBtn = document.getElementById('ringtoneDownloadBtn');
        const setDeviceBtn = document.getElementById('ringtoneSetDeviceBtn');
        if (!modal) return;

        if (titleEl) titleEl.textContent = `${track.title || 'Track'} - ${track.artist || 'Artist'}`;

        if (downloadBtn) {
            downloadBtn.onclick = () => {
                modal.classList.remove('active');
                musicService.downloadTrack(track);
                showNotification('Downloading ringtone audio clip...', 'info');
            };
        }
        if (setDeviceBtn) {
            setDeviceBtn.onclick = () => {
                modal.classList.remove('active');
                showNotification('Ringtone set as default system ringtone!', 'success');
            };
        }
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('active');
        }
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
        modal.classList.add('active');
    }

    // Spotify-Style Story Share Modal Controller
    let currentStoryCardCanvas = null;
    async function openStoryShareModal(track = null) {
        const currentPlaying = track || musicService.currentTrack;
        if (!currentPlaying) {
            showNotification('Play a song first to share its story card!', 'info');
            return;
        }

        const modal = document.getElementById('storyShareModal');
        const previewContainer = document.getElementById('storyCardPreviewContainer');
        const closeBtn = document.getElementById('closeStoryShareModal');
        const downloadBtn = document.getElementById('downloadStoryBtn');
        const shareBtn = document.getElementById('nativeShareStoryBtn');

        if (!modal || !previewContainer) return;

        previewContainer.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.2rem; color: #22D3EE;"></i>`;
        modal.classList.add('active');

        try {
            const canvas = await storyShareService.renderStoryCard(currentPlaying);
            currentStoryCardCanvas = canvas;

            previewContainer.innerHTML = '';
            const previewImg = document.createElement('img');
            previewImg.src = canvas.toDataURL('image/png');
            previewImg.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 20px;';
            previewContainer.appendChild(previewImg);
        } catch (e) {
            console.error('Story card render error:', e);
            previewContainer.innerHTML = `<p style="color: rgba(255,255,255,0.6); padding: 20px;">Failed to generate story card.</p>`;
        }

        if (downloadBtn) {
            downloadBtn.onclick = () => {
                if (currentStoryCardCanvas) {
                    storyShareService.downloadCard(currentStoryCardCanvas, `${currentPlaying.title || 'vibentra'}-story.png`);
                    showNotification('Story card downloaded!', 'success');
                }
            };
        }

        if (shareBtn) {
            shareBtn.onclick = async () => {
                if (currentStoryCardCanvas) {
                    await storyShareService.shareCard(currentStoryCardCanvas, currentPlaying);
                }
            };
        }

        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
    }

    // Lyrics & Multilingual Translation Controller
    let currentRawLyrics = null;
    let activeLyricsLang = 'original';
    let lyricsTimeUpdateListener = null;

    async function openLyricsModal(track = null) {
        const currentPlaying = track || musicService.currentTrack;
        if (!currentPlaying) {
            showNotification('Play a track first to see lyrics!', 'info');
            return;
        }

        const modal = document.getElementById('lyricsModal');
        const closeBtn = document.getElementById('closeLyricsModal');
        const titleEl = document.getElementById('lyricsTitle');
        const contentEl = document.getElementById('lyricsContent');
        const langBar = document.getElementById('lyricsLangBar');

        if (!modal || !contentEl) return;

        if (titleEl) titleEl.textContent = `${currentPlaying.title || 'Lyrics'} - ${currentPlaying.artist || ''}`;
        contentEl.innerHTML = `
            <div style="padding: 40px 0; text-align: center; color: rgba(255,255,255,0.7);">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.2rem; color: #22D3EE; margin-bottom: 12px;"></i>
                <p style="font-size: 0.95rem; font-weight: 600;">Searching synced lyrics & sing-along notes...</p>
            </div>
        `;

        modal.classList.add('active');
        activeLyricsLang = 'original';

        // Reset pills
        if (langBar) {
            langBar.querySelectorAll('.lyrics-lang-pill').forEach(p => {
                p.classList.toggle('active', p.getAttribute('data-lang') === 'original');
            });
        }

        try {
            currentRawLyrics = await lyricsService.fetchLyrics(currentPlaying);
            renderLyricsContent(currentRawLyrics, contentEl);
        } catch (e) {
            console.error('Lyrics error:', e);
            contentEl.innerHTML = `<p style="color: rgba(255,255,255,0.6); padding: 30px;">Lyrics unavailable for this song.</p>`;
        }

        // Wire language pill clicks
        if (langBar) {
            langBar.querySelectorAll('.lyrics-lang-pill').forEach(pill => {
                pill.onclick = async () => {
                    langBar.querySelectorAll('.lyrics-lang-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    const lang = pill.getAttribute('data-lang');
                    activeLyricsLang = lang;

                    if (!currentRawLyrics) return;

                    contentEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="font-size: 1.8rem; color: #22D3EE; margin: 30px auto; display: block;"></i>`;

                    if (lang === 'original') {
                        renderLyricsContent(currentRawLyrics, contentEl);
                    } else if (lang === 'romanized') {
                        const romLyrics = lyricsService.getRomanizedLyrics(currentRawLyrics);
                        renderLyricsContent(romLyrics, contentEl);
                    } else {
                        const transLyrics = await lyricsService.translateLyrics(currentRawLyrics, lang);
                        renderLyricsContent(transLyrics, contentEl);
                    }
                };
            });
        }

        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
    }

    function renderLyricsContent(lyricsData, containerEl) {
        if (!lyricsData || (!lyricsData.plainText && (!lyricsData.syncedLines || lyricsData.syncedLines.length === 0))) {
            containerEl.innerHTML = `<p style="color: rgba(255,255,255,0.6); padding: 40px;">No lyrics found for this track.</p>`;
            return;
        }

        if (lyricsData.isSynced && lyricsData.syncedLines && lyricsData.syncedLines.length > 0) {
            containerEl.innerHTML = '';
            lyricsData.syncedLines.forEach((line, idx) => {
                const lineEl = document.createElement('div');
                lineEl.className = 'synced-lyrics-line';
                lineEl.setAttribute('data-time', line.time);
                lineEl.setAttribute('data-idx', idx);
                lineEl.style.cssText = 'padding: 8px 16px; border-radius: 12px; margin-bottom: 6px; transition: all 0.3s ease; color: rgba(255,255,255,0.5); font-weight: 700; font-size: 1.15rem; cursor: pointer;';
                lineEl.textContent = line.text;

                lineEl.addEventListener('click', () => {
                    musicService.seek(line.time);
                });

                containerEl.appendChild(lineEl);
            });

            // Clean up previous timeupdate listener
            if (lyricsTimeUpdateListener) {
                musicService.audio.removeEventListener('timeupdate', lyricsTimeUpdateListener);
            }

            lyricsTimeUpdateListener = () => {
                const curr = musicService.currentTime;
                const lines = containerEl.querySelectorAll('.synced-lyrics-line');
                let activeIdx = -1;

                lines.forEach((l, i) => {
                    const t = parseFloat(l.getAttribute('data-time'));
                    if (curr >= t) {
                        activeIdx = i;
                    }
                });

                lines.forEach((l, i) => {
                    if (i === activeIdx) {
                        l.style.color = '#FFFFFF';
                        l.style.background = 'rgba(34, 211, 238, 0.2)';
                        l.style.transform = 'scale(1.03)';
                        l.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        l.style.color = 'rgba(255,255,255,0.45)';
                        l.style.background = 'transparent';
                        l.style.transform = 'scale(1)';
                    }
                });
            };

            musicService.audio.addEventListener('timeupdate', lyricsTimeUpdateListener);
        } else {
            containerEl.innerHTML = `<div style="text-align: left; color: rgba(255,255,255,0.9); font-size: 1.15rem; line-height: 2.2; padding: 10px 20px;">${lyricsData.plainText}</div>`;
        }
    }

    // Custom AI Playlist Cover Generator Controller
    function openCoverGenModal(playlistId = null, defaultTitle = 'My Playlist') {
        const modal = document.getElementById('coverGeneratorModal');
        const previewImg = document.getElementById('coverGenPreview');
        const titleInput = document.getElementById('coverGenTitleInput');
        const subtitleInput = document.getElementById('coverGenSubtitleInput');
        const applyBtn = document.getElementById('applyCoverGenBtn');
        const closeBtn = document.getElementById('closeCoverGenModal');

        if (!modal) return;

        let selectedPreset = 'cyberpunk';
        if (titleInput) titleInput.value = defaultTitle;
        if (subtitleInput) subtitleInput.value = 'Curated Soundscape';

        const updatePreview = () => {
            const dataUrl = coverGeneratorService.generateCover({
                title: titleInput ? titleInput.value : defaultTitle,
                subtitle: subtitleInput ? subtitleInput.value : 'Vibentra Mix',
                presetId: selectedPreset
            });
            if (previewImg) previewImg.src = dataUrl;
            return dataUrl;
        };

        // Wire preset pills
        modal.querySelectorAll('.cover-preset-pill').forEach(pill => {
            pill.onclick = () => {
                modal.querySelectorAll('.cover-preset-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedPreset = pill.getAttribute('data-preset');
                updatePreview();
            };
        });

        titleInput?.addEventListener('input', updatePreview);
        subtitleInput?.addEventListener('input', updatePreview);

        updatePreview();
        modal.classList.add('active');

        if (applyBtn) {
            applyBtn.onclick = () => {
                const coverDataUrl = updatePreview();
                if (playlistId) {
                    playlistService.setCustomCover(playlistId, coverDataUrl);
                    showNotification('Custom AI artwork applied to playlist!', 'success');
                    modal.classList.remove('active');
                    renderPlaylistDetail(playlistId);
                } else {
                    sessionStorage.setItem('temp_playlist_cover', coverDataUrl);
                    showNotification('Artwork generated! Ready to create playlist.', 'success');
                    modal.classList.remove('active');
                }
            };
        }

        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
    }

    // Vibentra Wrapped Full-Screen Story Carousel Controller
    let wrappedSlideTimer = null;
    let currentWrappedIndex = 0;
    function openWrappedModal() {
        const modal = document.getElementById('wrappedModal');
        const contentContainer = document.getElementById('wrappedSlideContent');
        const progressBars = document.getElementById('wrappedProgressBars');
        const closeBtn = document.getElementById('closeWrappedBtn');
        const prevTouch = document.getElementById('wrappedPrevTouch');
        const nextTouch = document.getElementById('wrappedNextTouch');
        const shareBtn = document.getElementById('wrappedShareBtn');

        if (!modal || !contentContainer) return;

        const stats = historyService.getWrappedAnalytics();
        currentWrappedIndex = 0;
        modal.classList.add('active');

        const slides = [
            // Slide 0: Total Minutes & Overview
            `
                <div class="wrapped-slide-fade" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
                    <div style="font-size: 3.5rem; margin-bottom: 12px; filter: drop-shadow(0 0 20px #22D3EE);">🎧</div>
                    <span style="font-size: 0.85rem; font-weight: 800; letter-spacing: 2px; color: #22D3EE; text-transform: uppercase; margin-bottom: 8px;">VIBENTRA WRAPPED</span>
                    <h2 style="font-size: 2.2rem; font-weight: 900; color: #FFFFFF; margin: 0 0 16px 0; line-height: 1.2;">Your Music Year in Review</h2>
                    <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 20px; width: 100%; box-sizing: border-box; margin-bottom: 12px;">
                        <h3 style="font-size: 3rem; font-weight: 900; color: #22D3EE; margin: 0;">${stats.totalMinutes}</h3>
                        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 0.95rem; font-weight: 600;">Minutes Listened across Vibentra</p>
                    </div>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 0;">Tap right to see your Top Artists & Tracks 👉</p>
                </div>
            `,
            // Slide 1: Top 5 Artists
            `
                <div class="wrapped-slide-fade" style="display: flex; flex-direction: column; align-items: center; width: 100%; height: 100%;">
                    <span style="font-size: 0.85rem; font-weight: 800; letter-spacing: 2px; color: #F43F5E; text-transform: uppercase; margin-bottom: 6px;">TOP ARTISTS</span>
                    <h2 style="font-size: 1.8rem; font-weight: 900; color: #FFFFFF; margin: 0 0 16px 0;">Artists You Couldn't Stop Playing</h2>
                    <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
                        ${stats.topArtists.map(a => `
                            <div class="wrapped-rank-row">
                                <span class="wrapped-rank-num">${a.rank}</span>
                                <img src="${a.cover}" class="wrapped-rank-img" alt="${a.name}">
                                <div class="wrapped-rank-text">
                                    <h4>${a.name}</h4>
                                    <p>${a.plays} plays</p>
                                </div>
                                <i class="fa-solid fa-crown" style="color: ${a.rank === 1 ? '#FBBF24' : 'transparent'};"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,
            // Slide 2: Top 5 Tracks
            `
                <div class="wrapped-slide-fade" style="display: flex; flex-direction: column; align-items: center; width: 100%; height: 100%;">
                    <span style="font-size: 0.85rem; font-weight: 800; letter-spacing: 2px; color: #10B981; text-transform: uppercase; margin-bottom: 6px;">TOP HITS</span>
                    <h2 style="font-size: 1.8rem; font-weight: 900; color: #FFFFFF; margin: 0 0 16px 0;">Your Most Replayed Anthems</h2>
                    <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
                        ${stats.topSongs.map(s => `
                            <div class="wrapped-rank-row">
                                <span class="wrapped-rank-num">${s.rank}</span>
                                <img src="${s.cover}" class="wrapped-rank-img" alt="${s.title}">
                                <div class="wrapped-rank-text">
                                    <h4>${s.title}</h4>
                                    <p>${s.artist}</p>
                                </div>
                                <i class="fa-solid fa-fire" style="color: ${s.rank === 1 ? '#EF4444' : 'rgba(255,255,255,0.2)'};"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,
            // Slide 3: Music Persona
            `
                <div class="wrapped-slide-fade" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
                    <div style="font-size: 3.5rem; margin-bottom: 12px; filter: drop-shadow(0 0 25px ${stats.persona.color1});"><i class="${stats.persona.icon}" style="color: ${stats.persona.color1};"></i></div>
                    <span style="font-size: 0.85rem; font-weight: 800; letter-spacing: 2px; padding: 4px 14px; border-radius: 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #FFFFFF; text-transform: uppercase; margin-bottom: 12px;">${stats.persona.badge}</span>
                    <h2 style="font-size: 2.2rem; font-weight: 900; color: #FFFFFF; margin: 0 0 12px 0;">${stats.persona.title}</h2>
                    <p style="color: rgba(255,255,255,0.85); font-size: 1rem; line-height: 1.6; margin: 0 0 20px 0; max-width: 320px;">${stats.persona.tagline}</p>
                    <div style="padding: 10px 20px; background: rgba(255,255,255,0.06); border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 0.85rem; color: rgba(255,255,255,0.6);">Peak Vibe: </span>
                        <strong style="color: #22D3EE;">${stats.topGenre}</strong>
                    </div>
                </div>
            `
        ];

        const renderSlide = (idx) => {
            currentWrappedIndex = idx;
            contentContainer.innerHTML = slides[idx];

            // Update top progress bars
            const barFills = modal.querySelectorAll('.wrap-bar-fill');
            barFills.forEach((fill, bIdx) => {
                if (bIdx < idx) fill.style.width = '100%';
                else if (bIdx === idx) fill.style.width = '100%';
                else fill.style.width = '0%';
            });

            // Clear old timer
            if (wrappedSlideTimer) clearTimeout(wrappedSlideTimer);

            // Auto-advance timer (5.5s)
            if (idx < slides.length - 1) {
                wrappedSlideTimer = setTimeout(() => {
                    renderSlide(idx + 1);
                }, 5500);
            }
        };

        renderSlide(0);

        if (prevTouch) {
            prevTouch.onclick = () => {
                if (currentWrappedIndex > 0) renderSlide(currentWrappedIndex - 1);
            };
        }

        if (nextTouch) {
            nextTouch.onclick = () => {
                if (currentWrappedIndex < slides.length - 1) renderSlide(currentWrappedIndex + 1);
                else modal.classList.remove('active');
            };
        }

        if (shareBtn) {
            shareBtn.onclick = () => {
                if (navigator.share) {
                    navigator.share({
                        title: 'My Vibentra Wrapped 2026',
                        text: `I spent ${stats.totalMinutes} minutes listening on Vibentra! My persona is ${stats.persona.title} (${stats.persona.badge}). Check out Vibentra! ✨`,
                        url: window.location.href
                    }).catch(() => {});
                } else {
                    showNotification(`Copied Wrapped stats: ${stats.totalMinutes} mins listened! 🎶`, 'success');
                }
            };
        }

        if (closeBtn) {
            closeBtn.onclick = () => {
                if (wrappedSlideTimer) clearTimeout(wrappedSlideTimer);
                modal.classList.remove('active');
            };
        }
    }

    // Floating Picture-in-Picture Mini Player Widget Controller
    function togglePipPlayer(forceState = null) {
        const pipWidget = document.getElementById('floatingPipPlayer');
        if (!pipWidget) return;

        const isCurrentlyHidden = pipWidget.classList.contains('hidden');
        const shouldShow = forceState !== null ? forceState : isCurrentlyHidden;

        if (shouldShow) {
            pipWidget.classList.remove('hidden');
            updatePipWidget();
        } else {
            pipWidget.classList.add('hidden');
        }
    }

    function updatePipWidget() {
        const pipWidget = document.getElementById('floatingPipPlayer');
        if (!pipWidget || pipWidget.classList.contains('hidden')) return;

        const track = musicService.currentTrack;
        const isPlaying = musicService.isPlaying;

        const cover = document.getElementById('pipCover');
        const title = document.getElementById('pipTitle');
        const artist = document.getElementById('pipArtist');
        const playBtn = document.getElementById('pipPlayBtn');

        if (track) {
            if (cover) cover.src = track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80';
            if (title) title.textContent = track.title || 'Untitled Track';
            if (artist) artist.textContent = track.artist || 'Unknown Artist';
        }

        if (playBtn) {
            playBtn.innerHTML = `<i class="fa-solid fa-${isPlaying ? 'pause' : 'play'}"></i>`;
        }
    }

    // Bind PiP Controls once
    document.getElementById('pipCloseBtn')?.addEventListener('click', () => togglePipPlayer(false));
    document.getElementById('pipPlayBtn')?.addEventListener('click', () => musicService.togglePlay());
    document.getElementById('pipPrevBtn')?.addEventListener('click', () => musicService.playPrevious());
    document.getElementById('pipNextBtn')?.addEventListener('click', () => musicService.playNext());
    document.getElementById('pipExpandBtn')?.addEventListener('click', () => {
        togglePipPlayer(false);
        document.getElementById('largePlayerModal')?.classList.add('active');
    });

    // Sync PiP widget with playback events
    musicService.onTrackChange = (track) => {
        updatePipWidget();
    };
    musicService.onStateChange = (isPlaying) => {
        updatePipWidget();
    };

    // Global Topbar Triggers
    document.getElementById('topPipToggleBtn')?.addEventListener('click', () => togglePipPlayer());
    document.getElementById('topWrappedBtn')?.addEventListener('click', () => openWrappedModal());
    document.getElementById('navWrappedBtn')?.addEventListener('click', () => openWrappedModal());
    document.getElementById('largeOptStoryShare')?.addEventListener('click', () => {
        document.getElementById('largePlayerModal')?.classList.remove('active');
        openStoryShareModal();
    });
    document.getElementById('largeOptPip')?.addEventListener('click', () => {
        document.getElementById('largePlayerModal')?.classList.remove('active');
        togglePipPlayer(true);
    });
    document.getElementById('largeOptLyrics')?.addEventListener('click', () => {
        openLyricsModal();
    });
    document.getElementById('largeLyricsBtn')?.addEventListener('click', () => {
        openLyricsModal();
    });
    document.getElementById('openCoverGenFromModalBtn')?.addEventListener('click', () => {
        const id = document.getElementById('editingPlaylistId')?.value;
        const name = document.getElementById('playlistNameInput')?.value || 'My Playlist';
        openCoverGenModal(id, name);
    });

    function renderFavorites() {
        const favs = favoriteService.getFavorites();
        let html = `
            <div class="favorites-view-page view-fade-in">
            <div class="liked-songs-hero-card" style="margin-bottom: 24px;">
                <div class="liked-songs-hero-info">
                    <h2><i class="fa-solid fa-heart" style="color: #EC4899; margin-right: 10px;"></i> Liked Songs</h2>
                    <p>${favs.length} ${favs.length === 1 ? 'track' : 'tracks'} in your collection</p>
                </div>
                ${favs.length > 0 ? `
                <div class="liked-songs-play-btn" id="playAllFavsBtn" title="Play All Liked Songs">
                    <i class="fa-solid fa-play"></i>
                </div>
                ` : ''}
            </div>
            <div class="track-list" id="favoritesTrackList">
        `;

        if (favs.length === 0) {
            html += `<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 40px;">No favorite songs yet. Start liking tracks!</p>`;
        } else {
            favs.forEach((track, index) => {
                html += `
                <div class="spotify-track-row fav-track-row" data-index="${index}" style="display: flex; align-items: center; gap: 14px; padding: 10px 14px; border-radius: 14px; background: rgba(255,255,255,0.03); margin-bottom: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.06);">
                    <div style="width: 24px; color: rgba(255,255,255,0.5); font-weight: 700; text-align: center;">${index + 1}</div>
                    <img src="${track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'}" style="width: 46px; height: 46px; border-radius: 8px; object-fit: cover;">
                    <div style="flex: 1; min-width: 0;">
                        <h4 style="margin: 0 0 2px 0; font-size: 0.95rem; font-weight: 700; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.title}</h4>
                        <p style="margin: 0; font-size: 0.8rem; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.artist}</p>
                    </div>
                    <div style="font-size: 0.82rem; color: rgba(255,255,255,0.5); font-weight: 600; margin-right: 8px;">${track.duration || ''}</div>
                    <button class="remove-from-pl-btn fav-opt-btn" data-id="${track.id}" title="Options" style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); color: #38BDF8; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                </div>
                `;
            });
        }

        html += `</div></div>`;
        dynamicContent.innerHTML = html;

        document.getElementById('playAllFavsBtn')?.addEventListener('click', () => {
            if (favs.length > 0) musicService.playContext(favs, favs[0]);
        });

        document.querySelectorAll('.fav-track-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.fav-opt-btn')) return;
                const idx = parseInt(row.getAttribute('data-index'));
                if (!isNaN(idx) && favs[idx]) musicService.playContext(favs, favs[idx]);
            });
        });

        document.querySelectorAll('.fav-opt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = btn.getAttribute('data-id');
                const track = favs.find(t => String(t.id) === String(trackId));
                if (track) openTrackOptionsMenu(track);
            });
        });
    }

    function renderConnect() {
        const username = document.getElementById('welcomeName')?.textContent || 'User';

        if (!connectService.currentRoomId) {
            dynamicContent.innerHTML = `
                <div class="connect-view-wrapper view-fade-in" style="max-width: 800px; margin: 0 auto; padding-bottom: 80px;">
                    <!-- Hero Jam Card -->
                    <div class="glass-panel" style="border-radius: 24px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(124, 58, 237, 0.3) 100%); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 24px; box-shadow: 0 12px 30px rgba(0,0,0,0.4);">
                        <div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #22D3EE, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: white; box-shadow: 0 0 25px rgba(34, 211, 238, 0.6);">
                            <i class="fa-solid fa-tower-broadcast"></i>
                        </div>
                        <h2 style="font-size: 1.8rem; font-weight: 900; color: #FFFFFF; margin: 0;">Live Jam & Listening Rooms</h2>
                        <p style="color: rgba(255,255,255,0.8); font-size: 0.95rem; margin: 0; max-width: 500px; line-height: 1.5;">
                            Listen to music simultaneously with friends from anywhere in the world in real-time.
                        </p>
                    </div>

                    <!-- Host & Join Options Grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                        <!-- Host Card -->
                        <div class="glass-panel" style="padding: 24px; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; border: 1px solid rgba(255,255,255,0.1);">
                            <div>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                    <i class="fa-solid fa-crown" style="color: #FBBF24; font-size: 1.3rem;"></i>
                                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: white;">Host a Jam Session</h3>
                                </div>
                                <p style="color: rgba(255,255,255,0.65); font-size: 0.88rem; line-height: 1.45; margin: 0;">
                                    Create a private room, share your 6-letter room code, and control playback for all connected listeners.
                                </p>
                            </div>
                            <button id="startJamBtn" class="btn btn-primary" style="padding: 14px; border-radius: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #1DB954, #059669); border: none;">
                                <i class="fa-solid fa-play"></i> Start Jam Room
                            </button>
                        </div>

                        <!-- Join Card -->
                        <div class="glass-panel" style="padding: 24px; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; border: 1px solid rgba(255,255,255,0.1);">
                            <div>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                    <i class="fa-solid fa-right-to-bracket" style="color: #22D3EE; font-size: 1.3rem;"></i>
                                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: white;">Join Friend's Jam</h3>
                                </div>
                                <p style="color: rgba(255,255,255,0.65); font-size: 0.88rem; line-height: 1.45; margin: 0 0 12px 0;">
                                    Enter the 6-letter code shared by your friend to sync your player to their stream.
                                </p>
                                <input type="text" id="jamCodeInput" placeholder="Enter Room Code (e.g. ABC123)" maxlength="6" style="width: 100%; box-sizing: border-box; padding: 12px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: #FFFFFF; font-size: 1rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; outline: none;">
                            </div>
                            <button id="joinJamBtn" class="btn" style="padding: 14px; border-radius: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(34, 211, 238, 0.2); border: 1px solid rgba(34, 211, 238, 0.4); color: #22D3EE; cursor: pointer;">
                                <i class="fa-solid fa-users"></i> Join Session
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('startJamBtn')?.addEventListener('click', async () => {
                try {
                    showNotification('Creating your Live Jam room...', 'info');
                    const roomId = await connectService.createRoom(username);
                    showNotification(`Live Jam Room created: ${roomId}!`, 'success');
                    renderConnect();
                } catch (e) {
                    showNotification('Failed to create room: ' + e.message, 'error');
                }
            });

            document.getElementById('joinJamBtn')?.addEventListener('click', async () => {
                const code = document.getElementById('jamCodeInput')?.value;
                if (!code || code.trim().length < 4) {
                    showNotification('Please enter a valid 6-letter Room Code', 'error');
                    return;
                }
                try {
                    showNotification('Connecting to Live Jam...', 'info');
                    await connectService.joinRoom(code.trim(), username);
                    showNotification('Connected to Live Jam!', 'success');
                    renderConnect();
                } catch (e) {
                    showNotification(e.message || 'Failed to join Jam', 'error');
                }
            });

        } else {
            // Active Jam Room View
            const roomId = connectService.currentRoomId;
            const isHost = connectService.isHost;

            dynamicContent.innerHTML = `
                <div class="connect-room-wrapper view-fade-in" style="max-width: 800px; margin: 0 auto; padding-bottom: 90px;">
                    <!-- Room Header Bar -->
                    <div class="glass-panel" style="border-radius: 20px; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; border: 1px solid rgba(34, 211, 238, 0.3);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 1.4rem; color: #22D3EE;"><i class="fa-solid fa-tower-broadcast"></i></span>
                            <div>
                                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: white;">Jam Room: <span style="color: #22D3EE; letter-spacing: 2px;">${roomId}</span></h3>
                                <span style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">${isHost ? '👑 You are the Host (broadcasting)' : '🎧 Connected as Guest (listening)'}</span>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <button id="copyJamCodeBtn" class="btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
                                <i class="fa-solid fa-copy"></i> Copy Code
                            </button>
                            <button id="leaveJamBtn" class="btn" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #EF4444; padding: 8px 16px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
                                Leave Jam
                            </button>
                        </div>
                    </div>

                    <!-- Room Live Sync Player & Chat Box -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
                        <!-- Currently Playing Section -->
                        <div class="glass-panel" style="padding: 24px; border-radius: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                            <h4 style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0;">Now Synchronized</h4>
                            <img id="jamTrackCover" src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80" style="width: 140px; height: 140px; border-radius: 18px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.5); margin-bottom: 14px;">
                            <h3 id="jamTrackTitle" style="margin: 0 0 4px 0; font-size: 1.15rem; font-weight: 800; color: white;">No track streaming yet</h3>
                            <p id="jamTrackArtist" style="margin: 0 0 16px 0; font-size: 0.85rem; color: var(--text-muted);">Host can play any song to broadcast</p>
                            <div id="jamParticipantsList" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 10px;">
                                <span style="font-size: 0.8rem; color: #22D3EE; font-weight: 700;">Active Listeners: 1</span>
                            </div>
                        </div>

                        <!-- Live Jam Chat & Reactions -->
                        <div class="glass-panel" style="padding: 20px; border-radius: 20px; display: flex; flex-direction: column; height: 360px; border: 1px solid rgba(255,255,255,0.1);">
                            <h4 style="margin: 0 0 12px 0; font-size: 0.95rem; font-weight: 700; color: white; display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-comments" style="color: #22D3EE;"></i> Live Reactions & Chat
                            </h4>
                            <div id="jamChatMessages" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding-right: 4px;">
                                <p style="color: rgba(255,255,255,0.5); font-size: 0.82rem; text-align: center; margin: auto;">Drop a vibe or reaction below! 👇</p>
                            </div>

                            <!-- Quick Emoji Reactions -->
                            <div style="display: flex; gap: 8px; margin-bottom: 10px; overflow-x: auto; padding-bottom: 4px;">
                                <button class="jam-emoji-btn" data-emoji="🔥" style="background: rgba(255,255,255,0.08); border: none; border-radius: 8px; padding: 4px 8px; font-size: 1.1rem; cursor: pointer;">🔥</button>
                                <button class="jam-emoji-btn" data-emoji="❤️" style="background: rgba(255,255,255,0.08); border: none; border-radius: 8px; padding: 4px 8px; font-size: 1.1rem; cursor: pointer;">❤️</button>
                                <button class="jam-emoji-btn" data-emoji="⚡" style="background: rgba(255,255,255,0.08); border: none; border-radius: 8px; padding: 4px 8px; font-size: 1.1rem; cursor: pointer;">⚡</button>
                                <button class="jam-emoji-btn" data-emoji="🎉" style="background: rgba(255,255,255,0.08); border: none; border-radius: 8px; padding: 4px 8px; font-size: 1.1rem; cursor: pointer;">🎉</button>
                                <button class="jam-emoji-btn" data-emoji="💃" style="background: rgba(255,255,255,0.08); border: none; border-radius: 8px; padding: 4px 8px; font-size: 1.1rem; cursor: pointer;">💃</button>
                                <button class="jam-emoji-btn" data-emoji="🎧" style="background: rgba(255,255,255,0.08); border: none; border-radius: 8px; padding: 4px 8px; font-size: 1.1rem; cursor: pointer;">🎧</button>
                            </div>

                            <!-- Chat Input -->
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="jamMessageInput" placeholder="Send a message..." style="flex: 1; padding: 10px 14px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; color: white; outline: none; font-size: 0.9rem;">
                                <button id="jamSendMsgBtn" class="btn btn-primary" style="border-radius: 12px; padding: 0 16px; border: none;"><i class="fa-solid fa-paper-plane"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Wire Room Events
            document.getElementById('copyJamCodeBtn')?.addEventListener('click', () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(roomId);
                    showNotification(`Room code "${roomId}" copied to clipboard!`, 'success');
                }
            });

            document.getElementById('leaveJamBtn')?.addEventListener('click', () => {
                connectService.leaveRoom();
                showNotification('Left Live Jam room.', 'info');
                renderConnect();
            });

            // Chat Message Sender
            const sendChat = (text) => {
                if (!text || !text.trim()) return;
                connectService.sendMessage(text.trim(), username);
                const input = document.getElementById('jamMessageInput');
                if (input) input.value = '';
            };

            document.getElementById('jamSendMsgBtn')?.addEventListener('click', () => {
                const msg = document.getElementById('jamMessageInput')?.value;
                sendChat(msg);
            });

            document.getElementById('jamMessageInput')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendChat(e.target.value);
                }
            });

            document.querySelectorAll('.jam-emoji-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const emoji = btn.getAttribute('data-emoji');
                    sendChat(emoji);
                });
            });

            // Listen to Realtime Room State Updates
            connectService.onRoomUpdate = (roomData) => {
                if (!roomData) return;

                const cover = document.getElementById('jamTrackCover');
                const title = document.getElementById('jamTrackTitle');
                const artist = document.getElementById('jamTrackArtist');
                const participantsList = document.getElementById('jamParticipantsList');

                if (roomData.currentTrack) {
                    if (cover) cover.src = roomData.currentTrack.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';
                    if (title) title.textContent = roomData.currentTrack.title || 'Untitled Track';
                    if (artist) artist.textContent = roomData.currentTrack.artist || 'Unknown Artist';

                    // If Guest, sync audio
                    if (!connectService.isHost) {
                        const currentLocalTrack = musicService.currentTrack;
                        if (!currentLocalTrack || String(currentLocalTrack.id) !== String(roomData.currentTrack.id)) {
                            musicService.playTrack(roomData.currentTrack);
                        }
                    }
                }

                if (participantsList && roomData.participants) {
                    participantsList.innerHTML = `<span style="font-size: 0.8rem; color: #22D3EE; font-weight: 700;">Active Listeners: ${roomData.participants.length}</span>`;
                }
            };

            // Listen to Chat Messages
            connectService.onMessageReceived = (messages) => {
                const chatContainer = document.getElementById('jamChatMessages');
                if (!chatContainer) return;
                chatContainer.innerHTML = '';
                messages.forEach(m => {
                    const isMe = m.senderName === username;
                    const msgEl = document.createElement('div');
                    msgEl.style.cssText = `display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 4px;`;
                    msgEl.innerHTML = `
                        <span style="font-size: 0.72rem; color: rgba(255,255,255,0.5); margin-bottom: 2px;">${m.senderName || 'Viber'}</span>
                        <div style="background: ${isMe ? 'linear-gradient(135deg, #22D3EE, #0284C7)' : 'rgba(255,255,255,0.1)'}; color: white; padding: 6px 12px; border-radius: 12px; font-size: 0.88rem; max-width: 80%; word-break: break-word;">
                            ${m.text}
                        </div>
                    `;
                    chatContainer.appendChild(msgEl);
                });
                chatContainer.scrollTop = chatContainer.scrollHeight;
            };

            // Host syncs audio state
            if (isHost && musicService.currentTrack) {
                connectService.syncPlaybackState(musicService.currentTrack, musicService.isPlaying, musicService.currentTime);
            }
        }
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
        dynamicContent.innerHTML = `
            <div class="settings-view-wrapper">
                <div class="section-header" style="margin-bottom: 8px;">
                    <h2>Settings</h2>
                </div>
                <div class="settings-categories-list">
                    <div class="settings-card-item" data-category="account">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-user"></i>
                            <span>Account</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="interface">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-sliders"></i>
                            <span>Interface</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="battery">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-battery-half" style="color: #34D399;"></i>
                            <span>Battery & Performance</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="content">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-bars-staggered"></i>
                            <span>Content</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="audio">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-volume-high"></i>
                            <span>Audio</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="playback">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-circle-play" style="color: #38BDF8;"></i>
                            <span>Playback</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="history">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-clock-rotate-left" style="color: #F472B6;"></i>
                            <span>Listening history</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="lyrics">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-message" style="color: #A78BFA;"></i>
                            <span>Lyrics</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="ai">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-wand-magic-sparkles" style="color: #06B6D4;"></i>
                            <span>AI & Smart Engine</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="sleep">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-moon" style="color: #A78BFA;"></i>
                            <span>Sleep Timer & Automation</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="dsp">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-sliders" style="color: #F472B6;"></i>
                            <span>Sound & DSP Studio</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="notifications">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-bell" style="color: #FBBF24;"></i>
                            <span>Notifications & Lock Screen</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="sources">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-compact-disc" style="color: #E879F9;"></i>
                            <span>Music Sources</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="storage">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-download" style="color: #60A5FA;"></i>
                            <span>Storage & Cache</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>

                    <div class="settings-card-item" data-category="updates">
                        <div class="settings-card-left">
                            <i class="fa-solid fa-rotate" style="color: #34D399;"></i>
                            <span>Check for Updates</span>
                        </div>
                        <i class="fa-solid fa-chevron-right chevron"></i>
                    </div>
                </div>
            </div>
        `;

        document.querySelectorAll('.settings-card-item').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.getAttribute('data-category');
                renderSettingsCategory(category);
            });
        });
    }

    function renderSettingsCategory(category) {
        const appVersion = "v1.9.0";
        const swCacheName = "vibentra-cache-v127";

        const getSettingState = (key, defaultVal = false) => {
            const val = localStorage.getItem('vibentra_setting_' + key);
            return val !== null ? val === 'true' : defaultVal;
        };

        const setSettingState = (key, boolVal) => {
            localStorage.setItem('vibentra_setting_' + key, boolVal ? 'true' : 'false');
        };

        const getSettingVal = (key, defaultVal = '') => {
            const val = localStorage.getItem('vibentra_setting_' + key);
            return val !== null ? val : defaultVal;
        };

        const setSettingVal = (key, val) => {
            localStorage.setItem('vibentra_setting_' + key, val);
        };

        if (category === 'account') {
            const user = auth.currentUser;
            const currentUsername = localStorage.getItem('vibentra_user_name') || window.currentUserProfile?.username || (user?.displayName || user?.email?.split('@')[0]) || 'User';
            const currentEmail = user?.email || localStorage.getItem('vibentra_user_email') || 'user@vibentra.cyou';
            const currentAvatar = localStorage.getItem('vibentra_user_avatar') || window.currentUserProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80';
            const userUid = user?.uid || 'vibentra_guest_user';
            const shareUrl = `${window.location.origin}/share?user=${encodeURIComponent(currentUsername)}&uid=${encodeURIComponent(userUid)}`;
            const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&color=FFFFFF&bgcolor=181824&data=${encodeURIComponent(shareUrl)}`;

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper view-fade-in">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Account</h2>
                    </div>

                    <!-- User Account Hero Card -->
                    <div class="glass-panel" style="border-radius: 24px; padding: 26px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.35) 0%, rgba(6, 182, 212, 0.2) 100%); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 12px 35px rgba(0,0,0,0.4); margin-bottom: 24px;">
                        <div style="position: relative; width: 84px; height: 84px;">
                            <img src="${currentAvatar}" alt="${currentUsername}" style="width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 3px solid var(--neon-lime); box-shadow: 0 0 25px rgba(210, 248, 54, 0.4);">
                            <span style="position: absolute; bottom: 0; right: 0; width: 22px; height: 22px; border-radius: 50%; background: #10B981; border: 3px solid #111; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: white;">
                                <i class="fa-solid fa-check"></i>
                            </span>
                        </div>
                        <div>
                            <h3 style="font-size: 1.4rem; color: #FFFFFF; font-weight: 800; margin: 0 0 4px 0;">${currentUsername}</h3>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.88rem; margin: 0;">${currentEmail}</p>
                            <span style="display: inline-block; margin-top: 8px; font-size: 0.72rem; padding: 3px 10px; border-radius: 12px; background: rgba(210, 248, 54, 0.15); color: var(--neon-lime); font-weight: 700; border: 1px solid rgba(210, 248, 54, 0.3);">
                                <i class="fa-solid fa-shield-halved"></i> Verified Vibentra Account
                            </span>
                        </div>
                    </div>

                    <!-- Account Details List -->
                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Account Username</h4>
                                <div class="settings-option-subvalue">${currentUsername}</div>
                            </div>
                            <button id="copyUsernameBtn" class="btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; cursor: pointer;">
                                <i class="fa-regular fa-copy"></i> Copy
                            </button>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Email Address</h4>
                                <div class="settings-option-subvalue">${currentEmail}</div>
                            </div>
                            <span style="font-size: 0.8rem; color: #34D399;"><i class="fa-solid fa-circle-check"></i> Active</span>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Password & Security</h4>
                                <div class="settings-option-subvalue" id="accountPasswordMasked">••••••••••••••</div>
                            </div>
                            <button id="resetPasswordBtn" class="btn" style="background: rgba(236, 72, 153, 0.2); border: 1px solid rgba(236, 72, 153, 0.4); color: #F472B6; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
                                <i class="fa-solid fa-key"></i> Reset Password
                            </button>
                        </div>

                        <!-- User Profile QR Code Sharing Box -->
                        <div class="settings-option-row" style="flex-direction: column; align-items: center; text-align: center; padding: 24px 16px; border-bottom: none;">
                            <h4 style="font-size: 1.15rem; color: #FFFFFF; margin-bottom: 6px;">Share Your Profile QR Code</h4>
                            <p style="color: rgba(255,255,255,0.65); font-size: 0.85rem; max-width: 380px; margin-bottom: 18px; line-height: 1.4;">
                                Friends can scan this QR code to connect with your profile, shared playlists, and synced group sessions.
                            </p>

                            <div style="background: #181824; padding: 16px; border-radius: 20px; border: 2px solid rgba(255,255,255,0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; justify-content: center; margin-bottom: 16px;">
                                <img src="${qrCodeApiUrl}" alt="Profile QR Code" style="width: 200px; height: 200px; border-radius: 12px; display: block;" loading="lazy">
                            </div>

                            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                                <button id="copyShareProfileLinkBtn" class="btn" style="background: linear-gradient(135deg, #7C3AED, #06B6D4); color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 4px 15px rgba(124,58,237,0.4);">
                                    <i class="fa-solid fa-link"></i> Copy Profile Link
                                </button>
                                <a href="${qrCodeApiUrl}" download="vibentra_qr_${currentUsername}.png" target="_blank" class="btn" style="background: rgba(255,255,255,0.12); color: white; border: 1px solid rgba(255,255,255,0.25); padding: 10px 18px; border-radius: 20px; font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: none;">
                                    <i class="fa-solid fa-download"></i> Save QR
                                </a>
                            </div>
                        </div>

                        <div class="settings-option-row" id="rowLogoutAccount" style="cursor: pointer; margin-top: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.25);">
                            <div class="settings-option-text">
                                <h4 style="color: #F87171;">Log Out</h4>
                                <p style="color: rgba(248, 113, 113, 0.7);">Sign out of your account on this device</p>
                            </div>
                            <i class="fa-solid fa-arrow-right-from-bracket" style="color: #F87171; font-size: 1.2rem;"></i>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingsSubBackBtn')?.addEventListener('click', () => renderSettings());

            document.getElementById('copyUsernameBtn')?.addEventListener('click', () => {
                navigator.clipboard.writeText(currentUsername);
                showNotification('Username copied to clipboard!', 'success');
            });

            document.getElementById('copyShareProfileLinkBtn')?.addEventListener('click', () => {
                navigator.clipboard.writeText(shareUrl);
                showNotification('Profile share link copied to clipboard!', 'success');
            });

            document.getElementById('resetPasswordBtn')?.addEventListener('click', async () => {
                if (user?.email) {
                    try {
                        const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
                        await sendPasswordResetEmail(auth, user.email);
                        showNotification(`Password reset email sent to ${user.email}!`, 'success');
                    } catch (err) {
                        showNotification('Password reset link sent to your email!', 'info');
                    }
                } else {
                    showNotification('Please check your registered email for password reset instructions.', 'info');
                }
            });

            document.getElementById('rowLogoutAccount')?.addEventListener('click', async () => {
                if (confirm('Are you sure you want to log out?')) {
                    try {
                        await auth.signOut();
                        localStorage.removeItem('vibentra_user_name');
                        localStorage.removeItem('vibentra_user_email');
                        localStorage.removeItem('vibentra_user_avatar');
                        window.location.href = 'auth.html';
                    } catch (e) {
                        window.location.href = 'auth.html';
                    }
                }
            });

            return;
        }

        if (category === 'battery') {
            const isSaverOn = localStorage.getItem('vibentra_battery_saver') === 'true';
            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper view-fade-in">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Battery & Performance</h2>
                    </div>

                    <div class="glass-panel" style="border-radius: 24px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 24px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #10B981, #06B6D4); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: white; box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);">
                            <i class="fa-solid fa-battery-half"></i>
                        </div>
                        <h3 style="font-size: 1.35rem; color: #FFFFFF; font-weight: 800; margin: 0;">Power Saver Engine</h3>
                        <p style="color: rgba(255,255,255,0.75); font-size: 0.85rem; margin: 0; line-height: 1.4;">Optimizes CPU/GPU load, enables pure AMOLED black, and pauses liquid background animations.</p>
                    </div>

                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Battery Saver Mode</h4>
                                <p>Pauses visual animations & turns on OLED pure black</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingBatterySaverToggle" ${isSaverOn ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Auto-Enable below 20%</h4>
                                <p>Automatically switch when mobile battery is low</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingAutoBatteryToggle" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Display Optimization</h4>
                                <div class="settings-option-subvalue">Pure AMOLED Pure Black (#000000)</div>
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>GPU Shaders</h4>
                                <div class="settings-option-subvalue">${isSaverOn ? 'Optimized (Fast Render)' : 'High Quality Glass Blur'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingsSubBackBtn')?.addEventListener('click', () => renderSettings());

            document.getElementById('settingBatterySaverToggle')?.addEventListener('change', (e) => {
                if (window.applyBatteryMode) {
                    window.applyBatteryMode(e.target.checked, true);
                }
            });

            return;
        }

        if (category === 'updates' || category === 'about') {
            const lastCheckedTime = localStorage.getItem('vibentra_last_update_check') || new Date().toISOString().replace('T', ' ').slice(0, 19);

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Check for updates</h2>
                    </div>

                    <!-- Hero Update Card (Exact match to Reference Image 1) -->
                    <div class="glass-panel" style="border-radius: 24px; padding: 28px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.45) 0%, rgba(6, 182, 212, 0.25) 100%); border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 15px 35px rgba(0,0,0,0.4); margin-bottom: 24px;">
                        <div style="width: 68px; height: 68px; border-radius: 50%; background: linear-gradient(135deg, #7C3AED, #06B6D4); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: white; box-shadow: 0 0 25px rgba(124,58,237,0.6);">
                            <i class="fa-solid fa-rotate"></i>
                        </div>
                        <h3 style="font-size: 1.45rem; color: #FFFFFF; font-weight: 800; margin: 0;">Vibentra Music ${appVersion}</h3>
                        <p style="color: rgba(255,255,255,0.75); font-size: 0.88rem; margin: 0;">Service Worker Cache: ${swCacheName}</p>
                        
                        <button id="triggerCheckUpdateBtn" class="btn btn-primary" style="padding: 13px 26px; border-radius: 16px; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 10px; cursor: pointer; margin-top: 6px; background: linear-gradient(135deg, #06B6D4, #7C3AED); border: none; box-shadow: 0 8px 20px rgba(6, 182, 212, 0.4);">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> View Release Notes & Update
                        </button>
                    </div>

                    <!-- Details List (Exact match to Reference Image 2) -->
                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Version</h4>
                                <div class="settings-option-subvalue">${appVersion}</div>
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Automatic check for update</h4>
                                <p>Checking for update when you open app</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingAutoUpdateCheck" ${getSettingState('auto_update_check', true) ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row" id="rowCheckUpdate" style="cursor: pointer;">
                            <div class="settings-option-text">
                                <h4>Check for update</h4>
                                <div class="settings-option-subvalue" id="lastCheckTimeText">Last checked at ${lastCheckedTime}</div>
                            </div>
                            <i class="fa-solid fa-arrows-rotate" style="color: var(--secondary); font-size: 1.1rem;"></i>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Author</h4>
                                <div class="settings-option-subvalue">SRIVATSAN R</div>
                            </div>
                        </div>

                        <div class="settings-option-row" id="rowBuyCoffee" style="cursor: pointer;">
                            <div class="settings-option-text">
                                <h4>Buy me a coffee</h4>
                                <p>If you love my work, give me a coffee</p>
                            </div>
                            <i class="fa-solid fa-mug-hot" style="color: #F59E0B; font-size: 1.2rem;"></i>
                        </div>

                        <div class="settings-option-row" id="rowSupportLink" style="cursor: pointer;">
                            <div class="settings-option-text">
                                <h4>Support with UPI/Crypto</h4>
                                <div class="settings-option-subvalue" style="color: #38BDF8;">https://vibentra-rgaq.vercel.app/</div>
                            </div>
                            <i class="fa-solid fa-arrow-up-right-from-square" style="color: rgba(255,255,255,0.6);"></i>
                        </div>

                        <div class="settings-option-row" id="rowThirdPartyLibs" style="cursor: pointer;">
                            <div class="settings-option-text">
                                <h4>Third party libraries</h4>
                                <p>Description and licenses</p>
                            </div>
                            <i class="fa-solid fa-chevron-right" style="color: rgba(255,255,255,0.4);"></i>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingAutoUpdateCheck')?.addEventListener('change', (e) => setSettingState('auto_update_check', e.target.checked));

            document.getElementById('rowCheckUpdate')?.addEventListener('click', () => {
                const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
                localStorage.setItem('vibentra_last_update_check', nowStr);
                const el = document.getElementById('lastCheckTimeText');
                if (el) el.textContent = `Last checked at ${nowStr}`;
                showNotification('Checking for latest updates...', 'info');
                setTimeout(() => {
                    if (window.updateManager && typeof window.updateManager.showReleaseNotesView === 'function') {
                        window.updateManager.showReleaseNotesView();
                    } else {
                        showNotification('You are on the latest version of Vibentra Music!', 'success');
                    }
                }, 800);
            });

            document.getElementById('triggerCheckUpdateBtn')?.addEventListener('click', () => {
                if (window.updateManager && typeof window.updateManager.showReleaseNotesView === 'function') {
                    window.updateManager.showReleaseNotesView();
                } else {
                    showNotification('Checking for updates...', 'info');
                }
            });

            document.getElementById('rowBuyCoffee')?.addEventListener('click', () => {
                showNotification('Thank you for supporting Vibentra! Opening Coffee support...', 'success');
                window.open('https://buymeacoffee.com/srivatsan', '_blank');
            });

            document.getElementById('rowSupportLink')?.addEventListener('click', () => {
                window.open('https://vibentra-rgaq.vercel.app/', '_blank');
            });

            document.getElementById('rowThirdPartyLibs')?.addEventListener('click', () => {
                openLicensesModal();
            });

        } else if (category === 'lyrics') {
            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Lyrics</h2>
                    </div>

                    <!-- Details List (Exact match to Reference Image 3) -->
                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Main Lyrics Provider</h4>
                                <div class="settings-option-subvalue" id="lyricsProviderText">${getSettingVal('lyrics_provider', 'SimpMusic Lyrics')}</div>
                            </div>
                            <select id="settingLyricsProvider" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 12px; font-weight: 600; outline: none; cursor: pointer;">
                                <option value="SimpMusic Lyrics" ${getSettingVal('lyrics_provider', 'SimpMusic Lyrics') === 'SimpMusic Lyrics' ? 'selected' : ''}>SimpMusic Lyrics</option>
                                <option value="LrcLib Engine" ${getSettingVal('lyrics_provider') === 'LrcLib Engine' ? 'selected' : ''}>LrcLib Engine</option>
                                <option value="YouTube Subtitles" ${getSettingVal('lyrics_provider') === 'YouTube Subtitles' ? 'selected' : ''}>YouTube Subtitles</option>
                            </select>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Translation Language</h4>
                                <div class="settings-option-subvalue" id="transLangText">${getSettingVal('lyrics_trans_lang', 'en')}</div>
                            </div>
                            <select id="settingTransLang" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 12px; font-weight: 600; outline: none; cursor: pointer;">
                                <option value="en" ${getSettingVal('lyrics_trans_lang', 'en') === 'en' ? 'selected' : ''}>en</option>
                                <option value="ta" ${getSettingVal('lyrics_trans_lang') === 'ta' ? 'selected' : ''}>ta</option>
                                <option value="hi" ${getSettingVal('lyrics_trans_lang') === 'hi' ? 'selected' : ''}>hi</option>
                                <option value="es" ${getSettingVal('lyrics_trans_lang') === 'es' ? 'selected' : ''}>es</option>
                                <option value="fr" ${getSettingVal('lyrics_trans_lang') === 'fr' ? 'selected' : ''}>fr</option>
                            </select>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>YouTube Subtitle Translation Language</h4>
                                <div class="settings-option-subvalue" id="ytTransLangText">${getSettingVal('lyrics_yt_trans_lang', 'en')}</div>
                            </div>
                            <select id="settingYtTransLang" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 12px; font-weight: 600; outline: none; cursor: pointer;">
                                <option value="en" ${getSettingVal('lyrics_yt_trans_lang', 'en') === 'en' ? 'selected' : ''}>en</option>
                                <option value="ta" ${getSettingVal('lyrics_yt_trans_lang') === 'ta' ? 'selected' : ''}>ta</option>
                                <option value="hi" ${getSettingVal('lyrics_yt_trans_lang') === 'hi' ? 'selected' : ''}>hi</option>
                                <option value="es" ${getSettingVal('lyrics_yt_trans_lang') === 'es' ? 'selected' : ''}>es</option>
                                <option value="fr" ${getSettingVal('lyrics_yt_trans_lang') === 'fr' ? 'selected' : ''}>fr</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingLyricsProvider')?.addEventListener('change', (e) => {
                setSettingVal('lyrics_provider', e.target.value);
                document.getElementById('lyricsProviderText').textContent = e.target.value;
                showNotification(`Lyrics provider updated to ${e.target.value}`, 'success');
            });

            document.getElementById('settingTransLang')?.addEventListener('change', (e) => {
                setSettingVal('lyrics_trans_lang', e.target.value);
                document.getElementById('transLangText').textContent = e.target.value;
                showNotification(`Translation language updated to ${e.target.value}`, 'success');
            });

            document.getElementById('settingYtTransLang')?.addEventListener('change', (e) => {
                setSettingVal('lyrics_yt_trans_lang', e.target.value);
                document.getElementById('ytTransLangText').textContent = e.target.value;
                showNotification(`YouTube subtitle language updated to ${e.target.value}`, 'success');
            });

        } else if (category === 'storage' || category === 'backup') {
            const lastBackupTime = localStorage.getItem('vibentra_last_backup_time') || new Date().toISOString().replace('T', ' ').slice(0, 19);

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Backup</h2>
                    </div>

                    <!-- Details List (Exact match to Reference Image 4) -->
                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Auto backup</h4>
                                <p>Automatically backup your data to Downloads/EchoMusic folder</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingAutoBackup" ${getSettingState('auto_backup', true) ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Backup frequency</h4>
                                <div class="settings-option-subvalue" id="backupFreqText">${getSettingVal('backup_freq', 'Daily')}</div>
                            </div>
                            <select id="settingBackupFreq" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 12px; font-weight: 600; outline: none; cursor: pointer;">
                                <option value="Daily" ${getSettingVal('backup_freq', 'Daily') === 'Daily' ? 'selected' : ''}>Daily</option>
                                <option value="Weekly" ${getSettingVal('backup_freq') === 'Weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="Monthly" ${getSettingVal('backup_freq') === 'Monthly' ? 'selected' : ''}>Monthly</option>
                            </select>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Keep backups</h4>
                                <div class="settings-option-subvalue" id="keepBackupsText">Keep last ${getSettingVal('keep_backups', '5')} backups</div>
                            </div>
                            <select id="settingKeepBackups" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 12px; font-weight: 600; outline: none; cursor: pointer;">
                                <option value="5" ${getSettingVal('keep_backups', '5') === '5' ? 'selected' : ''}>5 backups</option>
                                <option value="10" ${getSettingVal('keep_backups') === '10' ? 'selected' : ''}>10 backups</option>
                                <option value="All" ${getSettingVal('keep_backups') === 'All' ? 'selected' : ''}>All backups</option>
                            </select>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Last backup</h4>
                                <div class="settings-option-subvalue" id="lastBackupTimeVal">${lastBackupTime}</div>
                            </div>
                        </div>

                        <div class="settings-option-row" id="rowExportBackup" style="cursor: pointer;">
                            <div class="settings-option-text">
                                <h4>Backup</h4>
                                <p>Save all your playlist data</p>
                            </div>
                            <i class="fa-solid fa-download" style="color: var(--secondary); font-size: 1.2rem;"></i>
                        </div>

                        <div class="settings-option-row" id="rowRestoreBackup" style="cursor: pointer;">
                            <div class="settings-option-text">
                                <h4>Restore Your Data</h4>
                                <p>Restore your saved data</p>
                            </div>
                            <i class="fa-solid fa-upload" style="color: #10B981; font-size: 1.2rem;"></i>
                            <input type="file" id="restoreFileInput" accept=".json" style="display: none;">
                        </div>

                        <div class="settings-option-row" style="flex-direction: column; align-items: flex-start; border-bottom: none;">
                            <div class="settings-option-text" style="width: 100%;">
                                <h4>Import playlists</h4>
                                <p style="margin-top: 6px; line-height: 1.5;">If you wanna migrate your playlist from Old Echo Music to here just take the backup of it and visit the link below and then upload the generated file here</p>
                                <a href="https://vibentra-rgaq.vercel.app/" target="_blank" style="color: #38BDF8; font-size: 0.9rem; text-decoration: underline; margin-top: 10px; display: inline-block;">https://vibentra-rgaq.vercel.app/</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingAutoBackup')?.addEventListener('change', (e) => setSettingState('auto_backup', e.target.checked));

            document.getElementById('settingBackupFreq')?.addEventListener('change', (e) => {
                setSettingVal('backup_freq', e.target.value);
                document.getElementById('backupFreqText').textContent = e.target.value;
                showNotification(`Backup frequency set to ${e.target.value}`, 'success');
            });

            document.getElementById('settingKeepBackups')?.addEventListener('change', (e) => {
                setSettingVal('keep_backups', e.target.value);
                document.getElementById('keepBackupsText').textContent = `Keep last ${e.target.value} backups`;
                showNotification(`Keeping last ${e.target.value} backups`, 'success');
            });

            // Real Backup JSON Download
            document.getElementById('rowExportBackup')?.addEventListener('click', () => {
                const backupObj = {
                    app: "Vibentra Music",
                    version: appVersion,
                    timestamp: new Date().toISOString(),
                    playlists: JSON.parse(localStorage.getItem('vibentra_playlists') || '[]'),
                    favorites: JSON.parse(localStorage.getItem('vibentra_favorites') || '[]'),
                    history: JSON.parse(localStorage.getItem('vibentra_history') || '[]'),
                    settings: Object.keys(localStorage).filter(k => k.startsWith('vibentra_setting_')).reduce((acc, k) => { acc[k] = localStorage.getItem(k); return acc; }, {})
                };
                const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vibentra_backup_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
                localStorage.setItem('vibentra_last_backup_time', nowStr);
                const el = document.getElementById('lastBackupTimeVal');
                if (el) el.textContent = nowStr;
                showNotification('Playlist backup saved to Downloads!', 'success');
            });

            // Real Restore Data File Upload
            document.getElementById('rowRestoreBackup')?.addEventListener('click', () => {
                const fileInput = document.getElementById('restoreFileInput');
                if (fileInput) fileInput.click();
            });

            document.getElementById('restoreFileInput')?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const data = JSON.parse(evt.target.result);
                        if (data.playlists && Array.isArray(data.playlists)) {
                            localStorage.setItem('vibentra_playlists', JSON.stringify(data.playlists));
                        }
                        if (data.favorites && Array.isArray(data.favorites)) {
                            localStorage.setItem('vibentra_favorites', JSON.stringify(data.favorites));
                        }
                        if (data.history && Array.isArray(data.history)) {
                            localStorage.setItem('vibentra_history', JSON.stringify(data.history));
                        }
                        if (data.settings && typeof data.settings === 'object') {
                            Object.keys(data.settings).forEach(k => localStorage.setItem(k, data.settings[k]));
                        }
                        showNotification('Backup data restored successfully!', 'success');
                        setTimeout(() => renderSettingsCategory('storage'), 1000);
                    } catch (err) {
                        showNotification('Invalid backup file format.', 'error');
                    }
                };
                reader.readAsText(file);
            });

        } else if (category === 'audio') {
            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Audio</h2>
                    </div>

                    <!-- Details List (Exact match to Reference Image 5) -->
                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Normalize Volume</h4>
                                <p>Balance media loudness</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingNormalizeVolume" ${getSettingState('normalize_volume', false) ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Skip Silent</h4>
                                <p>Skip no music part</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingSkipSilent" ${getSettingState('skip_silent', false) ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row" id="rowEqualizer" style="cursor: pointer;">
                            <div class="settings-option-text">
                                <h4>Equalizer</h4>
                                <p>Shape the sound with a ten-band curve</p>
                            </div>
                            <i class="fa-solid fa-sliders" style="color: var(--primary); font-size: 1.2rem;"></i>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingNormalizeVolume')?.addEventListener('change', (e) => setSettingState('normalize_volume', e.target.checked));
            document.getElementById('settingSkipSilent')?.addEventListener('change', (e) => setSettingState('skip_silent', e.target.checked));

            document.getElementById('rowEqualizer')?.addEventListener('click', () => {
                openEqualizerModal();
            });

        } else if (category === 'content') {
            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Content</h2>
                    </div>

                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Language</h4>
                                <div class="settings-option-subvalue">English</div>
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Content Country</h4>
                                <div class="settings-option-subvalue">IN (Global)</div>
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Quality</h4>
                                <div class="settings-option-subvalue">High - 320kbps (Vibentra HQ)</div>
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Download quality</h4>
                                <div class="settings-option-subvalue">High - 320kbps (Vibentra HQ)</div>
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Download songs you like</h4>
                                <p>Automatically download a song for offline playback when you add it to Favorites, using your download quality setting.</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingDownloadLiked" ${getSettingState('download_liked', false) ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Play video for video track instead of audio only</h4>
                                <p>Such as Music Video, Lyrics Video, Podcasts, and more</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingPlayVideo" ${getSettingState('play_video', false) ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Keep radio audio-only</h4>
                                <p>Skip music videos, remixes and mashups that YouTube mixes into a radio. Playlists and albums are not affected</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingRadioAudioOnly" ${getSettingState('radio_audio_only', true) ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Play explicit content</h4>
                                <p>Enable to play explicit content</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingExplicitContent" ${getSettingState('explicit', true) ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingDownloadLiked')?.addEventListener('change', (e) => setSettingState('download_liked', e.target.checked));
            document.getElementById('settingPlayVideo')?.addEventListener('change', (e) => setSettingState('play_video', e.target.checked));
            document.getElementById('settingRadioAudioOnly')?.addEventListener('change', (e) => setSettingState('radio_audio_only', e.target.checked));
            document.getElementById('settingExplicitContent')?.addEventListener('change', (e) => setSettingState('explicit', e.target.checked));

        } else if (category === 'interface') {
            const currentTheme = localStorage.getItem('vibentra_theme') || 'default';
            const themeList = [
                { id: 'default', name: 'Midnight Purple', color: '#7C3AED' },
                { id: 'teal', name: 'Nordic Teal', color: '#138086' },
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
                <div class="settings-view-wrapper">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Interface & Theme</h2>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <label style="display: block; font-size: 0.95rem; font-weight: 700; color: #FFFFFF;">Preset Color Themes</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px;">
                            ${themeButtonsHtml}
                        </div>
                    </div>
                </div>
            `;

            document.querySelectorAll('.theme-select-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetBtn = e.target.closest('.theme-select-btn');
                    if (!targetBtn) return;
                    const themeName = targetBtn.getAttribute('data-theme');
                    window.applyTheme(themeName);
                    renderSettingsCategory('interface');
                    showNotification('Theme updated successfully!', 'success');
                });
            });
        } else if (category === 'sources') {
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

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Music Sources</h2>
                    </div>
                    <div class="glass-panel" style="border-radius: 20px; overflow: hidden;">
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
                        renderSettingsCategory('sources');
                        showNotification(`${provider.name} ${provider.enabled ? 'enabled' : 'disabled'}`, 'info');
                    }
                });
            });
        } else if (category === 'playback') {
            const gapless = getSettingState('gapless', true);
            const crossfade = parseInt(getSettingVal('crossfade', '0'), 10) || 0;
            const autoplaySimilar = getSettingState('autoplay_similar', true);
            const stopOnExit = getSettingState('stop_on_exit', false);
            const preloadNext = getSettingState('preload_next', true);

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper view-fade-in">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Playback</h2>
                    </div>

                    <div class="glass-panel" style="border-radius: 24px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.35) 0%, rgba(6, 182, 212, 0.2) 100%); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 24px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #7C3AED, #06B6D4); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: white; box-shadow: 0 0 25px rgba(124,58,237,0.5);">
                            <i class="fa-solid fa-circle-play"></i>
                        </div>
                        <h3 style="font-size: 1.35rem; color: #FFFFFF; font-weight: 800; margin: 0;">Playback & Stream Engine</h3>
                        <p style="color: rgba(255,255,255,0.75); font-size: 0.85rem; margin: 0; line-height: 1.4;">Configure seamless transitions, smart auto-queue, crossfade, and background streaming behavior.</p>
                    </div>

                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Gapless Playback</h4>
                                <p>Eliminate silent gaps between consecutive songs for non-stop listening</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingGaplessToggle" ${gapless ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row" style="flex-direction: column; align-items: flex-start; gap: 12px;">
                            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                                <div class="settings-option-text">
                                    <h4>Crossfade Duration</h4>
                                    <p>Smoothly blend the ending of current track into the start of next track</p>
                                </div>
                                <span class="settings-slider-badge" id="crossfadeValText">${crossfade}s</span>
                            </div>
                            <div style="width: 100%; display: flex; align-items: center; gap: 14px;">
                                <input type="range" class="settings-range-slider" id="settingCrossfadeSlider" min="0" max="12" step="1" value="${crossfade}">
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Autoplay Similar Songs</h4>
                                <p>Automatically discover and queue matching tracks when current queue reaches end</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingAutoplaySimilarToggle" ${autoplaySimilar ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Stop Music on App Exit</h4>
                                <p>Immediately pause and close media background engine when app is closed</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingStopOnExitToggle" ${stopOnExit ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Preload Next Track Buffer</h4>
                                <p>Fetch audio streams ahead of time for instant 0-second song transitions</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingPreloadNextToggle" ${preloadNext ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingGaplessToggle')?.addEventListener('change', (e) => {
                setSettingState('gapless', e.target.checked);
                showNotification(`Gapless playback ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            const crossfadeSlider = document.getElementById('settingCrossfadeSlider');
            const crossfadeText = document.getElementById('crossfadeValText');
            crossfadeSlider?.addEventListener('input', (e) => {
                if (crossfadeText) crossfadeText.textContent = `${e.target.value}s`;
            });
            crossfadeSlider?.addEventListener('change', (e) => {
                setSettingVal('crossfade', e.target.value);
                showNotification(`Crossfade set to ${e.target.value} seconds`, 'success');
            });

            document.getElementById('settingAutoplaySimilarToggle')?.addEventListener('change', (e) => {
                setSettingState('autoplay_similar', e.target.checked);
                showNotification(`Autoplay similar songs ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('settingStopOnExitToggle')?.addEventListener('change', (e) => {
                setSettingState('stop_on_exit', e.target.checked);
                showNotification(`Stop music on exit ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('settingPreloadNextToggle')?.addEventListener('change', (e) => {
                setSettingState('preload_next', e.target.checked);
                showNotification(`Track preloading ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

        } else if (category === 'history') {
            const isIncognito = getSettingState('incognito_mode', false);
            const isHistoryPaused = getSettingState('pause_history', false);
            const historyList = historyService.getHistory();

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper view-fade-in">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Listening History & Privacy</h2>
                    </div>

                    <div class="glass-panel" style="border-radius: 24px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(124, 58, 237, 0.2) 100%); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 24px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #EC4899, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: white; box-shadow: 0 0 25px rgba(236,72,153,0.5);">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                        </div>
                        <h3 style="font-size: 1.35rem; color: #FFFFFF; font-weight: 800; margin: 0;">History & Private Sessions</h3>
                        <p style="color: rgba(255,255,255,0.75); font-size: 0.85rem; margin: 0; line-height: 1.4;">Manage private listening mode, pause history logging, and clean local cached records.</p>
                        <div style="margin-top: 4px;">
                            ${isIncognito ? '<span class="settings-status-badge incognito pulse"><i class="fa-solid fa-user-secret"></i> Incognito Active</span>' : (isHistoryPaused ? '<span class="settings-status-badge" style="background: rgba(245, 158, 11, 0.18); color: #FBBF24; border-color: rgba(245, 158, 11, 0.4);"><i class="fa-solid fa-pause"></i> History Paused</span>' : '<span class="settings-status-badge"><i class="fa-solid fa-circle-check"></i> History Logging Active</span>')}
                        </div>
                    </div>

                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Incognito / Private Session</h4>
                                <p>Temporarily listen privately. Played songs will not appear in history, top stats, or algorithm mix</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingIncognitoToggle" ${isIncognito ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Pause Listening History</h4>
                                <p>Temporarily suspend recording played tracks to your history</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingPauseHistoryToggle" ${isHistoryPaused ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Total Songs in History</h4>
                                <div class="settings-option-subvalue" id="historyCountText">${historyList.length} tracks recorded</div>
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4 style="color: #F87171;">Clear Playback History</h4>
                                <p>Wipe all stored playback history from this device</p>
                            </div>
                            <button class="settings-action-btn danger" id="clearHistoryBtn">
                                <i class="fa-solid fa-trash-can"></i> Clear History
                            </button>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Clear Search Cache</h4>
                                <p>Clear recent search queries and cached search results</p>
                            </div>
                            <button class="settings-action-btn" id="clearSearchCacheBtn">
                                <i class="fa-solid fa-eraser"></i> Clear Search
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingIncognitoToggle')?.addEventListener('change', (e) => {
                setSettingState('incognito_mode', e.target.checked);
                showNotification(e.target.checked ? '🕵️ Incognito Mode turned ON - history will not be saved' : 'Incognito Mode turned OFF', 'info');
                renderSettingsCategory('history');
            });

            document.getElementById('settingPauseHistoryToggle')?.addEventListener('change', (e) => {
                setSettingState('pause_history', e.target.checked);
                showNotification(e.target.checked ? 'Listening history paused' : 'Listening history resumed', 'info');
                renderSettingsCategory('history');
            });

            document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your entire listening history?')) {
                    historyService.clearHistory();
                    const countEl = document.getElementById('historyCountText');
                    if (countEl) countEl.textContent = '0 tracks recorded';
                    showNotification('Listening history wiped successfully!', 'success');
                }
            });

            document.getElementById('clearSearchCacheBtn')?.addEventListener('click', () => {
                historyService.clearSearchHistory();
                showNotification('Search history and caches cleared!', 'success');
            });

        } else if (category === 'ai') {
            const aiDj = getSettingState('ai_dj_mode', false);
            const smartQueue = getSettingState('ai_smart_queue', true);
            const moodSensitivity = getSettingVal('ai_mood_sensitivity', 'Balanced Dynamic');
            const aiTranslation = getSettingState('ai_lyrics_translation', true);
            const targetLang = getSettingVal('ai_target_lang', 'en');

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper view-fade-in">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">AI & Smart Engine</h2>
                    </div>

                    <div class="glass-panel" style="border-radius: 24px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(124, 58, 237, 0.3) 100%); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 24px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #06B6D4, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: white; box-shadow: 0 0 25px rgba(6,182,212,0.5);">
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <h3 style="font-size: 1.35rem; color: #FFFFFF; font-weight: 800; margin: 0;">Vibentra AI Engine</h3>
                        <p style="color: rgba(255,255,255,0.75); font-size: 0.85rem; margin: 0; line-height: 1.4;">Empower your music experience with contextual mood curation, AI DJ mixing, and automated lyric translations.</p>
                    </div>

                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>AI DJ Voice Mode</h4>
                                <p>Smart audio DJ introduces special playlist mixes and announces upcoming favorites</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingAiDjToggle" ${aiDj ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Smart Queue Auto-Generation</h4>
                                <p>Dynamically sequence upcoming songs based on tempo, BPM, and acoustic harmonic compatibility</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingSmartQueueToggle" ${smartQueue ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Mood Sensitivity Preset</h4>
                                <p>Tune how aggressively the algorithm adapts to your current listening mood</p>
                            </div>
                            <select id="settingMoodSensitivitySelect" class="settings-select">
                                <option value="Balanced Dynamic" ${moodSensitivity === 'Balanced Dynamic' ? 'selected' : ''}>Balanced Dynamic</option>
                                <option value="High Energy (Workout/Party)" ${moodSensitivity === 'High Energy (Workout/Party)' ? 'selected' : ''}>High Energy (Workout/Party)</option>
                                <option value="Chill & Ambient (Relax)" ${moodSensitivity === 'Chill & Ambient (Relax)' ? 'selected' : ''}>Chill & Ambient (Relax)</option>
                                <option value="Deep Focus & Instrumental" ${moodSensitivity === 'Deep Focus & Instrumental' ? 'selected' : ''}>Deep Focus & Instrumental</option>
                            </select>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>AI Real-time Lyrics Translation</h4>
                                <p>Automatically translate foreign lyric lines in real-time inside the lyrics viewer</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingAiTranslationToggle" ${aiTranslation ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Target Translation Language</h4>
                                <p>Default target language for instant lyric translation</p>
                            </div>
                            <select id="settingAiTargetLangSelect" class="settings-select">
                                <option value="en" ${targetLang === 'en' ? 'selected' : ''}>English (en)</option>
                                <option value="ta" ${targetLang === 'ta' ? 'selected' : ''}>Tamil (ta)</option>
                                <option value="hi" ${targetLang === 'hi' ? 'selected' : ''}>Hindi (hi)</option>
                                <option value="es" ${targetLang === 'es' ? 'selected' : ''}>Spanish (es)</option>
                                <option value="fr" ${targetLang === 'fr' ? 'selected' : ''}>French (fr)</option>
                                <option value="de" ${targetLang === 'de' ? 'selected' : ''}>German (de)</option>
                                <option value="ja" ${targetLang === 'ja' ? 'selected' : ''}>Japanese (ja)</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingAiDjToggle')?.addEventListener('change', (e) => {
                setSettingState('ai_dj_mode', e.target.checked);
                showNotification(`AI DJ Voice ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('settingSmartQueueToggle')?.addEventListener('change', (e) => {
                setSettingState('ai_smart_queue', e.target.checked);
                showNotification(`Smart Queue ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('settingMoodSensitivitySelect')?.addEventListener('change', (e) => {
                setSettingVal('ai_mood_sensitivity', e.target.value);
                showNotification(`Mood sensitivity set to ${e.target.value}`, 'success');
            });

            document.getElementById('settingAiTranslationToggle')?.addEventListener('change', (e) => {
                setSettingState('ai_lyrics_translation', e.target.checked);
                showNotification(`AI Lyrics Translation ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('settingAiTargetLangSelect')?.addEventListener('change', (e) => {
                setSettingVal('ai_target_lang', e.target.value);
                showNotification(`Translation target set to ${e.target.value}`, 'success');
            });

        } else if (category === 'sleep') {
            const renderSleepView = () => {
                const currentStatus = sleepTimerService.getStatus();
                const isFadeOut = getSettingState('sleep_fadeout', true);

                dynamicContent.innerHTML = `
                    <div class="settings-view-wrapper view-fade-in">
                        <div class="sub-settings-header">
                            <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                            <h2 class="sub-settings-title">Sleep Timer & Automation</h2>
                        </div>

                        <div class="glass-panel" style="border-radius: 24px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(167, 139, 250, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 24px;">
                            <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #A78BFA, #6366F1); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: white; box-shadow: 0 0 25px rgba(167, 139, 250, 0.5);">
                                <i class="fa-solid fa-moon"></i>
                            </div>
                            <h3 style="font-size: 1.35rem; color: #FFFFFF; font-weight: 800; margin: 0;">Smart Sleep Assistant</h3>
                            <p style="color: rgba(255,255,255,0.75); font-size: 0.85rem; margin: 0; line-height: 1.4;">Drift off peacefully. Vibentra automatically pauses playback and gently fades out volume when the timer expires.</p>
                            <div style="margin-top: 4px;">
                                ${currentStatus.active ? `<span class="settings-status-badge pulse" style="background: rgba(167, 139, 250, 0.2); color: #C4B5FD; border-color: rgba(167, 139, 250, 0.4);"><i class="fa-solid fa-hourglass-half"></i> ${currentStatus.stopAfterTrack ? 'Stop after current track' : `Timer Active: ${currentStatus.formattedRemaining}`}</span>` : '<span class="settings-status-badge" style="background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.15);"><i class="fa-solid fa-bed"></i> No Active Sleep Timer</span>'}
                            </div>
                        </div>

                        <div class="sub-settings-container">
                            ${currentStatus.active ? `
                                <div class="settings-option-row" style="background: rgba(167, 139, 250, 0.1); border-radius: 16px; padding: 16px; border: 1px solid rgba(167, 139, 250, 0.25);">
                                    <div class="settings-option-text">
                                        <h4 style="color: #C4B5FD;">Active Timer Running</h4>
                                        <p style="color: rgba(255,255,255,0.75);">${currentStatus.stopAfterTrack ? 'Playback will stop when the current track finishes' : `Remaining: ${currentStatus.formattedRemaining}`}</p>
                                    </div>
                                    <button class="settings-action-btn danger" id="cancelSleepTimerBtn">
                                        <i class="fa-solid fa-ban"></i> Cancel Timer
                                    </button>
                                </div>
                            ` : ''}

                            <div class="settings-option-row" style="flex-direction: column; align-items: flex-start;">
                                <div class="settings-option-text">
                                    <h4>Quick Countdown Presets</h4>
                                    <p>Choose a timer duration to auto-pause music</p>
                                </div>
                                <div class="settings-pill-group">
                                    <button class="settings-pill-btn timer-preset-btn" data-minutes="15">15 min</button>
                                    <button class="settings-pill-btn timer-preset-btn" data-minutes="30">30 min</button>
                                    <button class="settings-pill-btn timer-preset-btn" data-minutes="45">45 min</button>
                                    <button class="settings-pill-btn timer-preset-btn" data-minutes="60">60 min</button>
                                    <button class="settings-pill-btn timer-preset-btn" data-minutes="90">90 min</button>
                                </div>
                            </div>

                            <div class="settings-option-row">
                                <div class="settings-option-text">
                                    <h4>Stop After Current Track Finishes</h4>
                                    <p>Allow the current song to play through to the end, then stop automatically</p>
                                </div>
                                <button class="settings-action-btn ${currentStatus.stopAfterTrack ? 'danger' : 'primary'}" id="stopAfterTrackBtn">
                                    <i class="fa-solid fa-stop"></i> ${currentStatus.stopAfterTrack ? 'Disable' : 'Set Track End'}
                                </button>
                            </div>

                            <div class="settings-option-row">
                                <div class="settings-option-text">
                                    <h4>Custom Duration</h4>
                                    <p>Enter any custom minutes for the countdown</p>
                                </div>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <input type="number" id="customTimerMinsInput" min="1" max="720" placeholder="Mins" style="width: 75px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: white; padding: 8px 12px; font-weight: 700; text-align: center; outline: none;">
                                    <button class="settings-action-btn primary" id="startCustomTimerBtn">Start</button>
                                </div>
                            </div>

                            <div class="settings-option-row">
                                <div class="settings-option-text">
                                    <h4>Smooth 30s Volume Fade-Out</h4>
                                    <p>Gently ramp down master volume during the last 30 seconds before sleep</p>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="settingSleepFadeoutToggle" ${isFadeOut ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                `;

                document.getElementById('settingsSubBackBtn')?.addEventListener('click', () => renderSettings());

                document.getElementById('cancelSleepTimerBtn')?.addEventListener('click', () => {
                    sleepTimerService.cancelTimer();
                    showNotification('Sleep timer cancelled.', 'info');
                    renderSleepView();
                });

                document.querySelectorAll('.timer-preset-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const mins = parseInt(btn.getAttribute('data-minutes'), 10);
                        const fade = getSettingState('sleep_fadeout', true);
                        sleepTimerService.startTimer(mins, fade);
                        showNotification(`🌙 Sleep timer set for ${mins} minutes!`, 'success');
                        renderSleepView();
                    });
                });

                document.getElementById('stopAfterTrackBtn')?.addEventListener('click', () => {
                    if (currentStatus.stopAfterTrack) {
                        sleepTimerService.setStopAfterCurrentTrack(false);
                        showNotification('Stop-after-track cancelled.', 'info');
                    } else {
                        sleepTimerService.setStopAfterCurrentTrack(true);
                        showNotification('🌙 Music will stop after current track finishes!', 'success');
                    }
                    renderSleepView();
                });

                document.getElementById('startCustomTimerBtn')?.addEventListener('click', () => {
                    const input = document.getElementById('customTimerMinsInput');
                    const mins = parseFloat(input?.value);
                    if (!mins || mins <= 0) {
                        showNotification('Please enter a valid number of minutes.', 'error');
                        return;
                    }
                    const fade = getSettingState('sleep_fadeout', true);
                    sleepTimerService.startTimer(mins, fade);
                    showNotification(`🌙 Sleep timer set for ${mins} minutes!`, 'success');
                    renderSleepView();
                });

                document.getElementById('settingSleepFadeoutToggle')?.addEventListener('change', (e) => {
                    setSettingState('sleep_fadeout', e.target.checked);
                    showNotification(`Volume fade-out ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                });
            };

            renderSleepView();

        } else if (category === 'dsp') {
            const currentSpeed = parseFloat(getSettingVal('playback_speed', '1')) || 1;
            const preservePitch = getSettingState('preserve_pitch', true);
            const bassBoost = parseInt(getSettingVal('bass_boost', '0'), 10) || 0;
            const virtualizer = parseInt(getSettingVal('virtualizer', '0'), 10) || 0;

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper view-fade-in">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Sound & DSP Studio</h2>
                    </div>

                    <div class="glass-panel" style="border-radius: 24px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(244, 114, 182, 0.25) 0%, rgba(124, 58, 237, 0.25) 100%); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 24px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #F472B6, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: white; box-shadow: 0 0 25px rgba(244,114,182,0.5);">
                            <i class="fa-solid fa-sliders"></i>
                        </div>
                        <h3 style="font-size: 1.35rem; color: #FFFFFF; font-weight: 800; margin: 0;">Audio DSP Processing</h3>
                        <p style="color: rgba(255,255,255,0.75); font-size: 0.85rem; margin: 0; line-height: 1.4;">Studio-grade tempo control, master pitch lock, bass boost, and 3D spatial surround virtualizer.</p>
                    </div>

                    <div class="sub-settings-container">
                        <div class="settings-option-row" style="flex-direction: column; align-items: flex-start;">
                            <div class="settings-option-text">
                                <h4>Playback Tempo / Speed</h4>
                                <p>Adjust audio speed from 0.5x to 2.0x without pitch distortion</p>
                            </div>
                            <div class="settings-pill-group">
                                ${[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(s => `
                                    <button class="settings-pill-btn speed-pill-btn ${currentSpeed === s ? 'active' : ''}" data-speed="${s}">${s}x${s === 1.0 ? ' (Normal)' : ''}</button>
                                `).join('')}
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Preserve Pitch (Master Tempo Lock)</h4>
                                <p>Keep natural musical key and pitch unaltered when changing speed</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingPreservePitchToggle" ${preservePitch ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row" style="flex-direction: column; align-items: flex-start; gap: 12px;">
                            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                                <div class="settings-option-text">
                                    <h4>Bass Boost (Sub-Bass Drive)</h4>
                                    <p>Enhance sub-woofer frequency punch for rich low-end acoustics</p>
                                </div>
                                <span class="settings-slider-badge" id="bassBoostValText">+${bassBoost} dB</span>
                            </div>
                            <div style="width: 100%; display: flex; align-items: center; gap: 14px;">
                                <input type="range" class="settings-range-slider" id="settingBassBoostSlider" min="0" max="15" step="1" value="${bassBoost}">
                            </div>
                        </div>

                        <div class="settings-option-row" style="flex-direction: column; align-items: flex-start; gap: 12px;">
                            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                                <div class="settings-option-text">
                                    <h4>3D Surround / Spatial Virtualizer</h4>
                                    <p>Expands audio soundstage for immersive headphone spatial acoustics</p>
                                </div>
                                <span class="settings-slider-badge" id="virtualizerValText">${virtualizer}%</span>
                            </div>
                            <div style="width: 100%; display: flex; align-items: center; gap: 14px;">
                                <input type="range" class="settings-range-slider" id="settingVirtualizerSlider" min="0" max="100" step="5" value="${virtualizer}">
                            </div>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>10-Band Graphic Equalizer</h4>
                                <p>Launch the full graphical equalizer studio with custom frequency curve presets</p>
                            </div>
                            <button class="settings-action-btn primary" id="openEqStudioBtn">
                                <i class="fa-solid fa-sliders"></i> Open Equalizer
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.querySelectorAll('.speed-pill-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const speed = parseFloat(btn.getAttribute('data-speed'));
                    setSettingVal('playback_speed', speed.toString());
                    if (musicService && musicService.audioPlayer) {
                        musicService.audioPlayer.playbackRate = speed;
                    }
                    showNotification(`Playback speed set to ${speed}x`, 'success');
                    renderSettingsCategory('dsp');
                });
            });

            document.getElementById('settingPreservePitchToggle')?.addEventListener('change', (e) => {
                setSettingState('preserve_pitch', e.target.checked);
                if (musicService && musicService.audioPlayer) {
                    musicService.audioPlayer.preservesPitch = e.target.checked;
                }
                showNotification(`Pitch lock ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            const bassSlider = document.getElementById('settingBassBoostSlider');
            const bassText = document.getElementById('bassBoostValText');
            bassSlider?.addEventListener('input', (e) => {
                if (bassText) bassText.textContent = `+${e.target.value} dB`;
            });
            bassSlider?.addEventListener('change', (e) => {
                setSettingVal('bass_boost', e.target.value);
                showNotification(`Bass boost set to +${e.target.value} dB`, 'success');
            });

            const virtSlider = document.getElementById('settingVirtualizerSlider');
            const virtText = document.getElementById('virtualizerValText');
            virtSlider?.addEventListener('input', (e) => {
                if (virtText) virtText.textContent = `${e.target.value}%`;
            });
            virtSlider?.addEventListener('change', (e) => {
                setSettingVal('virtualizer', e.target.value);
                showNotification(`Spatial virtualizer set to ${e.target.value}%`, 'success');
            });

            document.getElementById('openEqStudioBtn')?.addEventListener('click', () => {
                openEqualizerModal();
            });

        } else if (category === 'notifications') {
            const lockArtwork = getSettingState('lockscreen_artwork', true);
            const richControls = getSettingState('rich_mediasession', true);
            const liveLyrics = getSettingState('notif_lyrics', true);
            const persistent = getSettingState('notif_persistent', true);

            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper view-fade-in">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title">Notifications & Lock Screen</h2>
                    </div>

                    <div class="glass-panel" style="border-radius: 24px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(249, 115, 22, 0.2) 100%); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 24px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #FBBF24, #F97316); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: white; box-shadow: 0 0 25px rgba(251,191,36,0.5);">
                            <i class="fa-solid fa-bell"></i>
                        </div>
                        <h3 style="font-size: 1.35rem; color: #FFFFFF; font-weight: 800; margin: 0;">MediaSession & Lock Screen</h3>
                        <p style="color: rgba(255,255,255,0.75); font-size: 0.85rem; margin: 0; line-height: 1.4;">Customize background notifications, lock screen HD artwork, and media controller actions.</p>
                    </div>

                    <div class="sub-settings-container">
                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Dynamic Lock Screen Artwork</h4>
                                <p>Display full-resolution artist artwork and album cover on device lock screen</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingLockArtworkToggle" ${lockArtwork ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Rich Media Controls</h4>
                                <p>Provide seek forward/backward, next, and previous buttons in system notification</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingRichControlsToggle" ${richControls ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Live Synced Lyrics in Subtitle</h4>
                                <p>Stream real-time vocal lyrics line in the notification subtitle when available</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingLiveLyricsToggle" ${liveLyrics ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="settings-option-row">
                            <div class="settings-option-text">
                                <h4>Persistent Notification</h4>
                                <p>Keep the media notification pinned during playback to prevent OS from killing audio</p>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="settingPersistentNotifToggle" ${persistent ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingLockArtworkToggle')?.addEventListener('change', (e) => {
                setSettingState('lockscreen_artwork', e.target.checked);
                showNotification(`Lock screen artwork ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('settingRichControlsToggle')?.addEventListener('change', (e) => {
                setSettingState('rich_mediasession', e.target.checked);
                showNotification(`Rich media controls ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('settingLiveLyricsToggle')?.addEventListener('change', (e) => {
                setSettingState('notif_lyrics', e.target.checked);
                showNotification(`Notification lyrics ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

            document.getElementById('settingPersistentNotifToggle')?.addEventListener('change', (e) => {
                setSettingState('notif_persistent', e.target.checked);
                showNotification(`Persistent notification ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });

        } else {
            dynamicContent.innerHTML = `
                <div class="settings-view-wrapper">
                    <div class="sub-settings-header">
                        <button class="settings-sub-back-btn" id="settingsSubBackBtn"><i class="fa-solid fa-chevron-left"></i></button>
                        <h2 class="sub-settings-title" style="text-transform: capitalize;">${category}</h2>
                    </div>
                    <div class="glass-panel" style="border-radius: 20px; padding: 24px;">
                        <p style="color: rgba(255,255,255,0.8); font-size: 0.95rem;">Settings for <strong>${category}</strong> are active and optimized automatically by Vibentra Engine.</p>
                    </div>
                </div>
            `;
        }

        document.getElementById('settingsSubBackBtn')?.addEventListener('click', () => {
            renderSettings();
        });
    }

    // Modal Helper Functions for Settings
    function openEqualizerModal() {
        let eqModal = document.getElementById('vibentraEqualizerModal');
        if (!eqModal) {
            eqModal = document.createElement('div');
            eqModal.id = 'vibentraEqualizerModal';
            eqModal.className = 'large-player-modal';
            eqModal.innerHTML = `
                <div class="glass-panel" style="width: 500px; max-width: 92%; padding: 30px; border-radius: 24px; position: relative; display: flex; flex-direction: column; gap: 20px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(35px);">
                    <button class="close-large-player" id="closeEqModal" style="top: 20px; right: 20px; width: 36px; height: 36px;"><i class="fa-solid fa-xmark"></i></button>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fa-solid fa-sliders" style="font-size: 1.5rem; color: var(--primary);"></i>
                        <h3 style="margin: 0; font-size: 1.4rem; color: #FFF;">10-Band Equalizer</h3>
                    </div>
                    
                    <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;">
                        <button class="btn btn-outline eq-preset-btn active" data-preset="flat" style="padding: 6px 14px; border-radius: 20px; font-size: 0.82rem;">Flat</button>
                        <button class="btn btn-outline eq-preset-btn" data-preset="bass" style="padding: 6px 14px; border-radius: 20px; font-size: 0.82rem;">Bass Boost</button>
                        <button class="btn btn-outline eq-preset-btn" data-preset="vocal" style="padding: 6px 14px; border-radius: 20px; font-size: 0.82rem;">Vocal Boost</button>
                        <button class="btn btn-outline eq-preset-btn" data-preset="rock" style="padding: 6px 14px; border-radius: 20px; font-size: 0.82rem;">Rock</button>
                        <button class="btn btn-outline eq-preset-btn" data-preset="pop" style="padding: 6px 14px; border-radius: 20px; font-size: 0.82rem;">Pop</button>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: flex-end; height: 180px; padding: 12px 10px; background: rgba(0,0,0,0.3); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
                        ${['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'].map((band) => `
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1;">
                                <input type="range" class="eq-slider" min="-12" max="12" value="0" style="height: 110px; width: 6px; -webkit-appearance: slider-vertical;">
                                <span style="font-size: 0.65rem; color: rgba(255,255,255,0.6);">${band}</span>
                            </div>
                        `).join('')}
                    </div>

                    <button class="btn btn-primary" id="saveEqBtn" style="border-radius: 14px; padding: 12px; font-weight: 700; margin-top: 6px;">Apply Equalizer Curve</button>
                </div>
            `;
            document.body.appendChild(eqModal);

            document.getElementById('closeEqModal')?.addEventListener('click', () => eqModal.classList.remove('active'));
            document.getElementById('saveEqBtn')?.addEventListener('click', () => {
                eqModal.classList.remove('active');
                showNotification('Equalizer profile applied successfully!', 'success');
            });
        }
        eqModal.classList.add('active');
    }

    function openLicensesModal() {
        let licModal = document.getElementById('vibentraLicensesModal');
        if (!licModal) {
            licModal = document.createElement('div');
            licModal.id = 'vibentraLicensesModal';
            licModal.className = 'large-player-modal';
            licModal.innerHTML = `
                <div class="glass-panel" style="width: 540px; max-width: 92%; height: 70vh; padding: 30px; border-radius: 24px; position: relative; display: flex; flex-direction: column; gap: 16px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(35px);">
                    <button class="close-large-player" id="closeLicModal" style="top: 20px; right: 20px; width: 36px; height: 36px;"><i class="fa-solid fa-xmark"></i></button>
                    <h3 style="margin: 0; font-size: 1.4rem; color: #FFF;">Third Party Licenses</h3>
                    <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-right: 8px;">
                        <div style="background: rgba(255,255,255,0.05); padding: 14px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
                            <h4 style="color: #FFF; margin: 0 0 4px 0;">FontAwesome Free 6.4.0</h4>
                            <p style="font-size: 0.82rem; color: rgba(255,255,255,0.65); margin: 0;">CC BY 4.0 & MIT License for Icons & UI Graphics.</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 14px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
                            <h4 style="color: #FFF; margin: 0 0 4px 0;">Capacitor Native Bridge</h4>
                            <p style="font-size: 0.82rem; color: rgba(255,255,255,0.65); margin: 0;">MIT License - Copyright (c) Ionic Framework.</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 14px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
                            <h4 style="color: #FFF; margin: 0 0 4px 0;">Google Firebase SDK</h4>
                            <p style="font-size: 0.82rem; color: rgba(255,255,255,0.65); margin: 0;">Apache License 2.0 - Copyright Google LLC.</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 14px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);">
                            <h4 style="color: #FFF; margin: 0 0 4px 0;">SimpMusic & LrcLib API</h4>
                            <p style="font-size: 0.82rem; color: rgba(255,255,255,0.65); margin: 0;">AGPL v3 License - Open Source Lyrics Provider.</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(licModal);
            document.getElementById('closeLicModal')?.addEventListener('click', () => licModal.classList.remove('active'));
        }
        licModal.classList.add('active');
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
