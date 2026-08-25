// Update Manager Module for Vibentra
// Dynamically fetches release notes from version.json and manages PWA / SW update flow

export function initUpdateManager() {
    // Inject HTML elements for Update Toast Banner, New Update View, and Installing Modal
    if (!document.getElementById('new-update-view')) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <!-- Floating Toast Banner -->
            <div id="update-toast-banner" class="update-toast-banner">
                <div class="toast-left">
                    <i class="fa-solid fa-sparkles"></i>
                    <div class="toast-text">
                        <strong>New Update Available!</strong>
                        <p>Tap to view release details & install</p>
                    </div>
                </div>
                <button id="view-update-details-btn" class="toast-view-btn">View Details</button>
            </div>

            <!-- Fullscreen New Update Page -->
            <div id="new-update-view" class="update-view-overlay">
                <div class="update-view-header">
                    <button class="update-back-btn" id="updateBackBtn" title="Back">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="update-header-title" id="updateHeaderTitle">New update v1.2.6</h2>
                </div>

                <div class="update-view-body" id="updateViewBody">
                    <div class="update-meta-info" id="updateMetaInfo">
                        <p>Released on: 25 August 2026, 12:00 pm</p>
                        <p>Size: 2.9 MB</p>
                        <p>SW Cache: vibentra-cache-v71</p>
                    </div>

                    <div class="update-important-block" id="updateImportantBlock">
                        <strong style="color: #38BDF8; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-circle-exclamation"></i> IMPORTANT NOTICE</strong><br>
                        Restored classic app flow, silent update management without popups or interruptions, and fully responsive user interface.
                    </div>

                    <div id="updateChangelogContainer">
                        <!-- Dynamic categories populated from version.json -->
                    </div>
                </div>

                <div class="update-view-footer">
                    <button class="update-btn-later" id="updateLaterBtn">Later</button>
                    <button class="update-btn-install" id="updateInstallBtn">Install</button>
                </div>
            </div>

            <!-- Installing Modal Overlay -->
            <div id="installing-modal-overlay" class="installing-modal-overlay">
                <div class="installing-card">
                    <div class="installing-icon">
                        <img src="../images/vibentra-logo.png" alt="Vibentra Logo" onerror="this.src='./images/vibentra-logo.png'">
                    </div>
                    <h3>Vibentra Music</h3>
                    <p id="installStatusText">Installing...</p>
                    <div class="install-progress-bar-bg">
                        <div id="installProgressFill" class="install-progress-fill"></div>
                    </div>
                    <span id="installPercentText" class="install-percent-text">0%</span>
                    <button id="cancelInstallBtn" class="cancel-install-btn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper);
    }

    let newWorker = null;
    let updateData = null;
    let installTimer = null;

    // Fetch version.json dynamically
    const versionUrl = (window.location.pathname.includes('/pages/') ? '../version.json' : './version.json') + '?t=' + Date.now();
    
    fetch(versionUrl, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
            updateData = data;
            populateUpdateView(data);

            const storedSw = localStorage.getItem('vibentra_active_sw_version');
            if (storedSw !== data.swVersion) {
                localStorage.setItem('vibentra_active_sw_version', data.swVersion);
            }
        })
        .catch(err => console.log('Could not fetch version.json:', err));

    // Service Worker Registration Listener
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(window.location.pathname.includes('/pages/') ? '../sw.js' : './sw.js')
            .then(reg => {
                reg.addEventListener('updatefound', () => {
                    newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (updateData) localStorage.setItem('vibentra_active_sw_version', updateData.swVersion);
                        }
                    });
                });
                if (reg.waiting) {
                    newWorker = reg.waiting;
                    if (updateData) localStorage.setItem('vibentra_active_sw_version', updateData.swVersion);
                }
            })
            .catch(err => console.log('SW Registration error:', err));
    }

    // DOM Bindings
    const toastBanner = document.getElementById('update-toast-banner');
    const viewDetailsBtn = document.getElementById('view-update-details-btn');
    const updateView = document.getElementById('new-update-view');
    const backBtn = document.getElementById('updateBackBtn');
    const laterBtn = document.getElementById('updateLaterBtn');
    const installBtn = document.getElementById('updateInstallBtn');
    const installModal = document.getElementById('installing-modal-overlay');
    const progressFill = document.getElementById('installProgressFill');
    const percentText = document.getElementById('installPercentText');
    const cancelInstallBtn = document.getElementById('cancelInstallBtn');

    function showToastBanner(ver) {
        if (toastBanner) {
            const p = toastBanner.querySelector('.toast-text p');
            if (p) p.textContent = `Version ${ver || 'new'} is available`;
            toastBanner.style.display = 'flex';
        }
    }

    function populateUpdateView(data) {
        document.getElementById('updateHeaderTitle').textContent = `New update ${data.version}`;
        document.getElementById('updateMetaInfo').innerHTML = `
            <p>Released on: ${data.releaseDate}</p>
            <p>Size: ${data.size}</p>
            <p>SW Cache: ${data.swVersion}</p>
        `;

        if (data.importantNote) {
            const cleanNote = data.importantNote.replace(/^>\s*\[!IMPORTANT\]\s*/gi, '').replace(/^>\s*/gm, '');
            document.getElementById('updateImportantBlock').innerHTML = `
                <strong style="color: #38BDF8; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-circle-exclamation"></i> IMPORTANT NOTICE</strong><br>
                ${cleanNote}
            `;
        }

        const changelogContainer = document.getElementById('updateChangelogContainer');
        changelogContainer.innerHTML = '';

        if (data.changelog && Array.isArray(data.changelog)) {
            data.changelog.forEach(cat => {
                const sec = document.createElement('div');
                sec.className = 'update-changelog-section';
                const cleanCategory = cat.category.replace(/^#+\s*/, '');
                sec.innerHTML = `<h3>${cleanCategory}</h3>`;
                const ul = document.createElement('ul');
                cat.items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    ul.appendChild(li);
                });
                sec.appendChild(ul);
                changelogContainer.appendChild(sec);
            });
        }
    }

    function openUpdateView() {
        if (toastBanner) toastBanner.style.display = 'none';
        if (updateView) updateView.style.display = 'flex';
    }

    function closeUpdateView() {
        if (updateView) updateView.style.display = 'none';
    }

    if (viewDetailsBtn) viewDetailsBtn.addEventListener('click', openUpdateView);
    if (backBtn) backBtn.addEventListener('click', closeUpdateView);
    if (laterBtn) laterBtn.addEventListener('click', closeUpdateView);

    // Install Action Sequence
    if (installBtn) {
        installBtn.addEventListener('click', () => {
            if (installModal) installModal.style.display = 'flex';
            let progress = 0;

            installTimer = setInterval(() => {
                progress += Math.floor(Math.random() * 15) + 10;
                if (progress > 100) progress = 100;

                if (progressFill) progressFill.style.width = progress + '%';
                if (percentText) percentText.textContent = progress + '%';
                if (installBtn) installBtn.textContent = progress + '%';

                if (progress >= 100) {
                    clearInterval(installTimer);
                    
                    if (updateData) {
                        localStorage.setItem('vibentra_active_sw_version', updateData.swVersion);
                    }

                    if (newWorker) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }

                    // Force unregister and reload
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                            for (let registration of registrations) {
                                registration.unregister();
                            }
                        }).then(() => {
                            if ('caches' in window) {
                                caches.keys().then(names => {
                                    for (let name of names) caches.delete(name);
                                });
                            }
                            setTimeout(() => {
                                window.location.href = window.location.pathname + '?v=' + Date.now();
                            }, 500);
                        });
                    } else {
                        window.location.reload();
                    }
                }
            }, 250);
        });
    }

    if (cancelInstallBtn) {
        cancelInstallBtn.addEventListener('click', () => {
            if (installTimer) clearInterval(installTimer);
            if (installModal) installModal.style.display = 'none';
            if (installBtn) installBtn.textContent = 'Install';
        });
    }
}
