package com.vibentra.music.search

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.srivatsan.vibentra.data.model.Song
import com.vibentra.music.theme.VibentraColors

@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    onSongClick: (Song) -> Unit,
    onNavigateBack: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    val keyboardController = LocalSoftwareKeyboardController.current
    val focusManager = LocalFocusManager.current
    val focusRequester = remember { FocusRequester() }
    var isInputFocused by remember { mutableStateOf(false) }

    val dismissKeyboard = {
        keyboardController?.hide()
        focusManager.clearFocus()
        isInputFocused = false
    }

    // Voice recognition launcher
    val voiceSearchLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val spokenText = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            spokenText?.let {
                dismissKeyboard()
                viewModel.onVoiceSearchRecognized(it)
            }
        }
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF090F14))
            .imePadding()
    ) {
        val screenWidth = maxWidth
        val isTabletOrLaptop = screenWidth >= 768.dp

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // 1. Search Bar Header with FocusRequester & Virtual Keyboard Actions
            SearchBarHeader(
                query = uiState.query,
                onQueryChange = { viewModel.onQueryChanged(it) },
                onSearchAction = {
                    dismissKeyboard()
                    if (uiState.query.isNotBlank()) {
                        viewModel.addRecentSearch(uiState.query)
                    }
                },
                onClearClick = {
                    viewModel.clearSearch()
                    focusRequester.requestFocus()
                },
                onVoiceClick = {
                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak a song, artist, or album...")
                    }
                    voiceSearchLauncher.launch(intent)
                },
                onBackClick = {
                    dismissKeyboard()
                    if (uiState.query.isNotBlank()) {
                        viewModel.clearSearch()
                    } else {
                        onNavigateBack()
                    }
                },
                isSearching = uiState.query.isNotBlank(),
                focusRequester = focusRequester,
                onFocusChanged = { focused -> isInputFocused = focused },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = if (isTabletOrLaptop) 36.dp else 16.dp, vertical = 12.dp)
            )

            // 2. Sub-Navigation Tabs (Explore, Echo Chart, Album) or Filter Chips
            if (uiState.query.isBlank()) {
                SearchTabsRow(
                    selectedTab = uiState.selectedTab,
                    onTabSelected = { tab ->
                        dismissKeyboard()
                        viewModel.onTabSelected(tab)
                    },
                    modifier = Modifier.padding(horizontal = if (isTabletOrLaptop) 36.dp else 20.dp)
                )
            } else {
                SearchFilterChipsRow(
                    selectedFilter = uiState.selectedFilter,
                    onFilterSelected = { filter ->
                        dismissKeyboard()
                        viewModel.onFilterSelected(filter)
                    },
                    modifier = Modifier.padding(horizontal = if (isTabletOrLaptop) 36.dp else 16.dp, vertical = 8.dp)
                )
            }

            // 3. Main Content: Explore View vs Suggestions vs Search Results View
            if (uiState.query.isBlank()) {
                ExploreView(
                    recentSearches = uiState.recentSearches,
                    onCardClick = { query ->
                        dismissKeyboard()
                        viewModel.onQueryChanged(query)
                    },
                    onRemoveRecent = { query ->
                        viewModel.removeRecentSearch(query)
                    },
                    onClearAllRecent = {
                        viewModel.clearRecentSearches()
                    },
                    isTabletOrLaptop = isTabletOrLaptop,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = if (isTabletOrLaptop) 36.dp else 20.dp, vertical = 16.dp)
                )
            } else if (isInputFocused && uiState.suggestions.isNotEmpty()) {
                // Live Auto-complete Suggestions overlay when typing with virtual keyboard active
                SearchSuggestionsList(
                    suggestions = uiState.suggestions,
                    query = uiState.query,
                    onSelectSuggestion = { suggestion ->
                        dismissKeyboard()
                        viewModel.onQueryChanged(suggestion)
                        viewModel.addRecentSearch(suggestion)
                    },
                    onRefineSuggestion = { suggestion ->
                        viewModel.onQueryChanged(suggestion)
                        focusRequester.requestFocus()
                    },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = if (isTabletOrLaptop) 36.dp else 16.dp, vertical = 8.dp)
                )
            } else {
                SearchResultsList(
                    uiState = uiState,
                    onSongClick = { song ->
                        dismissKeyboard()
                        onSongClick(song)
                    },
                    onPlaylistClick = { playlist ->
                        dismissKeyboard()
                        viewModel.loadPlaylistTracks(playlist) { tracks ->
                            if (tracks.isNotEmpty()) onSongClick(tracks.first())
                        }
                    },
                    onVideoClick = { video ->
                        dismissKeyboard()
                        val song = viewModel.getVideoTrackAsSong(video)
                        onSongClick(song)
                    },
                    onPlayAllVideos = {
                        dismissKeyboard()
                        val videoSongs = viewModel.loadVideoPlaylistTracks()
                        if (videoSongs.isNotEmpty()) onSongClick(videoSongs.first())
                    },
                    onFilterClick = { filter ->
                        dismissKeyboard()
                        viewModel.onFilterSelected(filter)
                    },
                    onDismissKeyboard = dismissKeyboard,
                    isTabletOrLaptop = isTabletOrLaptop,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = if (isTabletOrLaptop) 36.dp else 16.dp)
                )
            }
        }
    }
}

@Composable
fun SearchBarHeader(
    query: String,
    onQueryChange: (String) -> Unit,
    onSearchAction: () -> Unit,
    onClearClick: () -> Unit,
    onVoiceClick: () -> Unit,
    onBackClick: () -> Unit,
    isSearching: Boolean,
    focusRequester: FocusRequester,
    onFocusChanged: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
    ) {
        if (isSearching) {
            IconButton(onClick = onBackClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White
                )
            }
        }

        // Echo Music-style Pill Search Input Capsule
        Box(
            modifier = Modifier
                .weight(1f)
                .height(50.dp)
                .clip(RoundedCornerShape(25.dp))
                .background(Color(0xFF18222C))
                .border(BorderStroke(1.dp, Color(0xFF243545)), RoundedCornerShape(25.dp))
                .padding(horizontal = 14.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search Icon",
                    tint = Color(0xFF94A3B8),
                    modifier = Modifier.size(20.dp)
                )

                Spacer(modifier = Modifier.width(8.dp))

                TextField(
                    value = query,
                    onValueChange = onQueryChange,
                    placeholder = {
                        Text(
                            text = "Search YouTube Music...",
                            color = Color(0xFF64748B),
                            fontSize = 14.sp
                        )
                    },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        cursorColor = Color(0xFF06B6D4)
                    ),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        imeAction = ImeAction.Search
                    ),
                    keyboardActions = KeyboardActions(
                        onSearch = { onSearchAction() }
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .focusRequester(focusRequester)
                        .onFocusChanged { onFocusChanged(it.isFocused) }
                )

                if (query.isNotEmpty()) {
                    IconButton(onClick = onClearClick, modifier = Modifier.size(28.dp)) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Clear",
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                IconButton(onClick = onVoiceClick, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Voice Search",
                        tint = Color(0xFF06B6D4),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        IconButton(onClick = {}) {
            Icon(
                imageVector = Icons.Default.Public,
                contentDescription = "Globe / Sources",
                tint = Color(0xFF94A3B8)
            )
        }
    }
}

@Composable
fun SearchSuggestionsList(
    suggestions: List<String>,
    query: String,
    onSelectSuggestion: (String) -> Unit,
    onRefineSuggestion: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF141E26))
            .padding(vertical = 6.dp)
    ) {
        items(suggestions) { suggestion ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelectSuggestion(suggestion) }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = Color(0xFF06B6D4),
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(14.dp))
                Text(
                    text = suggestion,
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                // Echo Music-style Diagonal Refine Arrow (↖)
                IconButton(
                    onClick = { onRefineSuggestion(suggestion) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Refine suggestion",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier
                            .size(16.dp)
                            .rotate(135f)
                    )
                }
            }
            HorizontalDivider(
                color = Color(0xFF243545).copy(alpha = 0.5f),
                thickness = 0.5.dp,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }
    }
}

@Composable
fun SearchTabsRow(
    selectedTab: SearchTab,
    onTabSelected: (SearchTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        val tabs = listOf(
            SearchTab.EXPLORE to "Explore",
            SearchTab.CHARTS to "Echo Chart",
            SearchTab.ALBUM to "Album"
        )

        tabs.forEach { (tab, title) ->
            val isSelected = selectedTab == tab
            Column(
                modifier = Modifier
                    .clickable { onTabSelected(tab) }
                    .padding(vertical = 8.dp)
            ) {
                Text(
                    text = title,
                    color = if (isSelected) Color.White else Color(0xFF94A3B8),
                    fontSize = 15.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                )
                Spacer(modifier = Modifier.height(6.dp))
                if (isSelected) {
                    Box(
                        modifier = Modifier
                            .width(36.dp)
                            .height(3.dp)
                            .background(Color(0xFF06B6D4), RoundedCornerShape(2.dp))
                    )
                }
            }
        }
    }
}

@Composable
fun SearchFilterChipsRow(
    selectedFilter: SearchFilter,
    onFilterSelected: (SearchFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        SearchFilter.values().forEach { filter ->
            val isSelected = selectedFilter == filter
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(if (isSelected) Color(0xFF243545) else Color(0xFF18222C))
                    .border(
                        BorderStroke(
                            1.dp,
                            if (isSelected) Color(0xFF06B6D4) else Color(0xFF243545)
                        ),
                        RoundedCornerShape(20.dp)
                    )
                    .clickable { onFilterSelected(filter) }
                    .padding(horizontal = 16.dp, vertical = 7.dp)
            ) {
                Text(
                    text = if (isSelected) "✓ ${filter.name.lowercase().capitalize()}" else filter.name.lowercase().capitalize(),
                    color = if (isSelected) Color.White else Color(0xFFCBD5E1),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun ExploreView(
    recentSearches: List<String>,
    onCardClick: (String) -> Unit,
    onRemoveRecent: (String) -> Unit,
    onClearAllRecent: () -> Unit,
    isTabletOrLaptop: Boolean,
    modifier: Modifier = Modifier
) {
    val forYouList = listOf("Tamil", "Carnatic classical", "Workout", "Feel good", "Commute", "1990s")
    val moodsList = listOf("Chill", "Commute", "Energize", "Feel good", "Focus", "Gaming", "Party", "Romance")

    LazyColumn(modifier = modifier) {
        // Recent Searches Section (Echo Music History chips)
        if (recentSearches.isNotEmpty()) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent searches",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Clear all",
                        color = Color(0xFF06B6D4),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .clickable { onClearAllRecent() }
                            .padding(4.dp)
                    )
                }

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 20.dp)
                ) {
                    items(recentSearches) { query ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color(0xFF18222C))
                                .border(BorderStroke(1.dp, Color(0xFF243545)), RoundedCornerShape(20.dp))
                                .clickable { onCardClick(query) }
                                .padding(start = 12.dp, end = 6.dp, top = 6.dp, bottom = 6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.History,
                                contentDescription = null,
                                tint = Color(0xFF06B6D4),
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = query,
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            IconButton(
                                onClick = { onRemoveRecent(query) },
                                modifier = Modifier.size(22.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Remove",
                                    tint = Color(0xFF94A3B8),
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // For You Section
        item {
            Text(
                text = "For you",
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        item {
            val columns = if (isTabletOrLaptop) 4 else 2
            LazyVerticalGrid(
                columns = GridCells.Fixed(columns),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .height(if (isTabletOrLaptop) 120.dp else 180.dp)
                    .fillMaxWidth()
            ) {
                items(forYouList) { item ->
                    ExplorePillCard(title = item, onClick = { onCardClick(item) })
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Moods & moments",
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        item {
            val columns = if (isTabletOrLaptop) 4 else 2
            LazyVerticalGrid(
                columns = GridCells.Fixed(columns),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .height(if (isTabletOrLaptop) 160.dp else 240.dp)
                    .fillMaxWidth()
            ) {
                items(moodsList) { item ->
                    ExplorePillCard(title = item, onClick = { onCardClick(item) })
                }
            }
        }
    }
}

@Composable
fun ExplorePillCard(title: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF18222C))
            .border(BorderStroke(1.dp, Color(0xFF243545).copy(alpha = 0.5f)), RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Text(
            text = title,
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun SearchResultsList(
    uiState: SearchUiState,
    onSongClick: (Song) -> Unit,
    onPlaylistClick: (PlaylistResult) -> Unit = {},
    onVideoClick: (VideoResult) -> Unit = {},
    onPlayAllVideos: () -> Unit = {},
    onFilterClick: (SearchFilter) -> Unit = {},
    onDismissKeyboard: () -> Unit = {},
    isTabletOrLaptop: Boolean,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    // Dismiss virtual keyboard automatically upon scrolling results
    LaunchedEffect(listState.isScrollInProgress) {
        if (listState.isScrollInProgress) {
            onDismissKeyboard()
        }
    }

    if (uiState.isLoading) {
        Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF06B6D4))
        }
        return
    }

    LazyColumn(
        state = listState,
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Top Result (Shown for ALL and SONGS filters)
        if (uiState.selectedFilter == SearchFilter.ALL || uiState.selectedFilter == SearchFilter.SONGS) {
            uiState.topResult?.let { top ->
                item {
                    Text(
                        text = "Top result",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 6.dp)
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0xFF141E26))
                            .border(BorderStroke(1.dp, Color(0xFF243545)), RoundedCornerShape(14.dp))
                            .clickable {
                                onDismissKeyboard()
                                onSongClick(top)
                            }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(top.coverUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = top.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(52.dp)
                                .clip(RoundedCornerShape(8.dp))
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = top.title,
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = top.artist,
                                color = Color(0xFF94A3B8),
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        IconButton(onClick = {}) {
                            Icon(
                                imageVector = Icons.Default.MoreVert,
                                contentDescription = "Options",
                                tint = Color(0xFF94A3B8)
                            )
                        }
                    }
                }
            }
        }

        // 2. Songs (Shown for ALL and SONGS filters)
        if ((uiState.selectedFilter == SearchFilter.ALL || uiState.selectedFilter == SearchFilter.SONGS) && uiState.songs.isNotEmpty()) {
            item {
                Text(
                    text = "Songs",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(vertical = 6.dp)
                )
            }
            items(uiState.songs) { song ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            onDismissKeyboard()
                            onSongClick(song)
                        }
                        .padding(vertical = 6.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(song.coverUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = song.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = song.title,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = song.artist,
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    IconButton(onClick = {}) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Options",
                            tint = Color(0xFF94A3B8)
                        )
                    }
                }
            }
        }

        // 3. Videos (Shown for ALL and VIDEOS filters)
        if (uiState.selectedFilter == SearchFilter.VIDEOS && uiState.videos.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No video tracks found for \"${uiState.query}\"",
                        color = Color(0xFF94A3B8),
                        fontSize = 14.sp
                    )
                }
            }
        }
        if ((uiState.selectedFilter == SearchFilter.ALL || uiState.selectedFilter == SearchFilter.VIDEOS) && uiState.videos.isNotEmpty()) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (uiState.selectedFilter == SearchFilter.VIDEOS) "Videos (${uiState.videos.size})" else "Videos",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 6.dp)
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "▶ Play Video Playlist",
                            color = Color(0xFF06B6D4),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clickable {
                                    onDismissKeyboard()
                                    onPlayAllVideos()
                                }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                        if (uiState.selectedFilter == SearchFilter.ALL && uiState.videos.size > 5) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "See all (${uiState.videos.size})",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp,
                                modifier = Modifier
                                    .clickable {
                                        onDismissKeyboard()
                                        onFilterClick(SearchFilter.VIDEOS)
                                    }
                                    .padding(horizontal = 4.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
            val displayVideos = if (uiState.selectedFilter == SearchFilter.ALL) uiState.videos.take(6) else uiState.videos
            items(displayVideos) { video ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            onDismissKeyboard()
                            onVideoClick(video)
                        }
                        .padding(vertical = 6.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.size(width = 68.dp, height = 44.dp)) {
                        AsyncImage(
                            model = video.thumbnail,
                            contentDescription = video.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(6.dp))
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.25f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayArrow,
                                contentDescription = "Play",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(2.dp)
                                .background(Color.Black.copy(alpha = 0.8f), RoundedCornerShape(3.dp))
                                .padding(horizontal = 3.dp, vertical = 1.dp)
                        ) {
                            Text(
                                text = video.duration,
                                color = Color.White,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = video.title,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "${video.channel} • Video Track",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    IconButton(onClick = {}) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Options",
                            tint = Color(0xFF94A3B8)
                        )
                    }
                }
            }
        }

        // 4. Albums (Shown for ALL and ALBUMS filters)
        if ((uiState.selectedFilter == SearchFilter.ALL || uiState.selectedFilter == SearchFilter.ALBUMS) && uiState.albums.isNotEmpty()) {
            item {
                Text(
                    text = "Albums",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(vertical = 6.dp)
                )
            }
            items(uiState.albums) { album ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onDismissKeyboard() }
                        .padding(vertical = 6.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AsyncImage(
                        model = album.cover,
                        contentDescription = album.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = album.title,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "${album.artist} • ${album.year}",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    IconButton(onClick = {}) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Options",
                            tint = Color(0xFF94A3B8)
                        )
                    }
                }
            }
        }

        // 5. Artists (Shown for ALL and ARTISTS filters)
        if ((uiState.selectedFilter == SearchFilter.ALL || uiState.selectedFilter == SearchFilter.ARTISTS) && uiState.artists.isNotEmpty()) {
            item {
                Text(
                    text = "Artists",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(vertical = 6.dp)
                )
            }
            items(uiState.artists) { artist ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onDismissKeyboard() }
                        .padding(vertical = 6.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AsyncImage(
                        model = artist.avatar,
                        contentDescription = artist.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = artist.name,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = artist.role,
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    IconButton(onClick = {}) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Options",
                            tint = Color(0xFF94A3B8)
                        )
                    }
                }
            }
        }

        // 6. Playlists (Shown for ALL and PLAYLISTS filters)
        if (uiState.selectedFilter == SearchFilter.PLAYLISTS && uiState.playlists.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No playlists found for \"${uiState.query}\"",
                        color = Color(0xFF94A3B8),
                        fontSize = 14.sp
                    )
                }
            }
        }
        if ((uiState.selectedFilter == SearchFilter.ALL || uiState.selectedFilter == SearchFilter.PLAYLISTS) && uiState.playlists.isNotEmpty()) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (uiState.selectedFilter == SearchFilter.PLAYLISTS) "Playlists (${uiState.playlists.size})" else "Playlists",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 6.dp)
                    )
                    if (uiState.selectedFilter == SearchFilter.ALL && uiState.playlists.size > 6) {
                        Text(
                            text = "See all (${uiState.playlists.size})",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            modifier = Modifier
                                .clickable {
                                    onDismissKeyboard()
                                    onFilterClick(SearchFilter.PLAYLISTS)
                                }
                                .padding(horizontal = 4.dp, vertical = 4.dp)
                        )
                    }
                }
            }
            val displayPlaylists = if (uiState.selectedFilter == SearchFilter.ALL) uiState.playlists.take(6) else uiState.playlists
            items(displayPlaylists) { playlist ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable {
                            onDismissKeyboard()
                            onPlaylistClick(playlist)
                        }
                        .padding(vertical = 6.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AsyncImage(
                        model = playlist.cover,
                        contentDescription = playlist.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = playlist.title,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "${playlist.author} • ${playlist.trackCount}",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    IconButton(onClick = {}) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Options",
                            tint = Color(0xFF94A3B8)
                        )
                    }
                }
            }
        }
    }
}
