import { auth, db } from '../firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export class FavoriteService {
    constructor() {
        this.favorites = [];
        this.loadFavoritesLocal();
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.syncFromCloud(user.uid);
            }
        });
    }

    loadFavoritesLocal() {
        const stored = localStorage.getItem('vibentra_favorites');
        if (stored) {
            this.favorites = JSON.parse(stored);
        }
    }

    saveFavoritesLocal() {
        localStorage.setItem('vibentra_favorites', JSON.stringify(this.favorites));
    }

    async saveToCloud() {
        if (auth.currentUser) {
            try {
                await setDoc(doc(db, "userFavorites", auth.currentUser.uid), {
                    favorites: this.favorites
                }, { merge: true });
            } catch (e) {
                console.error("Failed to save favorites to cloud", e);
            }
        }
    }

    async syncFromCloud(uid) {
        try {
            let cloudFavs = [];
            // Check primary userFavorites collection
            const docRef = doc(db, "userFavorites", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().favorites) {
                cloudFavs = docSnap.data().favorites;
            } else {
                // Fallback: check users collection for legacy accounts
                const userRef = doc(db, "users", uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().favorites) {
                    cloudFavs = userSnap.data().favorites;
                }
            }

            if (cloudFavs.length > 0) {
                const merged = [...this.favorites];
                cloudFavs.forEach(ct => {
                    if (!merged.find(lt => lt.id === ct.id)) {
                        merged.push(ct);
                    }
                });
                this.favorites = merged;
                this.saveFavoritesLocal();
                this.saveToCloud(); // Push back merged list to primary collection
                
                // Dispatch event to update UI
                window.dispatchEvent(new CustomEvent('favoritesSynced'));
            } else if (this.favorites.length > 0) {
                this.saveToCloud();
            }
        } catch (e) {
            console.error("Failed to sync favorites from cloud", e);
        }
    }

    getFavorites() {
        return this.favorites;
    }

    isFavorite(trackId) {
        return this.favorites.some(t => t.id === trackId);
    }

    toggleFavorite(track) {
        const index = this.favorites.findIndex(t => t.id === track.id);
        let added = false;
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(track);
            added = true;
        }
        this.saveFavoritesLocal();
        this.saveToCloud();
        return added;
    }
}

export const favoriteService = new FavoriteService();
