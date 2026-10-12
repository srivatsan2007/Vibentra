/**
 * Vibentra Music Ecosystem - Master Interactive Controller & Visual FX Engine (v1.4.2)
 * Themed in Midnight Studio (#080A12), Electric Purple (#8B5CF6) & Cyan (#22D3EE)
 * Tagline: "Where Vibes Connect."
 * Crafted by SRIVATSAN R
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. Mobile Drawer Navigation Toggle
    // ==========================================================================
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const drawerOverlay = document.getElementById('drawerOverlay');

    const toggleDrawer = (open) => {
        if (!mobileDrawer) return;
        if (open) {
            mobileDrawer.classList.add('open');
            drawerOverlay?.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            mobileDrawer.classList.remove('open');
            drawerOverlay?.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    mobileMenuBtn?.addEventListener('click', () => toggleDrawer(true));
    drawerCloseBtn?.addEventListener('click', () => toggleDrawer(false));
    drawerOverlay?.addEventListener('click', () => toggleDrawer(false));

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileDrawer?.classList.contains('open')) {
            toggleDrawer(false);
        }
    });

    document.querySelectorAll('.drawer-link, .drawer-actions a').forEach(link => {
        link.addEventListener('click', () => toggleDrawer(false));
    });

    // ==========================================================================
    // 2. Top Scroll Progress Bar, Navbar Elevation & Back-to-Top Button
    // ==========================================================================
    const navbar = document.getElementById('navbar');
    const scrollProgressBar = document.getElementById('scrollProgressBar');
    const backToTopBtn = document.getElementById('backToTopBtn');
    const progressRingCircle = document.getElementById('progressRingCircle');
    const totalCircumference = 131.95; // 2 * Math.PI * 21

    const handleScrollProgress = () => {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;

        // Progress bar width
        if (scrollProgressBar) {
            scrollProgressBar.style.width = `${progress * 100}%`;
        }

        // Back to top circular ring & visibility
        if (backToTopBtn && progressRingCircle) {
            if (scrollY > 320) {
                backToTopBtn.classList.add('visible');
                const offset = totalCircumference - (progress * totalCircumference);
                progressRingCircle.style.strokeDashoffset = offset;
            } else {
                backToTopBtn.classList.remove('visible');
            }
        }

        // Navbar blur and elevation
        if (navbar) {
            if (scrollY > 40) {
                navbar.style.background = 'rgba(8, 10, 18, 0.94)';
                navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(139, 92, 246, 0.15)';
                navbar.style.borderColor = 'rgba(139, 92, 246, 0.2)';
            } else {
                navbar.style.background = 'rgba(8, 10, 18, 0.85)';
                navbar.style.boxShadow = 'none';
                navbar.style.borderColor = 'rgba(255, 255, 255, 0.10)';
            }
        }
    };

    window.addEventListener('scroll', handleScrollProgress, { passive: true });
    handleScrollProgress();

    backToTopBtn?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Smooth Anchor Scroll Navigation with Sticky Navbar Offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    const navbarHeight = navbar ? navbar.offsetHeight : 70;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight + 4;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ==========================================================================
    // 3. Interactive Ambient Cursor Spotlight Follower
    // ==========================================================================
    const cursorGlow = document.getElementById('cursorGlow');
    if (cursorGlow && window.matchMedia('(pointer: fine)').matches) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let currentX = mouseX;
        let currentY = mouseY;

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }, { passive: true });

        const animateCursor = () => {
            currentX += (mouseX - currentX) * 0.15;
            currentY += (mouseY - currentY) * 0.15;
            cursorGlow.style.left = `${currentX}px`;
            cursorGlow.style.top = `${currentY}px`;
            requestAnimationFrame(animateCursor);
        };
        requestAnimationFrame(animateCursor);
    }

    // ==========================================================================
    // 4. Ambient Liquid Soundwave Canvas Engine (Purple & Cyan Aurora)
    // ==========================================================================
    const canvas = document.getElementById('soundwaveCanvas');
    let isMockPlaying = true;

    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize, { passive: true });

        let step = 0;
        const waveConfig = [
            { color: 'rgba(139, 92, 246, 0.22)', speed: 0.015, freq: 0.003, amp: 45, yRatio: 0.52 },
            { color: 'rgba(34, 211, 238, 0.18)', speed: 0.022, freq: 0.004, amp: 35, yRatio: 0.54 },
            { color: 'rgba(167, 139, 250, 0.15)', speed: 0.012, freq: 0.0025, amp: 55, yRatio: 0.50 }
        ];

        const renderWaveform = () => {
            ctx.clearRect(0, 0, width, height);

            const speedMultiplier = isMockPlaying ? 1.0 : 0.28;
            const ampMultiplier = isMockPlaying ? 1.0 : 0.35;
            step += 0.02 * speedMultiplier;

            waveConfig.forEach(wave => {
                ctx.beginPath();
                const baseY = height * wave.yRatio;
                ctx.moveTo(0, baseY);

                for (let x = 0; x <= width; x += 8) {
                    const y = baseY + Math.sin(x * wave.freq + step * (wave.speed * 50)) * (wave.amp * ampMultiplier)
                                    + Math.cos((x * 0.5) * wave.freq + step * 0.5) * (15 * ampMultiplier);
                    ctx.lineTo(x, y);
                }

                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.closePath();

                ctx.fillStyle = wave.color;
                ctx.fill();
            });

            requestAnimationFrame(renderWaveform);
        };
        requestAnimationFrame(renderWaveform);
    }

    // ==========================================================================
    // 5. Interactive Web Audio Synthesizer (Harmonic Chimes in E-Major / Cyan)
    // ==========================================================================
    let audioCtx = null;
    let isSoundMuted = false;
    const mockSoundToggle = document.getElementById('mockSoundToggle');
    const mockSoundIcon = document.getElementById('mockSoundIcon');

    const initAudio = () => {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    };

    const playHarmonicChime = (type = 'play') => {
        if (isSoundMuted) return;
        try {
            initAudio();
            if (!audioCtx) return;

            const now = audioCtx.currentTime;
            // Notes for harmonious chord (E major / Electric Purple vibe)
            const freqs = type === 'play' ? [329.63, 415.30, 493.88, 659.25] : [493.88, 392.00, 329.63];

            freqs.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.06);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.04, now + i * 0.06 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.45);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(now + i * 0.06);
                osc.stop(now + i * 0.06 + 0.46);
            });
        } catch (e) {
            // Silently handle if audio policy prevents autoplay
        }
    };

    mockSoundToggle?.addEventListener('click', () => {
        isSoundMuted = !isSoundMuted;
        if (mockSoundIcon) {
            mockSoundIcon.className = isSoundMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        }
        mockSoundToggle.classList.toggle('active', !isSoundMuted);
        if (!isSoundMuted) playHarmonicChime('play');
    });

    // ==========================================================================
    // 6. Interactive Hero Player Mockup Simulation
    // ==========================================================================
    const mockPlayBtn = document.getElementById('mockPlayBtn');
    const mockPlayIcon = document.getElementById('mockPlayIcon');
    const mockAlbumArt = document.getElementById('mockupAlbumArt');
    const mockEqualizer = document.getElementById('mockupEqualizer');
    const mockProgressFill = document.getElementById('mockupProgressFill');
    const mockProgressBar = document.getElementById('mockupProgressBar');
    const mockCurrentTime = document.getElementById('mockupCurrentTime');
    const mockTotalTime = document.getElementById('mockupTotalTime');
    const mockTrackTitle = document.getElementById('mockTrackTitle');
    const mockTrackArtist = document.getElementById('mockTrackArtist');
    const mockTrackMeta = document.getElementById('mockupTrackMeta');
    const mockPrevBtn = document.getElementById('mockPrevBtn');
    const mockNextBtn = document.getElementById('mockNextBtn');
    const mockShuffleBtn = document.getElementById('mockShuffleBtn');
    const mockRepeatBtn = document.getElementById('mockRepeatBtn');

    let mockSeconds = 102; // 1:42
    let mockInterval = null;

    const sampleTracks = [
        { title: 'Bloody Sweet (From "Leo")', artist: 'Anirudh Ravichander • 100% Real Live Track', duration: 198 },
        { title: 'Radhimaa (From "Think Indie")', artist: 'Sai Abhyankkar • 320kbps Master', duration: 259 },
        { title: 'Badass (From "Leo")', artist: 'Anirudh Ravichander • High Definition Audio', duration: 229 },
        { title: 'Katchi Sera', artist: 'Sai Abhyankkar • Indian Indie Hits', duration: 194 },
        { title: 'Fear Song (From "Devara")', artist: 'Anirudh Ravichander • Authentic Tracklist', duration: 215 }
    ];
    let currentTrackIdx = 0;

    const formatTime = (totalSec) => {
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const updateMockUI = (animate = false) => {
        const tr = sampleTracks[currentTrackIdx];

        if (animate && mockTrackMeta) {
            mockTrackMeta.style.opacity = '0';
            mockTrackMeta.style.transform = 'translateY(6px)';
            setTimeout(() => {
                if (mockTrackTitle) mockTrackTitle.textContent = tr.title;
                if (mockTrackArtist) mockTrackArtist.textContent = tr.artist;
                mockTrackMeta.style.opacity = '1';
                mockTrackMeta.style.transform = 'translateY(0)';
            }, 200);
        } else {
            if (mockTrackTitle) mockTrackTitle.textContent = tr.title;
            if (mockTrackArtist) mockTrackArtist.textContent = tr.artist;
        }

        if (mockCurrentTime) mockCurrentTime.textContent = formatTime(mockSeconds);
        if (mockTotalTime) mockTotalTime.textContent = formatTime(tr.duration);

        const progressPct = Math.min(100, (mockSeconds / tr.duration) * 100);
        if (mockProgressFill) mockProgressFill.style.width = `${progressPct}%`;
    };

    const setPlaybackState = (playing) => {
        isMockPlaying = playing;
        if (mockPlayIcon) {
            mockPlayIcon.className = isMockPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
        }

        const img = mockAlbumArt?.querySelector('img');
        if (isMockPlaying) {
            mockEqualizer?.classList.add('active');
            mockAlbumArt?.classList.add('playing');
            if (img) img.style.animationPlayState = 'running';
        } else {
            mockEqualizer?.classList.remove('active');
            mockAlbumArt?.classList.remove('playing');
            if (img) img.style.animationPlayState = 'paused';
        }
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
                    updateMockUI(true);
                } else {
                    updateMockUI(false);
                }
            }
        }, 1000);
    };

    mockPlayBtn?.addEventListener('click', () => {
        setPlaybackState(!isMockPlaying);
        playHarmonicChime(isMockPlaying ? 'play' : 'pause');
    });

    mockNextBtn?.addEventListener('click', () => {
        currentTrackIdx = (currentTrackIdx + 1) % sampleTracks.length;
        mockSeconds = 0;
        updateMockUI(true);
        playHarmonicChime('play');
    });

    mockPrevBtn?.addEventListener('click', () => {
        currentTrackIdx = (currentTrackIdx - 1 + sampleTracks.length) % sampleTracks.length;
        mockSeconds = 0;
        updateMockUI(true);
        playHarmonicChime('play');
    });

    // Seek on progress bar click
    mockProgressBar?.addEventListener('click', (e) => {
        const rect = mockProgressBar.getBoundingClientRect();
        const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const tr = sampleTracks[currentTrackIdx];
        mockSeconds = Math.floor(tr.duration * clickRatio);
        updateMockUI(false);
    });

    mockShuffleBtn?.addEventListener('click', () => {
        mockShuffleBtn.classList.toggle('active');
        mockShuffleBtn.style.color = mockShuffleBtn.classList.contains('active') ? '#8B5CF6' : '';
        mockShuffleBtn.style.borderColor = mockShuffleBtn.classList.contains('active') ? '#8B5CF6' : '';
    });

    mockRepeatBtn?.addEventListener('click', () => {
        mockRepeatBtn.classList.toggle('active');
        mockRepeatBtn.style.color = mockRepeatBtn.classList.contains('active') ? '#22D3EE' : '';
        mockRepeatBtn.style.borderColor = mockRepeatBtn.classList.contains('active') ? '#22D3EE' : '';
    });

    setPlaybackState(true);
    startMockTimer();

    // ==========================================================================
    // 7. Interactive Player View Switcher & DSP Studio Controls
    // ==========================================================================
    const tabPlayerBtn = document.getElementById('tabPlayerBtn');
    const tabDspBtn = document.getElementById('tabDspBtn');
    const playerStreamView = document.getElementById('playerStreamView');
    const playerDspView = document.getElementById('playerDspView');

    tabPlayerBtn?.addEventListener('click', () => {
        tabPlayerBtn.classList.add('active');
        tabDspBtn?.classList.remove('active');
        if (playerStreamView) playerStreamView.style.display = 'flex';
        if (playerDspView) playerDspView.style.display = 'none';
    });

    tabDspBtn?.addEventListener('click', () => {
        tabDspBtn.classList.add('active');
        tabPlayerBtn?.classList.remove('active');
        if (playerStreamView) playerStreamView.style.display = 'none';
        if (playerDspView) playerDspView.style.display = 'flex';
    });

    // DSP Sliders
    const sliderBass = document.getElementById('sliderBass');
    const sliderMid = document.getElementById('sliderMid');
    const sliderTreble = document.getElementById('sliderTreble');
    const sliderSpatial = document.getElementById('sliderSpatial');

    const dspBassVal = document.getElementById('dspBassVal');
    const dspMidVal = document.getElementById('dspMidVal');
    const dspTrebleVal = document.getElementById('dspTrebleVal');
    const dspSpatialVal = document.getElementById('dspSpatialVal');

    const updateDspValues = () => {
        if (sliderBass && dspBassVal) {
            dspBassVal.textContent = `${sliderBass.value >= 0 ? '+' : ''}${sliderBass.value} dB`;
        }
        if (sliderMid && dspMidVal) {
            dspMidVal.textContent = `${sliderMid.value >= 0 ? '+' : ''}${sliderMid.value} dB`;
        }
        if (sliderTreble && dspTrebleVal) {
            dspTrebleVal.textContent = `${sliderTreble.value >= 0 ? '+' : ''}${sliderTreble.value} dB`;
        }
        if (sliderSpatial && dspSpatialVal) {
            dspSpatialVal.textContent = `${sliderSpatial.value}%`;
        }

        // Live Equalizer reaction: adjust heights based on bass slider
        const bassBoostRatio = sliderBass ? (parseFloat(sliderBass.value) / 15) : 0.8;
        const eqBars = document.querySelectorAll('.playing-equalizer .eq-bar');
        eqBars.forEach((bar, idx) => {
            if (idx < 3) {
                bar.style.transform = `scaleY(${0.7 + bassBoostRatio * 0.6})`;
            }
        });
    };

    [sliderBass, sliderMid, sliderTreble, sliderSpatial].forEach(slider => {
        slider?.addEventListener('input', updateDspValues);
    });

    // DSP Presets
    const dspPresets = {
        bass: { bass: 15, mid: 2, treble: 6, spatial: 75 },
        vocal: { bass: 3, mid: 10, treble: 7, spatial: 55 },
        audiophile: { bass: 0, mid: 0, treble: 0, spatial: 20 },
        vinyl: { bass: 8, mid: 6, treble: 3, spatial: 90 }
    };

    document.querySelectorAll('.dsp-preset-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const container = pill.closest('.dsp-presets-row');
            container?.querySelectorAll('.dsp-preset-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const key = pill.getAttribute('data-preset');
            if (key && dspPresets[key]) {
                const p = dspPresets[key];
                if (sliderBass) sliderBass.value = p.bass;
                if (sliderMid) sliderMid.value = p.mid;
                if (sliderTreble) sliderTreble.value = p.treble;
                if (sliderSpatial) sliderSpatial.value = p.spatial;
                updateDspValues();
                playHarmonicChime('play');
            }
        });
    });

    // ==========================================================================
    // 8. Product Experience Showcase Tabs Switcher
    // ==========================================================================
    const showcaseTabBtns = document.querySelectorAll('.showcase-tab-btn');
    const showcasePanels = {
        lyrics: document.getElementById('showcasePanelLyrics'),
        dsp: document.getElementById('showcasePanelDsp'),
        widgets: document.getElementById('showcasePanelWidgets'),
        discovery: document.getElementById('showcasePanelDiscovery')
    };

    showcaseTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showcaseTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabKey = btn.getAttribute('data-showcase');
            Object.keys(showcasePanels).forEach(key => {
                const panel = showcasePanels[key];
                if (panel) {
                    if (key === tabKey) {
                        panel.classList.add('active');
                    } else {
                        panel.classList.remove('active');
                    }
                }
            });

            playHarmonicChime('play');
        });
    });

    // Language Chips Toggle
    document.querySelectorAll('.lang-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            playHarmonicChime('play');
        });
    });

    // ==========================================================================
    // 9. Feature Section Category Filter
    // ==========================================================================
    const categoryFilterBtns = document.querySelectorAll('.category-filter-btn');
    const featureCards = document.querySelectorAll('.features-grid .feature-card');

    categoryFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            featureCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                if (filterValue === 'all' || cardCategory === filterValue) {
                    card.style.display = 'flex';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 250);
                }
            });

            playHarmonicChime('play');
        });
    });

    // ==========================================================================
    // 10. Interactive Turntable Demo & Dual RPM Physics (33 & 45 RPM)
    // ==========================================================================
    const demoTurntableToggleBtn = document.getElementById('demoTurntableToggleBtn');
    const demoVinylDisc = document.getElementById('demoVinylDisc');
    const demoTonearm = document.getElementById('demoTonearm');
    const rpm33Btn = document.getElementById('rpm33Btn');
    const rpm45Btn = document.getElementById('rpm45Btn');
    const pitchValueDisplay = document.getElementById('pitchValueDisplay');
    const turntableStrobe = document.getElementById('turntableStrobe');

    let isTurntableSpinning = true;

    const setTurntableSpeed = (rpm) => {
        rpm33Btn?.classList.toggle('active', rpm === 33);
        rpm45Btn?.classList.toggle('active', rpm === 45);

        if (demoVinylDisc) {
            demoVinylDisc.style.animationDuration = rpm === 33 ? '6s' : '4.4s';
        }
        if (pitchValueDisplay) {
            pitchValueDisplay.textContent = rpm === 33 ? '±0.0%' : '+36.4%';
        }
        if (turntableStrobe) {
            turntableStrobe.style.animationDuration = rpm === 33 ? '0.18s' : '0.11s';
        }
    };

    rpm33Btn?.addEventListener('click', () => setTurntableSpeed(33));
    rpm45Btn?.addEventListener('click', () => setTurntableSpeed(45));

    demoTurntableToggleBtn?.addEventListener('click', () => {
        isTurntableSpinning = !isTurntableSpinning;
        if (isTurntableSpinning) {
            demoVinylDisc?.classList.add('spinning');
            demoTonearm?.classList.add('active');
            demoTurntableToggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Turntable';
            if (turntableStrobe) turntableStrobe.style.opacity = '1';
            playHarmonicChime('play');
        } else {
            demoVinylDisc?.classList.remove('spinning');
            demoTonearm?.classList.remove('active');
            demoTurntableToggleBtn.innerHTML = '<i class="fa-solid fa-play"></i> Spin Turntable';
            if (turntableStrobe) turntableStrobe.style.opacity = '0.35';
            playHarmonicChime('pause');
        }
    });

    // ==========================================================================
    // 11. 3D Perspective Tilt & Specular Light Reflection on Cards
    // ==========================================================================
    const tiltCards = document.querySelectorAll('.tilt-card, .feature-card, .tech-card, .release-box, .widget-presentation-card');

    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);

            // Calculate subtle tilt angle (-4deg to +4deg)
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -4;
            const rotateY = ((x - centerX) / centerX) * 4;

            card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    // ==========================================================================
    // 12. Scroll-Driven Staggered Reveal System (IntersectionObserver)
    // ==========================================================================
    const revealElements = document.querySelectorAll(
        '.feature-card, .tech-card, .faq-card, .section-header, .demo-wrapper, .developer-card, .release-box, .install-step-card'
    );

    revealElements.forEach(el => el.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));

    // Stagger grid cards delay
    document.querySelectorAll('.features-grid, .tech-grid, .install-steps-grid').forEach(grid => {
        const children = grid.children;
        Array.from(children).forEach((child, index) => {
            child.style.transitionDelay = `${(index % 4) * 0.08}s`;
        });
    });

    // ==========================================================================
    // 13. Animated Numerical Counters (Count-Up)
    // ==========================================================================
    const counterElements = document.querySelectorAll('.count-up');

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseFloat(el.getAttribute('data-target'));
                const prefix = el.getAttribute('data-prefix') || '';
                const suffix = el.getAttribute('data-suffix') || '';
                const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);

                if (!isNaN(target)) {
                    let start = 0;
                    const duration = 1400; // ms
                    const startTime = performance.now();

                    const step = (now) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(1, elapsed / duration);
                        // Ease out cubic
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        const current = start + (target - start) * easeOut;

                        el.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;

                        if (progress < 1) {
                            requestAnimationFrame(step);
                        } else {
                            el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
                        }
                    };
                    requestAnimationFrame(step);
                }

                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counterElements.forEach(el => counterObserver.observe(el));

    // ==========================================================================
    // 14. Button Liquid Ripple Micro-Interaction
    // ==========================================================================
    document.querySelectorAll('.btn, .mock-btn, .rpm-btn, .showcase-tab-btn, .category-filter-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const circle = document.createElement('span');
            circle.classList.add('btn-ripple');
            const diameter = Math.max(this.clientWidth, this.clientHeight);
            const radius = diameter / 2;

            const rect = this.getBoundingClientRect();
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;

            const existingRipple = this.querySelector('.btn-ripple');
            if (existingRipple) existingRipple.remove();

            this.appendChild(circle);
            setTimeout(() => circle.remove(), 600);
        });
    });

    // ==========================================================================
    // 15. Active Navbar Link Highlight on Scroll
    // ==========================================================================
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
    }, { passive: true });

    // ==========================================================================
    // 16. Interactive FAQ Accordion Hub
    // ==========================================================================
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.faq-card');
            if (!card) return;
            const isOpen = card.classList.contains('open');
            document.querySelectorAll('.faq-card').forEach(c => c.classList.remove('open'));
            if (!isOpen) {
                card.classList.add('open');
                playHarmonicChime('play');
            }
        });
    });

    // ==========================================================================
    // 17. Automatic 10-Second APK Download Countdown Timer (v1.4.2)
    // ==========================================================================
    let autoDownloadSeconds = 10;
    const totalCountdownSeconds = 10;
    const banner = document.getElementById('autoDownloadBanner');
    const countdownSec = document.getElementById('countdownSec');
    const bannerCount = document.getElementById('bannerCount');
    const bannerSec = document.getElementById('bannerSec');
    const ringFill = document.getElementById('bannerRingFill');
    const heroApkBtn = document.getElementById('heroApkBtn');
    const heroApkText = document.getElementById('heroApkText');
    const autoTimerBadge = document.getElementById('autoTimerBadge');
    const autoDownloadFill = document.getElementById('autoDownloadFill');
    const bannerDownloadNowBtn = document.getElementById('bannerDownloadNowBtn');
    const bannerCancelBtn = document.getElementById('bannerCancelBtn');
    const bannerSubText = document.getElementById('bannerSubText');
    const ringCircumference = 113.1; // 2 * Math.PI * 18

    let autoDownloadTimer = null;
    let downloadTriggered = false;

    // Show floating banner smoothly after user lands on website
    setTimeout(() => {
        if (!downloadTriggered && banner) {
            banner.classList.add('show');
        }
    }, 700);

    const executeApkDownload = () => {
        if (downloadTriggered) return;
        downloadTriggered = true;

        if (autoDownloadTimer) {
            clearInterval(autoDownloadTimer);
            autoDownloadTimer = null;
        }

        // Programmatic trigger of vibentra.apk download
        const downloadLink = document.createElement('a');
        downloadLink.href = 'vibentra.apk';
        downloadLink.download = 'vibentra.apk';
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        setTimeout(() => downloadLink.remove(), 1000);

        // Update hero button visual state
        if (autoDownloadFill) {
            autoDownloadFill.style.width = '100%';
            autoDownloadFill.style.background = 'linear-gradient(90deg, rgba(16, 185, 129, 0.35), rgba(34, 211, 238, 0.4))';
            autoDownloadFill.style.borderRightColor = '#10B981';
        }
        if (autoTimerBadge) {
            autoTimerBadge.style.background = 'rgba(16, 185, 129, 0.25)';
            autoTimerBadge.style.borderColor = '#10B981';
            autoTimerBadge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald"></i> Downloading...';
        }
        if (heroApkText) {
            heroApkText.textContent = 'Downloading APK (99 MB)';
        }

        // Update banner visual state
        if (banner) {
            if (bannerSec) {
                bannerSec.innerHTML = '<i class="fa-solid fa-check text-emerald"></i>';
            }
            if (ringFill) {
                ringFill.style.strokeDashoffset = '0';
                ringFill.setAttribute('stroke', '#10B981');
            }
            if (bannerSubText) {
                bannerSubText.innerHTML = '<span class="text-emerald"><i class="fa-solid fa-circle-check"></i> <b>Download initiated!</b> Check your browser downloads for <code>vibentra.apk</code>.</span>';
            }
            if (bannerDownloadNowBtn) {
                bannerDownloadNowBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Downloaded';
                bannerDownloadNowBtn.disabled = true;
                bannerDownloadNowBtn.style.opacity = '0.7';
            }

            // Auto-hide banner after 3.5 seconds
            setTimeout(() => {
                banner.classList.remove('show');
            }, 3500);
        }

        if (typeof playHarmonicChime === 'function') {
            playHarmonicChime('play');
        }
    };

    const cancelAutoDownload = () => {
        if (autoDownloadTimer) {
            clearInterval(autoDownloadTimer);
            autoDownloadTimer = null;
        }
        if (banner) {
            banner.classList.remove('show');
        }
        if (autoTimerBadge) {
            autoTimerBadge.style.display = 'none';
        }
        if (autoDownloadFill) {
            autoDownloadFill.style.width = '0%';
        }
    };

    const updateTimerDisplay = () => {
        if (countdownSec) countdownSec.textContent = autoDownloadSeconds;
        if (bannerCount) bannerCount.textContent = autoDownloadSeconds;
        if (bannerSec) bannerSec.textContent = `${autoDownloadSeconds}s`;

        // Progress fraction (0 to 1 as time passes from 10 down to 0)
        const progress = (totalCountdownSeconds - autoDownloadSeconds) / totalCountdownSeconds;

        if (autoDownloadFill) {
            autoDownloadFill.style.width = `${progress * 100}%`;
        }

        if (ringFill) {
            const offset = ringCircumference * (1 - progress);
            ringFill.style.strokeDashoffset = offset;
        }
    };

    // Initialize display at 10s
    updateTimerDisplay();

    // Start 1-second countdown interval
    autoDownloadTimer = setInterval(() => {
        autoDownloadSeconds -= 1;
        if (autoDownloadSeconds <= 0) {
            autoDownloadSeconds = 0;
            updateTimerDisplay();
            executeApkDownload();
        } else {
            updateTimerDisplay();
        }
    }, 1000);

    // Event listeners for user interaction
    bannerDownloadNowBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        executeApkDownload();
    });

    bannerCancelBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        cancelAutoDownload();
    });

    heroApkBtn?.addEventListener('click', () => {
        // If user manually clicks hero button, cancel countdown timer and mark downloaded
        if (!downloadTriggered) {
            if (autoDownloadTimer) {
                clearInterval(autoDownloadTimer);
                autoDownloadTimer = null;
            }
            downloadTriggered = true;
            if (banner) banner.classList.remove('show');
            if (autoTimerBadge) {
                autoTimerBadge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald"></i> Downloaded';
                autoTimerBadge.style.background = 'rgba(16, 185, 129, 0.25)';
                autoTimerBadge.style.borderColor = '#10B981';
            }
            if (autoDownloadFill) {
                autoDownloadFill.style.width = '100%';
            }
        }
    });

    console.log("🚀 Vibentra Music Ecosystem v1.4.2 Cinematic Engine initialized! Built by SRIVATSAN R.");
});
