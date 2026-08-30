/**
 * Vibentra Portfolio Interactive Controller (v1.9.0)
 * Crafted by SRIVATSAN R
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Drawer Navigation Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');

    const toggleDrawer = (open) => {
        if (!mobileDrawer) return;
        if (open) {
            mobileDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
        } else {
            mobileDrawer.classList.remove('open');
            document.body.style.overflow = '';
        }
    };

    mobileMenuBtn?.addEventListener('click', () => toggleDrawer(true));
    drawerCloseBtn?.addEventListener('click', () => toggleDrawer(false));

    // Close drawer when clicking any link
    document.querySelectorAll('.drawer-link, .drawer-actions a').forEach(link => {
        link.addEventListener('click', () => toggleDrawer(false));
    });

    // 2. Navbar Scroll Glass Elevation
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.style.background = 'rgba(9, 13, 22, 0.92)';
            navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6)';
        } else {
            navbar.style.background = 'rgba(9, 13, 22, 0.75)';
            navbar.style.boxShadow = 'none';
        }
    });

    // 3. Interactive Hero Player Mockup Simulation
    const mockPlayBtn = document.getElementById('mockPlayBtn');
    const mockPlayIcon = document.getElementById('mockPlayIcon');
    const mockAlbumArt = document.getElementById('mockupAlbumArt');
    const mockEqualizer = document.getElementById('mockupEqualizer');
    const mockProgressFill = document.getElementById('mockupProgressFill');
    const mockCurrentTime = document.getElementById('mockupCurrentTime');
    const mockTrackTitle = document.getElementById('mockupTrackTitle');
    const mockTrackArtist = document.getElementById('mockupTrackArtist');
    const mockPrevBtn = document.getElementById('mockPrevBtn');
    const mockNextBtn = document.getElementById('mockNextBtn');
    const mockShuffleBtn = document.getElementById('mockShuffleBtn');
    const mockRepeatBtn = document.getElementById('mockRepeatBtn');

    let isMockPlaying = true;
    let mockSeconds = 102; // 1:42
    const mockDuration = 210; // 3:30
    let mockInterval = null;

    const sampleTracks = [
        { title: 'Vibentra Theme Flow', artist: 'SRIVATSAN R • Sound Sanctuary Mix', duration: 210 },
        { title: 'Neon Pulse Waves', artist: 'Liquid DSP • 320kbps Master', duration: 195 },
        { title: 'Midnight Chill Lounge', artist: 'AI Smart Queue • Ambient Beats', duration: 240 },
        { title: 'Vinyl Grooves Heritage', artist: 'Retro Analog • Sound of India', duration: 180 }
    ];
    let currentTrackIdx = 0;

    const formatTime = (totalSec) => {
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const updateMockUI = () => {
        const tr = sampleTracks[currentTrackIdx];
        if (mockTrackTitle) mockTrackTitle.textContent = tr.title;
        if (mockTrackArtist) mockTrackArtist.textContent = tr.artist;
        if (mockCurrentTime) mockCurrentTime.textContent = formatTime(mockSeconds);
        const progressPct = (mockSeconds / tr.duration) * 100;
        if (mockProgressFill) mockProgressFill.style.width = `${progressPct}%`;
    };

    const startMockTimer = () => {
        if (mockInterval) clearInterval(mockInterval);
        mockInterval = setInterval(() => {
            if (isMockPlaying) {
                const tr = sampleTracks[currentTrackIdx];
                mockSeconds++;
                if (mockSeconds > tr.duration) {
                    mockSeconds = 0;
                    currentTrackIdx = (currentTrackIdx + 1) % sampleTracks.length;
                }
                updateMockUI();
            }
        }, 1000);
    };

    mockPlayBtn?.addEventListener('click', () => {
        isMockPlaying = !isMockPlaying;
        if (mockPlayIcon) {
            mockPlayIcon.className = isMockPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
        }
        if (isMockPlaying) {
            mockEqualizer?.classList.add('active');
            const img = mockAlbumArt?.querySelector('img');
            if (img) img.style.animationPlayState = 'running';
        } else {
            mockEqualizer?.classList.remove('active');
            const img = mockAlbumArt?.querySelector('img');
            if (img) img.style.animationPlayState = 'paused';
        }
    });

    mockNextBtn?.addEventListener('click', () => {
        currentTrackIdx = (currentTrackIdx + 1) % sampleTracks.length;
        mockSeconds = 0;
        updateMockUI();
    });

    mockPrevBtn?.addEventListener('click', () => {
        currentTrackIdx = (currentTrackIdx - 1 + sampleTracks.length) % sampleTracks.length;
        mockSeconds = 0;
        updateMockUI();
    });

    mockShuffleBtn?.addEventListener('click', () => {
        mockShuffleBtn.classList.toggle('active');
        mockShuffleBtn.style.color = mockShuffleBtn.classList.contains('active') ? '#38BDF8' : '';
    });

    mockRepeatBtn?.addEventListener('click', () => {
        mockRepeatBtn.classList.toggle('active');
        mockRepeatBtn.style.color = mockRepeatBtn.classList.contains('active') ? '#F472B6' : '';
    });

    startMockTimer();

    // 4. Interactive Turntable Demo
    const demoTurntableToggleBtn = document.getElementById('demoTurntableToggleBtn');
    const demoVinylDisc = document.getElementById('demoVinylDisc');
    const demoTonearm = document.getElementById('demoTonearm');
    let isTurntableSpinning = true;

    demoTurntableToggleBtn?.addEventListener('click', () => {
        isTurntableSpinning = !isTurntableSpinning;
        if (isTurntableSpinning) {
            demoVinylDisc?.classList.add('spinning');
            demoTonearm?.classList.add('active');
            demoTurntableToggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Turntable';
        } else {
            demoVinylDisc?.classList.remove('spinning');
            demoTonearm?.classList.remove('active');
            demoTurntableToggleBtn.innerHTML = '<i class="fa-solid fa-play"></i> Spin Turntable';
        }
    });

    // 5. Active Navbar Link Highlight on Scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 120;
            const sectionId = section.getAttribute('id');

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    console.log("🚀 Vibentra Portfolio v1.9.0 loaded successfully! Created by SRIVATSAN R.");
});
