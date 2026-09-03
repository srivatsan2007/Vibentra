package com.srivatsan.vibentra

/**
 * Vibentra - Native Kotlin UI Architecture
 * 
 * Target Screens:
 * 1. Update / Loading Screen (Splash & Update Checker)
 * 2. Music Player (Media3 / ExoPlayer Engine)
 * 3. Playlist Screen (LazyColumn native list)
 */

object VibentraKotlinConfig {
    const val APP_NAME = "Vibentra"
    const val VERSION_NAME = "2.0.0-native"
    const val BACKEND_BASE_URL = "https://vibentra.vercel.app/api/"
}

sealed class Screen(val route: String) {
    object SplashLoading : Screen("splash_loading")
    object Home : Screen("home")
    object Playlist : Screen("playlist")
    object MusicPlayer : Screen("music_player")
}
