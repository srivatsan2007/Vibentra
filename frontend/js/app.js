import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const initApp = () => {
    const splashScreen = document.getElementById('splashScreen');
    if (!splashScreen) return;

    // Simulate loading time (e.g., fetching initial data)
    setTimeout(() => {
        // Check Firebase Auth state
        onAuthStateChanged(auth, (user) => {
            splashScreen.classList.add('hidden');
            
            setTimeout(() => {
                if (user) {
                    // User is signed in, redirect to home
                    window.location.href = './pages/home.html';
                } else {
                    // User is signed out, redirect to auth
                    window.location.href = './pages/auth.html';
                }
            }, 500); // Wait for transition
        });
    }, 2000); // 2 seconds splash screen
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
