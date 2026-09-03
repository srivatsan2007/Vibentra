package com.srivatsan.vibentra.navigation

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.srivatsan.vibentra.auth.AuthScreen
import com.srivatsan.vibentra.splash.SplashScreen

import com.srivatsan.vibentra.home.HomeScreen

sealed class AppDestination(val route: String) {
    object Splash : AppDestination("splash")
    object Auth : AppDestination("auth")
    object Home : AppDestination("home")
    object Search : AppDestination("search")
    object Player : AppDestination("player")
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
                    navController.navigate(AppDestination.Auth.route) {
                        popUpTo(AppDestination.Splash.route) { inclusive = true }
                    }
                }
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

        // 3. Home Screen (Matches reference screenshot)
        composable(AppDestination.Home.route) {
            HomeScreen(
                onNavigateToPlayer = { song ->
                    navController.navigate(AppDestination.Player.route)
                }
            )
        }

        // 4. Search Screen with Voice Search (Matches Screenshots 1, 2, 3, 4)
        composable(AppDestination.Search.route) {
            com.vibentra.music.search.SearchScreen(
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
                onSongClick = { song ->
                    navController.navigate(AppDestination.Player.route)
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}
