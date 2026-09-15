package com.srivatsan.vibentra.navigation

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.compose.runtime.remember
import com.srivatsan.vibentra.auth.AuthScreen
import com.srivatsan.vibentra.home.HomeScreen
import com.srivatsan.vibentra.library.FavoritesScreen
import com.srivatsan.vibentra.splash.SplashScreen
import com.vibentra.music.player.AudioPlayerManager
import com.vibentra.music.player.FullMusicPlayerScreen
import com.vibentra.music.search.SearchScreen

sealed class AppDestination(val route: String) {
    object Splash : AppDestination("splash")
    object Auth : AppDestination("auth")
    object Home : AppDestination("home")
    object Search : AppDestination("search")
    object Player : AppDestination("player")
    object Favorites : AppDestination("favorites")
}

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    startDestination: String = AppDestination.Splash.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        enterTransition = { fadeIn(animationSpec = tween(300)) },
        exitTransition = { fadeOut(animationSpec = tween(300)) }
    ) {
        // 1. Splash Screen
        composable(AppDestination.Splash.route) {
            SplashScreen(
                onNavigateToHome = {
                    navController.navigate(AppDestination.Home.route) {
                        popUpTo(AppDestination.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToAuth = {
                    navController.navigate(AppDestination.Home.route) {
                        popUpTo(AppDestination.Splash.route) { inclusive = true }
                    }
                },
                isUserLoggedIn = true
            )
        }

        // 2. Auth Screen
        composable(AppDestination.Auth.route) {
            AuthScreen(
                onNavigateToHome = {
                    navController.navigate(AppDestination.Home.route) {
                        popUpTo(AppDestination.Auth.route) { inclusive = true }
                    }
                }
            )
        }

        // 3. Home Screen (Real JioSaavn & YouTube Music)
        composable(AppDestination.Home.route) {
            HomeScreen(
                onNavigateToPlayer = { song ->
                    AudioPlayerManager.playSong(song)
                    navController.navigate(AppDestination.Player.route)
                },
                onNavigateToSearch = {
                    navController.navigate(AppDestination.Search.route)
                },
                onNavigateToFavorites = {
                    navController.navigate(AppDestination.Favorites.route)
                }
            )
        }

        // 3b. Favorites / Liked Songs Screen
        composable(AppDestination.Favorites.route) {
            val queue by AudioPlayerManager.queue.collectAsState()
            val likedIds by AudioPlayerManager.likedSongIds.collectAsState()
            val currentSong by AudioPlayerManager.currentSong.collectAsState()

            val favSongs = remember(queue, likedIds, currentSong) {
                val pool = (queue + listOfNotNull(currentSong)).distinctBy { it.id }
                val liked = pool.filter { likedIds.contains(it.id) }
                if (liked.isNotEmpty()) liked else pool
            }

            FavoritesScreen(
                favoriteSongs = favSongs,
                onSongClick = { song, list ->
                    AudioPlayerManager.playSong(song, list)
                    navController.navigate(AppDestination.Player.route)
                },
                onPlayAll = {
                    favSongs.firstOrNull()?.let { first ->
                        AudioPlayerManager.playSong(first, favSongs)
                        navController.navigate(AppDestination.Player.route)
                    }
                },
                onShuffle = {
                    if (favSongs.isNotEmpty()) {
                        val shuffled = favSongs.shuffled()
                        AudioPlayerManager.playSong(shuffled.first(), shuffled)
                        navController.navigate(AppDestination.Player.route)
                    }
                },
                onRemoveFavorite = { song ->
                    AudioPlayerManager.toggleLike(song.id)
                },
                onAddToPlaylist = {},
                onExploreClick = {
                    navController.navigate(AppDestination.Search.route)
                }
            )
        }

        // 4. Search Screen with Voice Search & InnerTube YouTube Search
        composable(AppDestination.Search.route) {
            SearchScreen(
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
                onSongClick = { song ->
                    AudioPlayerManager.playSong(song)
                    navController.navigate(AppDestination.Player.route)
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        // 5. Full-Screen Music Player (100% Echo Music Parity)
        composable(AppDestination.Player.route) {
            val song by AudioPlayerManager.currentSong.collectAsState()
            val isPlaying by AudioPlayerManager.isPlaying.collectAsState()
            val posMs by AudioPlayerManager.currentPositionMs.collectAsState()
            val durMs by AudioPlayerManager.durationMs.collectAsState()

            val progress = if (durMs > 0) (posMs.toFloat() / durMs.toFloat()).coerceIn(0f, 1f) else 0f
            val currentFormatted = String.format("%d:%02d", (posMs / 1000) / 60, (posMs / 1000) % 60)
            val durFormatted = if (durMs > 0) {
                String.format("%d:%02d", (durMs / 1000) / 60, (durMs / 1000) % 60)
            } else {
                song?.duration ?: "3:30"
            }

            song?.let { activeSong ->
                FullMusicPlayerScreen(
                    song = activeSong,
                    isPlaying = isPlaying,
                    progress = progress,
                    currentTime = currentFormatted,
                    totalDuration = durFormatted,
                    onPlayPauseClick = { AudioPlayerManager.togglePlayPause() },
                    onNextClick = { AudioPlayerManager.playNext() },
                    onPreviousClick = { AudioPlayerManager.playPrevious() },
                    onSeek = { seekFraction ->
                        val targetMs = (seekFraction * durMs).toLong()
                        AudioPlayerManager.seekTo(targetMs)
                    },
                    onCollapse = { navController.popBackStack() }
                )
            } ?: run {
                LaunchedEffect(Unit) {
                    navController.popBackStack()
                }
            }
        }
    }
}
