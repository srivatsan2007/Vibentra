const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// You would normally pass a serviceAccountKey.json here
// For demonstration, we're initializing the app in a mock/default way
// Replace this with: admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

try {
    admin.initializeApp();
} catch (error) {
    console.log("Firebase Admin initialization skipped or failed (expected if no credentials):", error.message);
}

const db = admin.firestore ? admin.firestore() : null;

module.exports = { admin, db };
