import { auth, db } from '../firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export class PlaylistService {
    constructor() {
        this.playlists = [];
        this.collabListeners = new Map();
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
            try {
                this.playlists = JSON.parse(stored);
            } catch (e) {
                this.playlists = [];
            }
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
                        if (cPl.customCover && !localMatch.customCover) {
                            localMatch.customCover = cPl.customCover;
                        }
                    }
                });
                this.playlists = merged;
                this.savePlaylistsLocal();
                this.saveToCloud();
                
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

    createPlaylist(name, description = '', customCover = null) {
        const newPlaylist = {
            id: 'pl_' + Date.now(),
            name,
            description,
            customCover: customCover || null,
            tracks: [],
            isCollaborative: false,
            collabCode: null
        };
        this.playlists.push(newPlaylist);
        this.savePlaylistsLocal();
        this.saveToCloud();
        return newPlaylist;
    }

    setCustomCover(playlistId, coverDataUrl) {
        const pl = this.playlists.find(p => p.id === playlistId);
        if (pl) {
            pl.customCover = coverDataUrl;
            this.savePlaylistsLocal();
            this.saveToCloud();
        }
    }

    editPlaylist(id, newName, newDescription, newCover = null) {
        const pl = this.playlists.find(p => p.id === id);
        if (pl) {
            pl.name = newName;
            pl.description = newDescription;
            if (newCover !== null) pl.customCover = newCover;
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
                if (pl.isCollaborative && pl.collabCode) {
                    this.syncCollabToCloud(pl);
                }
            }
        }
    }

    removeTrackFromPlaylist(playlistId, trackId) {
        const pl = this.playlists.find(p => p.id === playlistId);
        if (pl) {
            pl.tracks = pl.tracks.filter(t => t.id !== trackId);
            this.savePlaylistsLocal();
            this.saveToCloud();
            if (pl.isCollaborative && pl.collabCode) {
                this.syncCollabToCloud(pl);
            }
        }
    }

    /**
     * Enable Collaboration for a Playlist
     */
    async enableCollab(playlistId) {
        const pl = this.getPlaylist(playlistId);
        if (!pl) return null;

        const collabCode = 'VIBE_' + Math.random().toString(36).substring(2, 7).toUpperCase();
        pl.isCollaborative = true;
        pl.collabCode = collabCode;
        pl.collabOwner = auth.currentUser ? auth.currentUser.uid : 'anon';
        
        this.savePlaylistsLocal();
        this.saveToCloud();

        // Publish to global collabPlaylists in Firestore
        try {
            if (db) {
                await setDoc(doc(db, "collabPlaylists", collabCode), {
                    id: pl.id,
                    name: pl.name,
                    description: pl.description,
                    customCover: pl.customCover || null,
                    tracks: pl.tracks,
                    collabCode: collabCode,
                    ownerUid: pl.collabOwner,
                    updatedAt: Date.now()
                });
                this.listenToCollabPlaylist(collabCode, pl.id);
            }
        } catch (e) {
            console.warn('Firestore collab publish error:', e);
        }

        return collabCode;
    }

    /**
     * Join an Existing Collaborative Playlist via Code
     */
    async joinCollabPlaylist(collabCode) {
        const cleanCode = collabCode.trim().toUpperCase();
        const docRef = doc(db, "collabPlaylists", cleanCode);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            throw new Error("Collaborative playlist not found. Please check the code.");
        }

        const data = snap.data();
        let existing = this.playlists.find(p => p.collabCode === cleanCode || p.id === data.id);
        
        if (!existing) {
            existing = {
                id: data.id || ('collab_' + Date.now()),
                name: `[Collab] ${data.name}`,
                description: data.description || 'Shared Collaborative Playlist',
                customCover: data.customCover || null,
                tracks: data.tracks || [],
                isCollaborative: true,
                collabCode: cleanCode
            };
            this.playlists.push(existing);
        } else {
            existing.tracks = data.tracks || [];
            existing.isCollaborative = true;
            existing.collabCode = cleanCode;
        }

        this.savePlaylistsLocal();
        this.saveToCloud();
        this.listenToCollabPlaylist(cleanCode, existing.id);
        return existing;
    }

    listenToCollabPlaylist(collabCode, localPlaylistId) {
        if (this.collabListeners.has(collabCode)) return;

        try {
            if (db) {
                const unsub = onSnapshot(doc(db, "collabPlaylists", collabCode), (docSnap) => {
                    if (docSnap.exists()) {
                        const cloudData = docSnap.data();
                        const target = this.getPlaylist(localPlaylistId);
                        if (target) {
                            target.tracks = cloudData.tracks || [];
                            if (cloudData.name) target.name = cloudData.name;
                            this.savePlaylistsLocal();
                            window.dispatchEvent(new CustomEvent('collabPlaylistUpdated', { detail: { playlistId: localPlaylistId } }));
                        }
                    }
                });
                this.collabListeners.set(collabCode, unsub);
            }
        } catch (e) {
            console.warn("Collab listener error:", e);
        }
    }

    async syncCollabToCloud(pl) {
        if (!pl.collabCode || !db) return;
        try {
            await setDoc(doc(db, "collabPlaylists", pl.collabCode), {
                id: pl.id,
                name: pl.name,
                description: pl.description,
                customCover: pl.customCover || null,
                tracks: pl.tracks,
                updatedAt: Date.now()
            }, { merge: true });
        } catch (e) {
            console.warn('Sync collab to cloud failed:', e);
        }
    }
}

export const playlistService = new PlaylistService();
