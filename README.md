# VIBENTRA - Where Vibes Connect

A modern music platform MVP built with HTML, CSS, JavaScript, Node.js, Express, and Firebase.

## Features

* **Authentication**: Login, Register, Google Sign-in, Forgot Password using Firebase Auth.
* **Splash Screen**: Animated entry screen.
* **Dashboard**: Modern glassmorphism UI with music player, sidebar navigation, and responsive grid layouts.
* **Music Player**: Persistent player UI across navigation.
* **Dynamic Views**: Search, Playlists, Favorites, and Profile mocked using a Vanilla JS Single Page Application approach.
* **Backend API**: Node.js & Express server with Firebase Admin SDK for managing Users, Playlists, and Favorites.

## Tech Stack

* **Frontend**: HTML5, CSS3 (Variables, Grid, Flexbox, Glassmorphism), Vanilla JS (ES6 modules).
* **Backend**: Node.js, Express.js.
* **Database & Auth**: Firebase Authentication, Firestore.

## Getting Started

### Prerequisites
* Node.js installed.
* Firebase project created.

### 1. Setup Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Authentication** (Email/Password & Google).
4. Enable **Firestore Database**.
5. Copy your Firebase config object and replace the `TODO` in `frontend/js/firebase-config.js`.
6. For the backend, generate a private key for your service account (`Project Settings > Service Accounts > Generate new private key`) and initialize it in `backend/config/firebaseAdmin.js` (Currently mocked).

### 2. Run Backend

\`\`\`bash
cd backend
npm install
npm run start # or node server.js
\`\`\`
The backend server will run on \`http://localhost:5000\`.

### 3. Run Frontend

You can run the frontend using any live server extension (like VS Code Live Server) or a simple Python/Node server.

\`\`\`bash
# If you have serve installed globally
cd frontend
serve .
\`\`\`

Open \`http://localhost:3000\` (or whichever port your server uses) to view the application. The app will start at the Splash Screen and automatically redirect you.
