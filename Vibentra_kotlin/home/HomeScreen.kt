package com.srivatsan.vibentra.home

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.srivatsan.vibentra.data.model.MusicSection
import com.srivatsan.vibentra.data.model.Song
import com.srivatsan.vibentra.home.components.*
import com.srivatsan.vibentra.theme.*

/**
 * Vibentra Native Home Screen
 * Pixel-perfect implementation of the user reference screenshot:
 * - "Vibentra" Top Bar + 4 action icons (History, Trending, Friends, Avatar)
 * - Horizontal Mood / Category filter pills
 * - "SIMILAR TO Ilaiyaraaja" carousel
 * - "SIMILAR TO Sai Abhyankkar" carousel
 * - "Trending / New Playlists" carousel
 * - Floating capsule bottom navigation bar
 * - Real JioSaavn & YouTube Music songs
 */
@Composable
fun HomeScreen(
    onNavigateToPlayer: (Song) -> Unit = {},
    onNavigateToSearch: () -> Unit = {},
    onNavigateToLibrary: () -> Unit = {},
    viewModel: HomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        // Main Scrollable Home Content
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 120.dp) // Space for floating nav & mini player
        ) {
            // 1. Top App Bar matching screenshot
            item {
                HomeTopAppBar(
                    onHistoryClick = {},
                    onStatsClick = {},
                    onCommunityClick = {},
                    onProfileClick = {}
                )
            }

            // 2. Category / Mood Pills (Romance, Feel good, Party, Relax...)
            item {
                Spacer(modifier = Modifier.height(14.dp))
                MoodPillRow(
                    categories = uiState.categories,
                    selectedCategory = uiState.selectedCategory,
                    onCategorySelected = { category ->
                        viewModel.onSelectCategory(category)
                    }
                )
                Spacer(modifier = Modifier.height(20.dp))
            }

            // 3. Loading Indicator when switching categories
            if (uiState.isLoading && uiState.sections.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = PrimaryCyan)
                    }
                }
            }

            // 4. Recommendation Sections (SIMILAR TO Ilaiyaraaja, SIMILAR TO Sai Abhyankkar, Trending)
            items(uiState.sections, key = { it.id }) { section ->
                SectionRow(
                    section = section,
                    onSongClick = { song ->
                        viewModel.playSong(song)
                    }
                )
                Spacer(modifier = Modifier.height(26.dp))
            }
        }

        // Bottom Controls Container (Mini Player + Floating Bottom Nav)
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
        ) {
            // Floating Mini-Player Bar when song is active
            AnimatedVisibility(
                visible = uiState.currentSong != null,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
            ) {
                uiState.currentSong?.let { song ->
                    MiniPlayerBar(
                        currentSong = song,
                        isPlaying = uiState.isPlaying,
                        onPlayPauseToggle = { viewModel.togglePlayPause() },
                        onNext = { viewModel.nextTrack() },
                        onDismiss = { viewModel.dismissPlayer() },
                        onClick = { onNavigateToPlayer(song) },
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                }
            }

            // Floating Bottom Navigation Bar matching reference screenshot
            FloatingBottomNav(
                currentTab = uiState.currentTab,
                onTabSelected = { tab ->
                    viewModel.selectTab(tab)
                    when (tab) {
                        HomeNavTab.SEARCH -> onNavigateToSearch()
                        HomeNavTab.LIBRARY -> onNavigateToLibrary()
                        else -> {}
                    }
                }
            )
        }
    }
}

/**
 * Top App Bar: "Vibentra" on left + 4 action icons on right
 */
@Composable
private fun HomeTopAppBar(
    onHistoryClick: () -> Unit,
    onStatsClick: () -> Unit,
    onCommunityClick: () -> Unit,
    onProfileClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 18.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // App Title: "Vibentra" (replacing "Echo Music")
        Text(
            text = "Vibentra",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            letterSpacing = 0.5.sp
        )

        // 4 Action Icons matching reference screenshot
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 1. History (clock counter-clockwise)
            Icon(
                imageVector = Icons.Default.History,
                contentDescription = "Listening History",
                tint = Color.White,
                modifier = Modifier
                    .size(22.dp)
                    .clickable { onHistoryClick() }
            )

            // 2. Stats / Trending chart
            Icon(
                imageVector = Icons.Default.ShowChart,
                contentDescription = "Stats",
                tint = Color.White,
                modifier = Modifier
                    .size(22.dp)
                    .clickable { onStatsClick() }
            )

            // 3. Community / Friends
            Icon(
                imageVector = Icons.Default.Group,
                contentDescription = "Community",
                tint = Color.White,
                modifier = Modifier
                    .size(22.dp)
                    .clickable { onCommunityClick() }
            )

            // 4. User Profile Avatar
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .border(1.5.dp, PrimaryCyan, CircleShape)
                    .clickable { onProfileClick() }
            ) {
                AsyncImage(
                    model = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
                    contentDescription = "User Avatar",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}

/**
 * Artist / Category Section Row with Header and Horizontal Carousel
 */
@Composable
private fun SectionRow(
    section: MusicSection,
    onSongClick: (Song) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        // Section Header matching screenshot (e.g. "SIMILAR TO Ilaiyaraaja")
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Artist Circular Avatar (if artist section)
            if (section.isArtistSimilar && section.artistAvatarUrl != null) {
                AsyncImage(
                    model = section.artistAvatarUrl,
                    contentDescription = section.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .border(1.dp, Color(0x33FFFFFF), CircleShape)
                )
            }

            Column {
                if (section.subtitlePrefix.isNotEmpty()) {
                    Text(
                        text = section.subtitlePrefix,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 1.sp
                    )
                }

                Text(
                    text = section.title,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Horizontal Carousel of Music Cards
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(section.songs, key = { it.id }) { song ->
                MusicCard(
                    song = song,
                    onClick = { onSongClick(song) }
                )
            }
        }
    }
}
