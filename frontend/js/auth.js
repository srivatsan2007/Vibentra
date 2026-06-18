import { auth, db } from './firebase-config.js';
import { showNotification } from './app.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const initAuth = () => {
    // UI Elements
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const forgotPasswordCard = document.getElementById('forgotPasswordCard');

    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');
    const showForgotPasswordBtn = document.getElementById('showForgotPassword');
    const backToLoginBtn = document.getElementById('backToLogin');

    // Forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const googleLoginBtn = document.getElementById('googleLoginBtn');

    // Navigation logic
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    });

    showForgotPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.classList.add('hidden');
        forgotPasswordCard.classList.remove('hidden');
    });

    backToLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        forgotPasswordCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    });

    // Login logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification('Login successful!');
            window.location.href = 'home.html';
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // Register logic
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (password !== confirmPassword) {
            showNotification('Passwords do not match!', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update Auth Profile
            await updateProfile(user, {
                displayName: username
            });

            // Save to Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: username,
                email: email,
                profileImage: "",
                bio: "",
                createdAt: new Date().toISOString()
            });

            showNotification('Registration successful!');
            window.location.href = 'home.html';
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // Google Sign-In
    googleLoginBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // Check if it's a new user and add to Firestore (we can just upsert)
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: user.displayName || 'Google User',
                email: user.email,
                profileImage: user.photoURL || "",
                bio: "",
                createdAt: new Date().toISOString()
            }, { merge: true });

            showNotification('Google Sign-in successful!');
            window.location.href = 'home.html';
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // Forgot Password
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;

        try {
            await sendPasswordResetEmail(auth, email);
            showNotification('Password reset link sent to your email!');
            forgotPasswordForm.reset();
            setTimeout(() => {
                forgotPasswordCard.classList.add('hidden');
                loginCard.classList.remove('hidden');
            }, 2000);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
