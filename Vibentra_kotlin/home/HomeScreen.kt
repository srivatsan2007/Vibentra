package com.srivatsan.vibentra.home

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.srivatsan.vibentra.components.*
import com.srivatsan.vibentra.data.model.MusicSection
import com.srivatsan.vibentra.data.model.Song
import com.srivatsan.vibentra.home.components.*
import com.srivatsan.vibentra.settings.AccountBottomSheet
import com.srivatsan.vibentra.theme.*
import kotlinx.coroutines.launch

/**
 * Vibentra Native Home Screen - Echo Music UI & Functions Architecture
 * - Time-of-day dynamic greeting & "Vibentra" branding
 * - 4 Header quick actions: Listening History, Echo Stats, Radio Mix, Profile Avatar
 * - Dynamic category & mood filter pills
 * - Echo Music "Quick picks" / "Listen again" 2-row interactive track grid
 * - "SIMILAR TO [Artist]" carousels with 1-tap Radio/Play All
 * - Integrated Floating Navigation Capsule with smooth spring micro-animations
 * - Direct voice search launcher & AccountBottomSheet trigger
 */
@Composable
fun HomeScreen(
    onNavigateToPlayer: (Song) -> Unit = {},
    onNavigateToSearch: () -> Unit = {},
    onNavigateToLibrary: () -> Unit = {},
    viewModel: HomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    var showAccountSheet by remember { mutableStateOf(false) }

    // Native Speech Recognizer for Voice Search from Home / Floating Nav
    val voiceSearchLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val spokenText = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!spokenText.isNullOrBlank()) {
                onNavigateToSearch()
            }
        }
    }

    val triggerVoiceSearch = {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak a song, artist, or album...")
        }
        voiceSearchLauncher.launch(intent)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        // Main Scrollable Home Content
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 130.dp) // Clearance for floating nav & mini player
        ) {
            // 1. Echo Music Dynamic Greeting & Top App Bar
            item {
                HomeTopAppBar(
                    greeting = uiState.greeting,
                    onHistoryClick = {
                        // Play last played or seed song
                        viewModel.startRadio()
                    },
                    onStatsClick = {
                        viewModel.onSelectCategory("Tamil Hits")
                    },
                    onCommunityClick = {
                        viewModel.startRadio()
                    },
                    onProfileClick = {
                        showAccountSheet = true
                    }
                )
            }

            // 2. Category / Mood Pills (Romance, Feel good, Party, Relax, Energize...)
            item {
                Spacer(modifier = Modifier.height(10.dp))
                MoodPillRow(
                    categories = uiState.categories,
                    selectedCategory = uiState.selectedCategory,
                    onCategorySelected = { category ->
                        viewModel.onSelectCategory(category)
                    }
                )
                Spacer(modifier = Modifier.height(18.dp))
            }

            // 3. Echo Music Skeleton Shimmer Loading State
            if (uiState.isLoading && uiState.sections.isEmpty()) {
                item {
                    ShimmerQuickPicksGrid()
                }
            }

            // 4. Echo Music Signature: "Quick picks" / "Listen again" Section
            if (uiState.quickPicks.isNotEmpty()) {
                item {
                    QuickPicksSection(
                        songs = uiState.quickPicks,
                        currentSong = uiState.currentSong,
                        isPlaying = uiState.isPlaying,
                        onSongClick = { song -> viewModel.playSong(song) },
                        onStartRadio = { viewModel.startRadio() }
                    )
                    Spacer(modifier = Modifier.height(26.dp))
                }
            }

            // 5. Recommendation Sections (SIMILAR TO Ilaiyaraaja, SIMILAR TO Sai Abhyankkar, Trending)
            items(uiState.sections, key = { it.id }) { section ->
                SectionRow(
                    section = section,
                    onSongClick = { song ->
                        viewModel.playSong(song)
                    },
                    onPlayAll = {
                        viewModel.playSection(section)
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

            // Floating Pill Navigation Capsule matching Echo Music
            FloatingBottomNav(
                currentTab = uiState.currentTab,
                onTabSelected = { tab ->
                    if (tab == HomeNavTab.HOME && uiState.currentTab == HomeNavTab.HOME) {
                        coroutineScope.launch {
                            listState.animateScrollToItem(0)
                        }
                    } else {
                        viewModel.selectTab(tab)
                        when (tab) {
                            HomeNavTab.SEARCH -> onNavigateToSearch()
                            HomeNavTab.LIBRARY -> onNavigateToLibrary()
                            else -> {}
                        }
                    }
                },
                onVoiceClick = triggerVoiceSearch,
                onMoreClick = { showAccountSheet = true }
            )
        }

        // Account Bottom Sheet Modal
        if (showAccountSheet) {
            AccountBottomSheet(
                userName = "Srivatsan",
                userAvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
                onDismissRequest = { showAccountSheet = false },
                onAccountClick = { showAccountSheet = false },
                onAiHubClick = { showAccountSheet = false },
                onSettingsClick = { showAccountSheet = false },
                onAboutClick = { showAccountSheet = false }
            )
        }
    }
}

/**
 * Top App Bar: Time-based greeting ("Good evening") + "Vibentra" on left, 4 action icons on right
 */
@Composable
private fun HomeTopAppBar(
    greeting: String,
    onHistoryClick: () -> Unit,
    onStatsClick: () -> Unit,
    onCommunityClick: () -> Unit,
    onProfileClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 18.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = greeting.uppercase(),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF94A3B8),
                letterSpacing = 1.sp
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Vibentra",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    letterSpacing = 0.5.sp
                )
                Spacer(modifier = Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .size(7.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF06B6D4))
                )
            }
        }

        // 4 Action Icons matching Echo Music
        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 1. History (Clock)
            IconButton(
                onClick = onHistoryClick,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.History,
                    contentDescription = "Listening History",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }

            // 2. Stats / Trending chart
            IconButton(
                onClick = onStatsClick,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ShowChart,
                    contentDescription = "Stats",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }

            // 3. Community / Radio Mix
            IconButton(
                onClick = onCommunityClick,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Radio,
                    contentDescription = "Start Radio",
                    tint = Color(0xFF06B6D4),
                    modifier = Modifier.size(22.dp)
                )
            }

            // 4. User Profile Avatar with Glowing Border
            Box(
                modifier = Modifier
                    .size(34.dp)
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
 * Echo Music Signature: "Quick picks" / "Listen again" Section
 */
@Composable
private fun QuickPicksSection(
    songs: List<Song>,
    currentSong: Song?,
    isPlaying: Boolean,
    onSongClick: (Song) -> Unit,
    onStartRadio: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "START RADIO BASED ON YOUR TASTE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF94A3B8),
                    letterSpacing = 1.sp
                )
                Text(
                    text = "Quick picks",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )
            }

            Text(
                text = "▶ Play all",
                color = Color(0xFF06B6D4),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onStartRadio() }
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Horizontal swipeable 2-item columns
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            val chunkedSongs = songs.chunked(2)
            items(chunkedSongs) { pair ->
                Column(
                    modifier = Modifier.width(260.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    pair.forEach { song ->
                        val isThisPlaying = currentSong?.id == song.id && isPlaying
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF141E26))
                                .border(
                                    BorderStroke(
                                        1.dp,
                                        if (isThisPlaying) Color(0xFF06B6D4) else Color(0xFF243545)
                                    ),
                                    RoundedCornerShape(12.dp)
                                )
                                .clickable { onSongClick(song) }
                                .padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(modifier = Modifier.size(48.dp)) {
                                AsyncImage(
                                    model = song.coverUrl,
                                    contentDescription = song.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .clip(RoundedCornerShape(8.dp))
                                )
                                if (isThisPlaying) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .background(Color.Black.copy(alpha = 0.45f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.VolumeUp,
                                            contentDescription = "Playing",
                                            tint = Color(0xFF06B6D4),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = song.title,
                                    color = if (isThisPlaying) Color(0xFF06B6D4) else Color.White,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.5.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = song.artist,
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.5.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            IconButton(onClick = { onSongClick(song) }, modifier = Modifier.size(32.dp)) {
                                Icon(
                                    imageVector = if (isThisPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                    contentDescription = "Play",
                                    tint = if (isThisPlaying) Color(0xFF06B6D4) else Color(0xFF94A3B8),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Artist / Category Section Row with Header, "Play All", and Horizontal Carousel
 */
@Composable
private fun SectionRow(
    section: MusicSection,
    onSongClick: (Song) -> Unit,
    onPlayAll: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        // Section Header matching Echo Music
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
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
                            .size(46.dp)
                            .clip(CircleShape)
                            .border(1.5.dp, Color(0x6606B6D4), CircleShape)
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

            // "Play All" Action Button
            Text(
                text = "▶ Play all",
                color = Color(0xFF06B6D4),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onPlayAll() }
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )
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
