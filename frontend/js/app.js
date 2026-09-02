import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const initApp = () => {
    // Strictly execute only when #splashScreen element exists on page
    const splashScreen = document.getElementById('splashScreen');
    if (!splashScreen) return;

    let hasRedirected = false;

    // Bulletproof path resolution for any hosting environment (Root, Pages, Subfolder, PWA, Capacitor)
    const getSafePath = (pageName) => {
        const path = window.location.pathname;
        const base = path.substring(0, path.lastIndexOf('/') + 1);
        if (path.includes('/pages/')) {
            return `${base}${pageName}.html`;
        }
        return `${base}pages/${pageName}.html`;
    };

    const doRedirect = (targetUrl) => {
        if (hasRedirected) return;
        hasRedirected = true;
        splashScreen.classList.add('hidden');
        setTimeout(() => {
            window.location.replace(targetUrl);
        }, 300);
    };

    // Fast resolution: listen to auth state without artificial stall
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
            localStorage.setItem('vibentra_logged_in', 'true');
            doRedirect(getSafePath('home'));
        } else {
            localStorage.removeItem('vibentra_logged_in');
            doRedirect(getSafePath('auth'));
        }
    });

    // Fallback safety timeout if network is offline or Firebase takes long
    setTimeout(() => {
        if (!hasRedirected) {
            const wasLoggedIn = localStorage.getItem('vibentra_logged_in') === 'true' || !!localStorage.getItem('vibentra_user_email');
            doRedirect(getSafePath(wasLoggedIn ? 'home' : 'auth'));
        }
    }, 1500);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Utility function for showing notifications
export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
