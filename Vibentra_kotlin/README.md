# Vibentra Kotlin (Native Frontend UI)

This folder is dedicated to the **Native Kotlin (Jetpack Compose)** frontend for Vibentra.

---

## 🎯 Objective
Migrate the frontend UI from Capacitor/WebView to 100% native Android Kotlin to achieve:
- **Zero UI Glitches & 60/120 FPS Performance** (Hardware GPU acceleration via Jetpack Compose)
- **Smooth, Glitch-Free Audio Playback** using Android Media3 / ExoPlayer
- **Instant Playlist Scrolling** with native recycled views (`LazyColumn`)
- **Reliable Update & Loading Flow** with native splash screens and update managers

---

## 📂 Targeted Screens to Rebuild in Kotlin
1. **Update & Loading Screen (`UpdateScreen.kt`)**
   - Native animated progress indicator
   - Version checker & OTA / APK update handler
2. **Music Player (`PlayerScreen.kt` & `AudioService.kt`)**
   - ExoPlayer / Media3 integration
   - Real-time scrubbing, waveform/visualizer, background playback, and lock screen media notification
3. **Playlist & Library (`PlaylistScreen.kt`)**
   - High-performance `LazyColumn` for infinite song lists
   - Smooth reordering, swipe actions, and instant caching
4. **Home & Navigation (`HomeScreen.kt`)**
   - Native bottom navigation bar and seamless screen transitions

---

## 🔗 Backend Connectivity
- Reuses the existing backend APIs (`/api`, Vercel backend, Firebase Auth).
- Networking handled via **Retrofit** or **Ktor** with Coroutines.
