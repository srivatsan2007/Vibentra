import { auth, db } from '../firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export class PlaylistService {
    constructor() {
        this.playlists = [];
        this.loadPlaylistsLocal();
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.syncFromCloud(user.uid);
            }
        });
    }

    loadPlaylistsLocal() {
        const stored = localStorage.getItem('vibentra_playlists');
        if (stored) {
            this.playlists = JSON.parse(stored);
        } else {
            // Default demo playlist
            this.playlists = [{
                id: 'pl_' + Date.now(),
                name: 'My Awesome Mix',
                description: 'A custom playlist',
                tracks: []
            }];
            this.savePlaylistsLocal();
        }
    }

    savePlaylistsLocal() {
        localStorage.setItem('vibentra_playlists', JSON.stringify(this.playlists));
    }

    async saveToCloud() {
        if (auth.currentUser) {
            try {
                await setDoc(doc(db, "userPlaylists", auth.currentUser.uid), {
                    playlists: this.playlists
                }, { merge: true });
            } catch (e) {
                console.error("Failed to save playlists to cloud", e);
            }
        }
    }

    async syncFromCloud(uid) {
        try {
            const docRef = doc(db, "userPlaylists", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const cloudPls = docSnap.data().playlists || [];
                // Merge cloud and local
                const merged = [...this.playlists];
                cloudPls.forEach(cPl => {
                    const localMatch = merged.find(lPl => lPl.id === cPl.id);
                    if (!localMatch) {
                        merged.push(cPl);
                    } else {
                        // Merge tracks inside existing playlist
                        cPl.tracks.forEach(ct => {
                            if (!localMatch.tracks.find(lt => lt.id === ct.id)) {
                                localMatch.tracks.push(ct);
                            }
                        });
                    }
                });
                this.playlists = merged;
                this.savePlaylistsLocal();
                this.saveToCloud(); // Push back the merged list
                
                // Dispatch event to update UI
                window.dispatchEvent(new CustomEvent('playlistsSynced'));
            } else if (this.playlists.length > 0) {
                this.saveToCloud();
            }
        } catch (e) {
            console.error("Failed to sync playlists from cloud", e);
        }
    }

    getPlaylists() {
        return this.playlists;
    }

    getPlaylist(id) {
        return this.playlists.find(p => p.id === id);
    }

    createPlaylist(name, description = '') {
        const newPlaylist = {
            id: 'pl_' + Date.now(),
            name,
            description,
            tracks: []
        };
        this.playlists.push(newPlaylist);
        this.savePlaylistsLocal();
        this.saveToCloud();
        return newPlaylist;
    }

    editPlaylist(id, newName, newDescription) {
        const pl = this.playlists.find(p => p.id === id);
        if (pl) {
            pl.name = newName;
            pl.description = newDescription;
            this.savePlaylistsLocal();
            this.saveToCloud();
        }
    }

    deletePlaylist(id) {
        this.playlists = this.playlists.filter(p => p.id !== id);
        this.savePlaylistsLocal();
        this.saveToCloud();
    }

    addTrackToPlaylist(id, track) {
        const pl = this.playlists.find(p => p.id === id);
        if (pl) {
            if (!pl.tracks.find(t => t.id === track.id)) {
                pl.tracks.push(track);
                this.savePlaylistsLocal();
                this.saveToCloud();
            }
        }
    }

    removeTrackFromPlaylist(playlistId, trackId) {
        const pl = this.playlists.find(p => p.id === playlistId);
        if (pl) {
            pl.tracks = pl.tracks.filter(t => t.id !== trackId);
            this.savePlaylistsLocal();
            this.saveToCloud();
        }
    }
}

export const playlistService = new PlaylistService();
