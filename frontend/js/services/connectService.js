import { db, auth } from '../firebase-config.js';
import { 
    collection, doc, setDoc, getDoc, onSnapshot, 
    updateDoc, arrayUnion, serverTimestamp, query, orderBy, addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class ConnectService {
    constructor() {
        this.currentRoomId = null;
        this.isHost = false;
        this.unsubscribeRoom = null;
        this.unsubscribeMessages = null;
        
        // Callbacks for UI updates
        this.onRoomUpdate = null;
        this.onMessageReceived = null;
    }

    // Generate a random 6-character room code
    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async createRoom(username) {
        const roomId = this.generateRoomCode();
        const roomRef = doc(db, "rooms", roomId);
        const uid = auth.currentUser ? auth.currentUser.uid : ('user_' + Math.random().toString(36).substring(2, 7));
        
        const roomData = {
            hostId: uid,
            hostName: username || 'Host',
            createdAt: serverTimestamp(),
            participants: [{ uid: uid, name: username || 'Host' }],
            currentTrack: null,
            isPlaying: false,
            currentTime: 0,
            queue: []
        };

        await setDoc(roomRef, roomData);
        
        this.currentRoomId = roomId;
        this.isHost = true;
        this.listenToRoom(roomId);
        this.listenToMessages(roomId);
        
        return roomId;
    }

    async joinRoom(roomId, username) {
        const cleanId = roomId.trim().toUpperCase();
        const roomRef = doc(db, "rooms", cleanId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            throw new Error("Jam Room not found. Please check the 6-letter code.");
        }

        const uid = auth.currentUser ? auth.currentUser.uid : ('guest_' + Math.random().toString(36).substring(2, 7));

        await updateDoc(roomRef, {
            participants: arrayUnion({ uid: uid, name: username || 'Viber' })
        });

        this.currentRoomId = cleanId;
        this.isHost = roomSnap.data().hostId === uid;
        
        this.listenToRoom(this.currentRoomId);
        this.listenToMessages(this.currentRoomId);
        
        return this.currentRoomId;
    }

    listenToRoom(roomId) {
        if (this.unsubscribeRoom) this.unsubscribeRoom();
        
        this.unsubscribeRoom = onSnapshot(doc(db, "rooms", roomId), (doc) => {
            if (doc.exists() && this.onRoomUpdate) {
                this.onRoomUpdate(doc.data());
            }
        });
    }

    listenToMessages(roomId) {
        if (this.unsubscribeMessages) this.unsubscribeMessages();
        
        const q = query(collection(db, "rooms", roomId, "messages"), orderBy("timestamp", "asc"));
        
        this.unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => {
                messages.push(doc.data());
            });
            if (this.onMessageReceived) {
                this.onMessageReceived(messages);
            }
        });
    }

    async sendMessage(text, username) {
        if (!this.currentRoomId) return;
        const uid = auth.currentUser ? auth.currentUser.uid : 'guest';
        
        await addDoc(collection(db, "rooms", this.currentRoomId, "messages"), {
            text: text,
            senderId: uid,
            senderName: username || 'Viber',
            timestamp: serverTimestamp()
        });
    }

    async syncPlaybackState(track, isPlaying, currentTime) {
        if (!this.currentRoomId || !this.isHost) return;
        
        const roomRef = doc(db, "rooms", this.currentRoomId);
        await updateDoc(roomRef, {
            currentTrack: track,
            isPlaying: isPlaying,
            currentTime: currentTime,
            updatedAt: Date.now()
        });
    }

    async addToQueue(track) {
        if (!this.currentRoomId) return;
        
        const roomRef = doc(db, "rooms", this.currentRoomId);
        await updateDoc(roomRef, {
            queue: arrayUnion(track)
        });
    }

    leaveRoom() {
        if (this.unsubscribeRoom) this.unsubscribeRoom();
        if (this.unsubscribeMessages) this.unsubscribeMessages();
        this.currentRoomId = null;
        this.isHost = false;
        this.onRoomUpdate = null;
        this.onMessageReceived = null;
    }
}

export const connectService = new ConnectService();
